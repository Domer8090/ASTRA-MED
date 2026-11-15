/**
 * Gauge geometry for instrument tiles. Built from the configured thresholds so
 * presentation components never compare values with thresholds themselves.
 */
import { ARED, BLOOD_GLUCOSE, BLOOD_PRESSURE, BODY_TEMPERATURE, HEART_RATE, MOOD, PVT, RADIATION, SLEEP } from "../config/thresholds";
import type { MetricId } from "../types/health";

export type ZoneKind = "reference" | "nominal" | "caution" | "critical";

export interface GaugeZone {
  from: number;
  to: number;
  kind: ZoneKind;
}

export interface GaugeTrack {
  label?: string;
  min: number;
  max: number;
  zones: GaugeZone[];
  reference: [number, number] | null;
}

/** Slider-adjustable limits; omitted values use the configured defaults. */
export interface GaugeLimits {
  radiationLimitMsv?: number;
  pvtMinMs?: number;
  pvtMaxMs?: number;
}

export function gaugeTracks(metricId: MetricId, aredTarget: number, hydrationTarget: number, limits: GaugeLimits = {}): GaugeTrack[] | null {
  switch (metricId) {
    case "radiation": {
      const limit = limits.radiationLimitMsv ?? RADIATION.limit.default;
      const top = Math.round(limit * 1.15);
      return [
        {
          min: 0,
          max: top,
          reference: null,
          zones: [
            { from: Math.round(limit * RADIATION.cautionFraction), to: limit, kind: "caution" },
            { from: limit, to: top, kind: "critical" },
          ],
        },
      ];
    }
    case "pvt": {
      const lo = limits.pvtMinMs ?? PVT.range.min;
      const hi = limits.pvtMaxMs ?? PVT.range.max;
      const min = Math.max(0, lo - 50);
      const max = hi + 100;
      return [
        {
          min,
          max,
          reference: null,
          zones: [
            { from: min, to: lo, kind: "caution" },
            { from: hi, to: max, kind: "caution" },
          ],
        },
      ];
    }
    case "heartRate":
      return [
        {
          min: 35,
          max: 120,
          reference: [HEART_RATE.reference.min, HEART_RATE.reference.max],
          zones: [
            { from: 35, to: HEART_RATE.cautionBelow, kind: "caution" },
            { from: HEART_RATE.cautionAbove, to: HEART_RATE.criticalAbove, kind: "caution" },
            { from: HEART_RATE.criticalAbove, to: 120, kind: "critical" },
          ],
        },
      ];
    case "bloodPressure": {
      const b = BLOOD_PRESSURE;
      return [
        {
          label: "SYS",
          min: 75,
          max: 165,
          reference: [b.reference.systolic.min, b.reference.systolic.max],
          zones: [
            { from: 75, to: b.criticalBelow.systolic, kind: "critical" },
            { from: b.criticalBelow.systolic, to: b.cautionBelow.systolic, kind: "caution" },
            { from: b.cautionAbove.systolic, to: b.criticalAbove.systolic, kind: "caution" },
            { from: b.criticalAbove.systolic, to: 165, kind: "critical" },
          ],
        },
        {
          label: "DIA",
          min: 45,
          max: 105,
          reference: [b.reference.diastolic.min, b.reference.diastolic.max],
          zones: [
            { from: 45, to: b.criticalBelow.diastolic, kind: "critical" },
            { from: b.criticalBelow.diastolic, to: b.cautionBelow.diastolic, kind: "caution" },
            { from: b.cautionAbove.diastolic, to: b.criticalAbove.diastolic, kind: "caution" },
            { from: b.criticalAbove.diastolic, to: 105, kind: "critical" },
          ],
        },
      ];
    }
    case "bloodGlucose":
      return [
        {
          min: 45,
          max: 160,
          reference: [BLOOD_GLUCOSE.reference.min, BLOOD_GLUCOSE.reference.max],
          zones: [
            { from: 45, to: BLOOD_GLUCOSE.criticalBelow, kind: "critical" },
            { from: BLOOD_GLUCOSE.criticalBelow, to: BLOOD_GLUCOSE.cautionBelow, kind: "caution" },
            { from: BLOOD_GLUCOSE.cautionAtOrAbove, to: BLOOD_GLUCOSE.criticalAtOrAbove, kind: "caution" },
            { from: BLOOD_GLUCOSE.criticalAtOrAbove, to: 160, kind: "critical" },
          ],
        },
      ];
    case "bodyTemperature":
      return [
        {
          min: 35.5,
          max: 39,
          reference: [BODY_TEMPERATURE.reference.min, BODY_TEMPERATURE.reference.max],
          zones: [
            { from: 35.5, to: BODY_TEMPERATURE.cautionBelow, kind: "caution" },
            { from: BODY_TEMPERATURE.cautionAtOrAbove, to: BODY_TEMPERATURE.criticalAtOrAbove, kind: "caution" },
            { from: BODY_TEMPERATURE.criticalAtOrAbove, to: 39, kind: "critical" },
          ],
        },
      ];
    case "sleep":
      return [
        {
          min: 3,
          max: 9,
          reference: [SLEEP.reference.min, SLEEP.reference.max],
          zones: [
            { from: 3, to: SLEEP.criticalBelow, kind: "critical" },
            { from: SLEEP.criticalBelow, to: SLEEP.cautionBelow, kind: "caution" },
          ],
        },
      ];
    case "mood":
      return [
        {
          min: 1,
          max: 5,
          reference: [MOOD.reference.min, MOOD.reference.max],
          zones: [
            { from: 1, to: MOOD.criticalAtOrBelow, kind: "critical" },
            { from: MOOD.criticalAtOrBelow, to: MOOD.cautionAtOrBelow, kind: "caution" },
          ],
        },
      ];
    case "aredMinutes":
      return [
        {
          min: 0,
          max: Math.max(90, aredTarget + 30),
          reference: [aredTarget, Math.max(90, aredTarget + 30)],
          zones: [
            { from: 0, to: aredTarget * ARED.missedFraction, kind: "critical" },
            { from: aredTarget * ARED.missedFraction, to: aredTarget, kind: "caution" },
          ],
        },
      ];
    case "hydration":
      return [
        {
          min: 0,
          max: 4,
          reference: [hydrationTarget, 4],
          zones: [{ from: 0, to: hydrationTarget, kind: "caution" }],
        },
      ];
    default:
      return null;
  }
}

/**
 * The in-range band of a track: the stretch no caution or critical zone covers,
 * i.e. between the configured caution limits. `null` on a side means no limit
 * there ("6 or more", "up to 100"). This is the range a crew member is shown;
 * the narrower `reference` band is a context marker, not the limit.
 */
export function nominalBand(t: GaugeTrack): { lo: number | null; hi: number | null } {
  const zones = [...t.zones].sort((a, b) => a.from - b.from);
  let cursor = t.min;
  for (const z of zones) {
    if (z.from > cursor + 1e-9) break;
    cursor = Math.max(cursor, z.to);
  }
  const next = zones.find((z) => z.from > cursor + 1e-9);
  const lo = cursor > t.min + 1e-9 ? cursor : null;
  const hi = next ? next.from : null;
  return { lo, hi };
}

const fmtRange = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** The in-range band in words: "50–100", "6 or more", "up to 100". */
export function bandText(t: GaugeTrack): string {
  const { lo, hi } = nominalBand(t);
  if (lo !== null && hi !== null) return `${fmtRange(lo)}–${fmtRange(hi)}`;
  if (lo !== null) return `${fmtRange(lo)} or more`;
  if (hi !== null) return `up to ${fmtRange(hi)}`;
  return "any";
}

/** "50–100 bpm" (or "120–135 / 80–85 mmHg") for one-line rows and screen readers. */
export function rangeText(tracks: GaugeTrack[] | null, unit: string): string | null {
  if (!tracks?.length) return null;
  return tracks.map(bandText).join(" / ") + (unit ? ` ${unit}` : "");
}
