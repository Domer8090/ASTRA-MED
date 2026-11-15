/**
 * Auto Sync rules. Pure functions: when a device is due, how a heart-rate
 * stream becomes one stored reading, and what the simulated mission-hardware
 * bridge sends. Every value still passes the crew entry validation in
 * `core/logDraft.ts` before it is stored.
 */
import type { MetricId, MissionDayTelemetry, SyncInterval } from "../types/health";

export const SYNC_INTERVALS: readonly SyncInterval[] = [1, 5, 15, 60];

/** A heart-rate stream is summarised over this window before it is stored. */
export const HEART_RATE_WINDOW_MS = 30_000;
/** Fewer samples than this in the window is not a usable reading. */
export const HEART_RATE_MIN_SAMPLES = 5;

export function isSyncDue(lastSyncAt: string | undefined, intervalMinutes: SyncInterval, now: number): boolean {
  if (!lastSyncAt) return true;
  const last = Date.parse(lastSyncAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= intervalMinutes * 60_000;
}

export interface TimedSample {
  at: number;
  bpm: number;
  contact?: boolean;
}

/**
 * Median heart rate over the last window, ignoring samples flagged as no skin
 * contact. Median rather than mean so one dropped beat does not skew it.
 */
export function summariseHeartRate(samples: readonly TimedSample[], now: number, windowMs = HEART_RATE_WINDOW_MS): number | null {
  const usable = samples.filter((s) => now - s.at <= windowMs && s.contact !== false && s.bpm > 0).map((s) => s.bpm);
  if (usable.length < HEART_RATE_MIN_SAMPLES) return null;
  const sorted = [...usable].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(median);
}

/** Small deterministic offset in [-1, 1] so repeated bridge syncs are not identical. */
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/** Fields of a reading as text, ready for the crew entry validator. */
export interface BridgeValue {
  metricId: MetricId;
  value?: string;
  systolic?: string;
  diastolic?: string;
}

export type BridgeResult = { ok: true; value: BridgeValue } | { ok: false; reason: string };

/**
 * What the simulated bridge reports for one metric on one mission day. Values
 * come from the synthetic telemetry with a small offset. `previousCumulativeDose`
 * is the effective dose at the end of the previous day, so the dosimeter never
 * reports a decrease.
 */
export function bridgeReading(
  metricId: MetricId,
  day: MissionDayTelemetry | undefined,
  seed: string,
  previousCumulativeDose: number,
): BridgeResult {
  if (!day) return { ok: false, reason: "No telemetry for this mission day." };
  const j = (scale: number, salt: string) => jitter(`${seed}:${salt}`) * scale;
  switch (metricId) {
    case "heartRate":
      return { ok: true, value: { metricId, value: String(Math.round(day.heartRate + j(2, "hr"))) } };
    case "bloodPressure":
      return {
        ok: true,
        value: { metricId, systolic: String(Math.round(day.systolic + j(3, "sys"))), diastolic: String(Math.round(day.diastolic + j(2, "dia"))) },
      };
    case "bodyTemperature":
      return { ok: true, value: { metricId, value: (day.temperature + j(0.1, "temp")).toFixed(1) } };
    case "bloodGlucose":
      return { ok: true, value: { metricId, value: String(Math.round(day.glucose + j(3, "glu"))) } };
    case "sleep":
      return { ok: true, value: { metricId, value: day.sleepHours.toFixed(1) } };
    case "aredMinutes":
      return { ok: true, value: { metricId, value: String(Math.round(day.aredMinutes)) } };
    case "radiation":
      return { ok: true, value: { metricId, value: (previousCumulativeDose + day.dailyRadiationMsv).toFixed(2) } };
    case "pvt":
      return day.pvtMeanMs === null
        ? { ok: false, reason: "No reaction self-test is scheduled for this mission day." }
        : { ok: true, value: { metricId, value: String(Math.round(day.pvtMeanMs)) } };
    case "hydration":
      return { ok: true, value: { metricId, value: day.hydrationLiters.toFixed(1) } };
    default:
      return { ok: false, reason: "This device does not report that indicator." };
  }
}
