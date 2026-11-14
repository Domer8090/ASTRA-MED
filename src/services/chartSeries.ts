/** Builds chart-ready rows from effective telemetry. Pure; no thresholds. */
import type { EffectiveDay, HealthStatus, MetricId, TrendWindow } from "../types/health";
import { isBloodPressure } from "../utils/formatting";

export interface ChartRow {
  day: number;
  [key: string]: number | null | string;
}

export function windowRange(day: number, window: TrendWindow, total: number): [number, number] {
  if (window >= total) return [1, total];
  const end = Math.max(day, window);
  return [Math.max(1, end - window + 1), Math.min(total, end)];
}

function numeric(days: readonly EffectiveDay[], d: number, metric: MetricId): number | null {
  const r = days[d - 1]?.readings[metric];
  return r && typeof r.value === "number" ? r.value : null;
}

function isManual(days: readonly EffectiveDay[], d: number, metric: MetricId): boolean {
  const r = days[d - 1]?.readings[metric];
  return Boolean(r && r.source !== "synthetic");
}

/** Rows for the visible window. Days after the selected day have no values (replay stops at "today"). */
export function buildChartRows(days: readonly EffectiveDay[], selectedDay: number, range: [number, number]): ChartRow[] {
  const rows: ChartRow[] = [];
  for (let d = range[0]; d <= range[1]; d++) {
    const past = d <= selectedDay;
    const bp = days[d - 1]?.readings.bloodPressure;
    const bpv = bp && isBloodPressure(bp.value) ? bp.value : null;
    const get = (m: MetricId) => (past ? numeric(days, d, m) : null);
    const manual = (m: MetricId, v: number | null) => (past && isManual(days, d, m) ? v : null);
    const hr = get("heartRate");
    const glucose = get("bloodGlucose");
    const temp = get("bodyTemperature");
    const sleep = get("sleep");
    const mood = get("mood");
    const ared = get("aredMinutes");
    const cumulative = get("radiation");
    const pvt = get("pvt");
    const hydration = get("hydration");
    const daily = past ? (days[d - 1]?.dailyRadiationMsv ?? null) : null;
    rows.push({
      day: d,
      heartRate: hr,
      heartRateManual: manual("heartRate", hr),
      systolic: past && bpv ? bpv.systolic : null,
      diastolic: past && bpv ? bpv.diastolic : null,
      systolicManual: past && bpv && isManual(days, d, "bloodPressure") ? bpv.systolic : null,
      diastolicManual: past && bpv && isManual(days, d, "bloodPressure") ? bpv.diastolic : null,
      bloodGlucose: glucose,
      bloodGlucoseManual: manual("bloodGlucose", glucose),
      bodyTemperature: temp,
      bodyTemperatureManual: manual("bodyTemperature", temp),
      sleep,
      sleepManual: manual("sleep", sleep),
      mood,
      moodManual: manual("mood", mood),
      aredMinutes: ared,
      aredManual: manual("aredMinutes", ared),
      dailyDose: daily,
      cumulativeDose: cumulative,
      cumulativeManual: manual("radiation", cumulative),
      pvt,
      pvtManual: manual("pvt", pvt),
      hydration,
      hydrationManual: manual("hydration", hydration),
    });
  }
  return rows;
}

export interface StatusPeriod {
  start: number;
  end: number;
  status: Exclude<HealthStatus, "NOMINAL">;
}

/** Contiguous non-nominal periods for annotations, clipped to the range and the selected day. */
export function statusPeriods(statuses: readonly HealthStatus[], range: [number, number], selectedDay: number): StatusPeriod[] {
  const out: StatusPeriod[] = [];
  const last = Math.min(range[1], selectedDay);
  let cur: StatusPeriod | null = null;
  for (let d = range[0]; d <= last; d++) {
    const s = statuses[d - 1] ?? "NOMINAL";
    if (s === "NOMINAL") {
      if (cur) out.push(cur);
      cur = null;
    } else if (cur && cur.status === s) {
      cur.end = d;
    } else {
      if (cur) out.push(cur);
      cur = { start: d, end: d, status: s };
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Last n numeric values up to and including `day` for sparklines. */
export function sparkValues(days: readonly EffectiveDay[], metric: MetricId, day: number, n = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let d = Math.max(1, day - n + 1); d <= day; d++) {
    const r = days[d - 1]?.readings[metric];
    if (!r) out.push(null);
    else if (typeof r.value === "number") out.push(metric === "radiation" ? (days[d - 1]?.dailyRadiationMsv ?? null) : r.value);
    else if (isBloodPressure(r.value)) out.push(r.value.systolic);
    else out.push(null);
  }
  return out;
}

export interface EventAnnotation {
  id: string;
  start: number;
  end: number;
  label: string;
  kind: "health" | "environment" | "operations" | "manual";
}

/** Scenario events and manual entries inside the window, up to the selected day. */
export function eventAnnotations(
  events: readonly { id: string; title: string; startDay: number; endDay: number; kind: "health" | "environment" | "operations"; metrics: readonly MetricId[] }[],
  range: [number, number],
  selectedDay: number,
  metrics?: readonly MetricId[],
): EventAnnotation[] {
  const last = Math.min(range[1], selectedDay);
  return events
    .filter((e) => e.startDay <= last && e.endDay >= range[0])
    .filter((e) => !metrics || e.metrics.some((m) => metrics.includes(m)))
    .map((e) => ({ id: e.id, start: Math.max(e.startDay, range[0]), end: Math.min(e.endDay, last), label: e.title, kind: e.kind }));
}
