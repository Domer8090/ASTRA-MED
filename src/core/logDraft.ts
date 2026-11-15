/**
 * Validates one reading with the crew console's entry rules and, when valid,
 * logs it to a mission store. Shared by the core bundle (iPad, CLI) and the
 * desktop app's "Import readings" command, so every host accepts and rejects
 * the same values.
 */
import { getCountermeasureTasks } from "../data/countermeasureTasks";
import { tasksForDay } from "../engine/readinessEngine";
import { buildEffectiveDays, cumulativeDoseAt } from "../services/telemetryService";
import type { MissionStore } from "../state/missionStore";
import type { GlucoseContext, MetricId, SymptomValue } from "../types/health";
import { isMetricId, isRecord, validateMeasurement, type FieldErrors } from "../utils/validation";

export interface LogDraft {
  metricId: MetricId;
  missionDay: number;
  /** Ship time (UTC), "HH:MM". */
  shipTime: string;
  value?: string;
  systolic?: string;
  diastolic?: string;
  symptoms?: SymptomValue;
  glucoseContext?: GlucoseContext;
  notes?: string;
  /** Defaults to a crew entry. Auto Sync passes the device source. */
  source?: "manual" | "device" | "device-sim";
}

export type LogDraftResult =
  | { ok: true; persisted: boolean; message: string; completedTaskTitle: string | null }
  | { ok: false; errors: FieldErrors };

const NO_SYMPTOMS: SymptomValue = { blurredVision: false, headache: false, eyePressure: false, otherSymptom: false };

const text = (x: unknown): string => (typeof x === "string" ? x : typeof x === "number" && Number.isFinite(x) ? String(x) : "");

/** Reads an untrusted row (from a file, IPC or a bridge) into a draft. */
export function toLogDraft(raw: unknown): LogDraft | null {
  if (!isRecord(raw) || !isMetricId(raw.metricId)) return null;
  const symptoms = isRecord(raw.symptoms)
    ? {
        blurredVision: raw.symptoms.blurredVision === true,
        headache: raw.symptoms.headache === true,
        eyePressure: raw.symptoms.eyePressure === true,
        otherSymptom: raw.symptoms.otherSymptom === true,
      }
    : undefined;
  const ctx = raw.glucoseContext;
  return {
    metricId: raw.metricId,
    missionDay: Number(raw.missionDay),
    shipTime: text(raw.shipTime),
    value: text(raw.value),
    systolic: text(raw.systolic),
    diastolic: text(raw.diastolic),
    ...(symptoms ? { symptoms } : {}),
    ...(ctx === "fasting" || ctx === "post-meal" || ctx === "other" ? { glucoseContext: ctx } : {}),
    notes: text(raw.notes),
  };
}

export function logDraft(store: MissionStore, draft: LogDraft): LogDraftResult {
  if (!isMetricId(draft.metricId)) return { ok: false, errors: { value: "Unknown indicator." } };
  const { settings, measurements, completions } = store.getState();
  const days = buildEffectiveDays(settings.scenarioId, measurements);
  const laterDoses = measurements
    .filter((x) => x.metricId === "radiation" && x.source !== "synthetic" && x.missionDay > draft.missionDay && typeof x.value === "number")
    .map((x) => x.value as number);
  const result = validateMeasurement(
    {
      metricId: draft.metricId,
      missionDay: String(draft.missionDay),
      shipTime: draft.shipTime,
      value: draft.value ?? "",
      systolic: draft.systolic ?? "",
      diastolic: draft.diastolic ?? "",
      symptoms: draft.symptoms ?? NO_SYMPTOMS,
      glucoseContext: draft.glucoseContext ?? "fasting",
      notes: draft.notes ?? "",
    },
    { previousCumulativeDose: cumulativeDoseAt(days, draft.missionDay - 1), nextManualDose: laterDoses.length ? Math.min(...laterDoses) : null },
  );
  if (!result.ok) return { ok: false, errors: result.errors };
  const tasks = getCountermeasureTasks(settings.aredTargetMinutes, settings.hydrationTargetLiters);
  const linked = tasksForDay(
    { scenarioId: settings.scenarioId, tasks, days, completions, aredTargetMinutes: settings.aredTargetMinutes, hydrationTargetLiters: settings.hydrationTargetLiters },
    result.missionDay,
  ).find((t) => t.linkedMetric === draft.metricId);
  const saved = store.logMeasurement({
    linkedTaskComplete: Boolean(linked?.completed),
    metricId: draft.metricId,
    value: result.value,
    missionDay: result.missionDay,
    recordedAt: result.recordedAt,
    ...(draft.source ? { source: draft.source } : {}),
    ...(result.notes ? { notes: result.notes } : {}),
    ...(result.glucoseContext ? { glucoseContext: result.glucoseContext } : {}),
  });
  return { ok: true, persisted: saved.persisted, message: saved.message, completedTaskTitle: saved.completedTaskTitle ?? null };
}
