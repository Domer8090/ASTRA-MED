/**
 * Merges bundled synthetic telemetry with locally logged manual measurements.
 * Manual entries never overwrite history: every entry is kept in the log, and
 * the latest entry for a metric on a day becomes that day's effective reading.
 */
import { MISSION } from "../config/thresholds";
import { getMissionTelemetry } from "../data/missionTelemetry";
import type {
  EffectiveDay,
  MetricId,
  MetricReading,
  MissionDayTelemetry,
  ScenarioId,
  VitalMeasurement,
} from "../types/health";
import { missionDayToIso } from "../utils/dates";
import { roundTo } from "../utils/prng";

function syntheticReadings(t: MissionDayTelemetry): Partial<Record<MetricId, MetricReading>> {
  const day = t.missionDay;
  const at = (minute: number) => missionDayToIso(day, minute);
  const vitals = at(t.vitalsMinuteOfDay);
  const base = { missionDay: day, source: "synthetic" as const };
  const readings: Partial<Record<MetricId, MetricReading>> = {
    heartRate: { ...base, metricId: "heartRate", value: t.heartRate, recordedAt: vitals },
    bloodPressure: {
      ...base,
      metricId: "bloodPressure",
      value: { systolic: t.systolic, diastolic: t.diastolic },
      recordedAt: vitals,
    },
    bloodGlucose: {
      ...base,
      metricId: "bloodGlucose",
      value: t.glucose,
      recordedAt: at(t.vitalsMinuteOfDay + (day === 63 ? 330 : 8)),
      glucoseContext: day === 63 ? "post-meal" : "fasting",
      ...(day === 63 ? { notes: "Synthetic reading taken after a meal." } : {}),
    },
    bodyTemperature: { ...base, metricId: "bodyTemperature", value: t.temperature, recordedAt: vitals },
    sleep: { ...base, metricId: "sleep", value: t.sleepHours, recordedAt: at(t.vitalsMinuteOfDay - 20) },
    mood: { ...base, metricId: "mood", value: t.moodScore, recordedAt: at(20 * 60 + 30) },
    aredMinutes: { ...base, metricId: "aredMinutes", value: t.aredMinutes, recordedAt: at(14 * 60 + 15) },
    radiation: {
      ...base,
      metricId: "radiation",
      value: t.cumulativeRadiationMsv,
      recordedAt: at(23 * 60 + 50),
    },
    hydration: { ...base, metricId: "hydration", value: t.hydrationLiters, recordedAt: at(21 * 60 + 10) },
  };
  if (t.pvtMeanMs !== null) {
    readings.pvt = { ...base, metricId: "pvt", value: t.pvtMeanMs, recordedAt: at(11 * 60 + 5) };
  }
  if (t.symptoms !== null) {
    readings.symptoms = { ...base, metricId: "symptoms", value: t.symptoms, recordedAt: at(t.vitalsMinuteOfDay + 15) };
  }
  return readings;
}

function toReading(m: VitalMeasurement): MetricReading {
  return {
    metricId: m.metricId,
    missionDay: m.missionDay,
    value: m.value,
    recordedAt: m.recordedAt,
    source: m.source,
    measurementId: m.id,
    ...(m.notes ? { notes: m.notes } : {}),
    ...(m.glucoseContext ? { glucoseContext: m.glucoseContext } : {}),
  };
}

/** Latest manual measurement per (day, metric). */
function latestManualByDay(measurements: readonly VitalMeasurement[]): Map<string, VitalMeasurement> {
  const map = new Map<string, VitalMeasurement>();
  for (const m of measurements) {
    const key = `${m.missionDay}:${m.metricId}`;
    const prev = map.get(key);
    if (!prev || Date.parse(m.recordedAt) >= Date.parse(prev.recordedAt)) map.set(key, m);
  }
  return map;
}

/**
 * Effective readings for all mission days.
 * Radiation: a manual dosimeter reading rebases the cumulative series from that
 * day forward, so the curve stays continuous and never decreases.
 */
export function buildEffectiveDays(
  scenarioId: ScenarioId,
  measurements: readonly VitalMeasurement[],
): EffectiveDay[] {
  const telemetry = getMissionTelemetry(scenarioId);
  const manual = latestManualByDay(measurements);
  const days: EffectiveDay[] = [];
  let offset = 0;
  let prevCumulative = 0;

  for (const t of telemetry) {
    const readings = syntheticReadings(t);
    for (const metricId of Object.keys(readings) as MetricId[]) {
      const m = manual.get(`${t.missionDay}:${metricId}`);
      if (m && metricId !== "radiation") readings[metricId] = toReading(m);
    }
    // Manual-only metrics on days without a synthetic reading (pvt, symptoms).
    for (const metricId of ["pvt", "symptoms"] as const) {
      const m = manual.get(`${t.missionDay}:${metricId}`);
      if (m) readings[metricId] = toReading(m);
    }

    const manualDose = manual.get(`${t.missionDay}:radiation`);
    let cumulative = roundTo(t.cumulativeRadiationMsv + offset, 0.01);
    if (manualDose && typeof manualDose.value === "number") {
      offset = manualDose.value - t.cumulativeRadiationMsv;
      cumulative = manualDose.value;
      readings.radiation = toReading(manualDose);
    }
    cumulative = Math.max(cumulative, prevCumulative);
    if (!manualDose && readings.radiation) {
      readings.radiation = { ...readings.radiation, value: cumulative };
    }
    const daily = roundTo(cumulative - prevCumulative, 0.01);
    prevCumulative = cumulative;

    days.push({ missionDay: t.missionDay, readings, dailyRadiationMsv: daily });
  }
  return days;
}

/** Effective cumulative dose at the end of a day (0 before day 1). */
export function cumulativeDoseAt(days: readonly EffectiveDay[], day: number): number {
  if (day < 1) return 0;
  const r = days[Math.min(day, MISSION.totalDays) - 1]?.readings.radiation;
  return r && typeof r.value === "number" ? r.value : 0;
}

/** Every manual measurement for a metric, sorted by mission day then time. */
export function manualHistory(measurements: readonly VitalMeasurement[], metricId?: MetricId): VitalMeasurement[] {
  return measurements
    .filter((m) => (metricId ? m.metricId === metricId : true))
    .toSorted((a, b) => a.missionDay - b.missionDay || Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}
