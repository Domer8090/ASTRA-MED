/**
 * Validation for user input and for data read back from storage or the network.
 * Nothing is trusted until it passes these checks.
 */
import {
  ARED,
  BLOOD_GLUCOSE,
  BLOOD_PRESSURE,
  BODY_TEMPERATURE,
  HEART_RATE,
  HYDRATION,
  MISSION,
  MOOD,
  PVT,
  RADIATION,
  SLEEP,
} from "../config/thresholds";
import { isScenarioId } from "../data/scenarios";
import {
  ALL_METRIC_IDS,
  type GlucoseContext,
  type MeasurementValue,
  type MetricId,
  type MissionSettings,
  type SymptomValue,
  type TaskCompletionRecord,
  type TrendTabId,
  type TrendWindow,
  type VitalMeasurement,
} from "../types/health";
import { METRIC_UNITS } from "./formatting";
import { missionDayToIso, shipTimeToMinutes } from "./dates";

export const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isFiniteNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isIsoDate = (x: unknown): x is string => typeof x === "string" && !Number.isNaN(Date.parse(x));
export const isMetricId = (x: unknown): x is MetricId => typeof x === "string" && (ALL_METRIC_IDS as readonly string[]).includes(x);
const isMissionDay = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 1 && (x as number) <= MISSION.totalDays;

const TREND_TABS: readonly TrendTabId[] = ["heartRate", "bloodPressure", "bloodGlucose", "bodyTemperature", "sleepMood", "ared", "radiation", "pvtHydration"];
const TREND_WINDOWS: readonly TrendWindow[] = [7, 30, 90, 180];

/* ---------------- user input ---------------- */

export interface MeasurementDraft {
  metricId: MetricId;
  missionDay: string;
  /** Ship time (UTC), "HH:MM". */
  shipTime: string;
  value: string;
  systolic: string;
  diastolic: string;
  symptoms: SymptomValue;
  glucoseContext: GlucoseContext;
  notes: string;
}

export interface ValidationContext {
  /** Effective cumulative dose at the end of the previous mission day. */
  previousCumulativeDose: number;
  /** Lowest later manual dosimeter reading, if any. */
  nextManualDose: number | null;
}

export type FieldErrors = Partial<Record<"missionDay" | "recordedAt" | "value" | "systolic" | "diastolic" | "notes", string>>;

export type ValidationResult =
  | { ok: true; value: MeasurementValue; missionDay: number; recordedAt: string; notes?: string; glucoseContext?: GlucoseContext }
  | { ok: false; errors: FieldErrors };

const NUMBER_PATTERN = /^-?\d+([.,]\d+)?$/;

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!NUMBER_PATTERN.test(trimmed)) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

interface NumericSpec {
  label: string;
  min: number;
  max: number;
  decimals: number;
}

const NUMERIC_SPECS: Partial<Record<MetricId, NumericSpec>> = {
  heartRate: { label: "Heart rate", min: HEART_RATE.entry.min, max: HEART_RATE.entry.max, decimals: 0 },
  bloodGlucose: { label: "Glucose", min: BLOOD_GLUCOSE.entry.min, max: BLOOD_GLUCOSE.entry.max, decimals: 0 },
  bodyTemperature: { label: "Temperature", min: BODY_TEMPERATURE.entry.min, max: BODY_TEMPERATURE.entry.max, decimals: 1 },
  sleep: { label: "Sleep", min: SLEEP.entry.min, max: SLEEP.entry.max, decimals: 1 },
  mood: { label: "Mood", min: MOOD.entry.min, max: MOOD.entry.max, decimals: 1 },
  aredMinutes: { label: "ARED minutes", min: ARED.entry.min, max: ARED.entry.max, decimals: 0 },
  radiation: { label: "Cumulative dose", min: RADIATION.entry.min, max: RADIATION.entry.max, decimals: 2 },
  pvt: { label: "Reaction time", min: PVT.entry.min, max: PVT.entry.max, decimals: 0 },
  hydration: { label: "Fluid intake", min: HYDRATION.entry.min, max: HYDRATION.entry.max, decimals: 1 },
};

export function entrySpec(metricId: MetricId): NumericSpec | undefined {
  return NUMERIC_SPECS[metricId];
}

function checkNumber(raw: string, spec: NumericSpec, unit: string): { value: number } | { error: string } {
  if (raw.trim() === "") return { error: `Enter a ${spec.label.toLowerCase()} value.` };
  const n = parseNumber(raw);
  if (n === null) return { error: `${spec.label} must be a number, for example ${spec.min + Math.round((spec.max - spec.min) / 4)}.` };
  if (n < spec.min || n > spec.max) {
    return { error: `${spec.label} must be between ${spec.min} and ${spec.max}${unit ? ` ${unit}` : ""}. Check the device reading and units.` };
  }
  const factor = 10 ** spec.decimals;
  return { value: Math.round(n * factor) / factor };
}

export function validateMeasurement(draft: MeasurementDraft, ctx: ValidationContext): ValidationResult {
  const errors: FieldErrors = {};
  const dayNum = Number(draft.missionDay);
  if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > MISSION.totalDays) {
    errors.missionDay = `Mission day must be a whole number from 1 to ${MISSION.totalDays}.`;
  }
  const minutes = shipTimeToMinutes(draft.shipTime);
  if (minutes === null) errors.recordedAt = "Enter the ship time (UTC) as HH:MM, for example 07:30.";

  const notes = draft.notes.trim();
  if (notes.length > 280) errors.notes = `Notes must be 280 characters or fewer (currently ${notes.length}).`;

  let value: MeasurementValue | undefined;
  const unit = METRIC_UNITS[draft.metricId];

  if (draft.metricId === "bloodPressure") {
    const sysSpec = { label: "Systolic", min: BLOOD_PRESSURE.entry.systolic.min, max: BLOOD_PRESSURE.entry.systolic.max, decimals: 0 };
    const diaSpec = { label: "Diastolic", min: BLOOD_PRESSURE.entry.diastolic.min, max: BLOOD_PRESSURE.entry.diastolic.max, decimals: 0 };
    const s = checkNumber(draft.systolic, sysSpec, "mmHg");
    const d = checkNumber(draft.diastolic, diaSpec, "mmHg");
    if ("error" in s) errors.systolic = s.error;
    if ("error" in d) errors.diastolic = d.error;
    if ("value" in s && "value" in d) {
      if (s.value <= d.value) errors.systolic = "Systolic (top number) must be higher than diastolic (bottom number).";
      else value = { systolic: s.value, diastolic: d.value };
    }
  } else if (draft.metricId === "symptoms") {
    value = { ...draft.symptoms };
  } else {
    const spec = NUMERIC_SPECS[draft.metricId];
    if (spec) {
      const r = checkNumber(draft.value, spec, unit);
      if ("error" in r) errors.value = r.error;
      else value = r.value;
    }
    if (draft.metricId === "radiation" && typeof value === "number") {
      if (value + 1e-9 < ctx.previousCumulativeDose) {
        errors.value = `A cumulative dosimeter reading cannot be lower than the previous day's ${ctx.previousCumulativeDose.toFixed(2)} mSv. Check the device and the mission day.`;
        value = undefined;
      } else if (ctx.nextManualDose !== null && value > ctx.nextManualDose + 1e-9) {
        errors.value = `This reading is higher than a later logged reading (${ctx.nextManualDose.toFixed(2)} mSv). Check the mission day.`;
        value = undefined;
      }
    }
  }

  if (Object.keys(errors).length > 0 || value === undefined) {
    return { ok: false, errors: Object.keys(errors).length ? errors : { value: "Enter a valid value." } };
  }
  return {
    ok: true,
    value,
    missionDay: dayNum,
    recordedAt: missionDayToIso(dayNum, minutes ?? 0),
    ...(notes ? { notes } : {}),
    ...(draft.metricId === "bloodGlucose" ? { glucoseContext: draft.glucoseContext } : {}),
  };
}

/* ---------------- persisted data ---------------- */

function isSymptoms(x: unknown): x is SymptomValue {
  return (
    isRecord(x) &&
    typeof x.blurredVision === "boolean" &&
    typeof x.headache === "boolean" &&
    typeof x.eyePressure === "boolean" &&
    typeof x.otherSymptom === "boolean"
  );
}

function isValueFor(metricId: MetricId, v: unknown): v is MeasurementValue {
  if (metricId === "bloodPressure") return isRecord(v) && isFiniteNumber(v.systolic) && isFiniteNumber(v.diastolic);
  if (metricId === "symptoms") return isSymptoms(v);
  return isFiniteNumber(v);
}

export function sanitizeMeasurement(x: unknown): VitalMeasurement | null {
  if (!isRecord(x)) return null;
  if (typeof x.id !== "string" || !isMetricId(x.metricId) || !isMissionDay(x.missionDay) || !isIsoDate(x.recordedAt)) return null;
  if (!isValueFor(x.metricId, x.value)) return null;
  const notes = typeof x.notes === "string" && x.notes.length <= 280 ? x.notes : undefined;
  // Older Tuesday voice logs were persisted as MANUAL. Identify only the
  // exact legacy marker written by the old voice path; other crew entries stay MANUAL.
  const legacyTuesday = x.source === "manual" && notes === "Voice telemetry via Tuesday AI";
  if (x.source !== "manual" && x.source !== "tuesday" && x.source !== "import" && x.source !== "device" && x.source !== "device-sim") return null;
  const out: VitalMeasurement = {
    id: x.id,
    metricId: x.metricId,
    value: x.value,
    unit: typeof x.unit === "string" ? x.unit : METRIC_UNITS[x.metricId],
    missionDay: x.missionDay,
    recordedAt: x.recordedAt,
    source: legacyTuesday ? "tuesday" : x.source,
  };
  if (notes) out.notes = notes;
  if (isIsoDate(x.enteredAt)) out.enteredAt = x.enteredAt;
  if (x.glucoseContext === "fasting" || x.glucoseContext === "post-meal" || x.glucoseContext === "other") out.glucoseContext = x.glucoseContext;
  return out;
}

export function sanitizeMeasurements(x: unknown): VitalMeasurement[] | null {
  if (!Array.isArray(x)) return null;
  return x.map(sanitizeMeasurement).filter((m): m is VitalMeasurement => m !== null).slice(-5000);
}

export function sanitizeCompletions(x: unknown): Record<number, Record<string, TaskCompletionRecord>> | null {
  if (!isRecord(x)) return null;
  const out: Record<number, Record<string, TaskCompletionRecord>> = {};
  for (const [dayKey, tasks] of Object.entries(x)) {
    const day = Number(dayKey);
    if (!isMissionDay(day) || !isRecord(tasks)) continue;
    for (const [taskId, rec] of Object.entries(tasks)) {
      if (!isRecord(rec) || typeof rec.completed !== "boolean") continue;
      const via = rec.via === "checkbox" || rec.via === "measurement" ? rec.via : "checkbox";
      const record: TaskCompletionRecord = { taskId, missionDay: day, completed: rec.completed, via };
      if (rec.completed && isIsoDate(rec.completedAt)) record.completedAt = rec.completedAt;
      (out[day] ??= {})[taskId] = record;
    }
  }
  return out;
}

export function sanitizeFollowUps(x: unknown): Record<number, Record<string, string>> | null {
  if (!isRecord(x)) return null;
  const out: Record<number, Record<string, string>> = {};
  for (const [dayKey, items] of Object.entries(x)) {
    const day = Number(dayKey);
    if (!isMissionDay(day) || !isRecord(items)) continue;
    for (const [id, at] of Object.entries(items)) {
      if (isIsoDate(at)) (out[day] ??= {})[id] = at;
    }
  }
  return out;
}

/** PVT band: both ends inside the slider bounds and at least 10 ms apart, else the defaults. */
function pvtBand(lo: unknown, hi: unknown, defaults: MissionSettings): { pvtMinMs: number; pvtMaxMs: number } {
  const ok = (v: unknown): v is number => isFiniteNumber(v) && v >= PVT.sliderBounds.min && v <= PVT.sliderBounds.max;
  if (ok(lo) && ok(hi) && hi - lo >= 10) return { pvtMinMs: Math.round(lo), pvtMaxMs: Math.round(hi) };
  return { pvtMinMs: defaults.pvtMinMs, pvtMaxMs: defaults.pvtMaxMs };
}

export function sanitizeSettings(x: unknown, defaults: MissionSettings): MissionSettings | null {
  if (!isRecord(x)) return null;
  return {
    scenarioId: isScenarioId(x.scenarioId) ? x.scenarioId : defaults.scenarioId,
    selectedDay: isMissionDay(x.selectedDay) ? x.selectedDay : defaults.selectedDay,
    aredTargetMinutes:
      Number.isInteger(x.aredTargetMinutes) && (x.aredTargetMinutes as number) >= 10 && (x.aredTargetMinutes as number) <= 180
        ? (x.aredTargetMinutes as number)
        : defaults.aredTargetMinutes,
    hydrationTargetLiters:
      isFiniteNumber(x.hydrationTargetLiters) && x.hydrationTargetLiters >= 0.5 && x.hydrationTargetLiters <= 5
        ? Math.round(x.hydrationTargetLiters * 10) / 10
        : defaults.hydrationTargetLiters,
    ...pvtBand(x.pvtMinMs, x.pvtMaxMs, defaults),
    radiationLimitMsv:
      isFiniteNumber(x.radiationLimitMsv) && x.radiationLimitMsv >= RADIATION.limit.min && x.radiationLimitMsv <= RADIATION.limit.max
        ? Math.round(x.radiationLimitMsv)
        : defaults.radiationLimitMsv,
    trendWindow: TREND_WINDOWS.includes(x.trendWindow as TrendWindow) ? (x.trendWindow as TrendWindow) : defaults.trendWindow,
    trendTab: TREND_TABS.includes(x.trendTab as TrendTabId) ? (x.trendTab as TrendTabId) : defaults.trendTab,
  };
}
