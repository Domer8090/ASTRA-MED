/**
 * Trend watch: projects recent NOMINAL readings forward to see whether they
 * are heading for a configured caution limit. Pure functions. A projection is
 * not a prediction of health and never changes a status.
 */
import { BLOOD_GLUCOSE, BLOOD_PRESSURE, BODY_TEMPERATURE, HEART_RATE, MOOD, SLEEP, TREND_WATCH } from "../config/thresholds";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type { EffectiveDay, MeasurementValue, MetricDiagnostic, MetricId } from "../types/health";

interface Series {
  metricId: MetricId;
  /** Shown after the metric name when one metric has several series. */
  part?: string;
  unit: string;
  decimals: number;
  value: (v: MeasurementValue) => number | undefined;
  above?: number;
  below?: number;
  /** Watch only once the latest reading has left the reference band on that side. */
  watchAbove?: number;
  watchBelow?: number;
}

const num = (v: MeasurementValue) => (typeof v === "number" ? v : undefined);
const bp = (k: "systolic" | "diastolic") => (v: MeasurementValue) => (typeof v === "object" && "systolic" in v ? v[k] : undefined);

const SERIES: readonly Series[] = [
  { metricId: "heartRate", unit: "bpm", decimals: 0, value: num, above: HEART_RATE.cautionAbove, below: HEART_RATE.cautionBelow, watchAbove: HEART_RATE.reference.max, watchBelow: HEART_RATE.reference.min },
  {
    metricId: "bloodPressure",
    part: "systolic",
    unit: "mmHg",
    decimals: 0,
    value: bp("systolic"),
    above: BLOOD_PRESSURE.cautionAbove.systolic,
    below: BLOOD_PRESSURE.cautionBelow.systolic,
    watchAbove: BLOOD_PRESSURE.reference.systolic.max,
    watchBelow: BLOOD_PRESSURE.reference.systolic.min,
  },
  {
    metricId: "bloodPressure",
    part: "diastolic",
    unit: "mmHg",
    decimals: 0,
    value: bp("diastolic"),
    above: BLOOD_PRESSURE.cautionAbove.diastolic,
    below: BLOOD_PRESSURE.cautionBelow.diastolic,
    watchAbove: BLOOD_PRESSURE.reference.diastolic.max,
    watchBelow: BLOOD_PRESSURE.reference.diastolic.min,
  },
  { metricId: "bodyTemperature", unit: "°C", decimals: 1, value: num, above: BODY_TEMPERATURE.cautionAtOrAbove, below: BODY_TEMPERATURE.cautionBelow, watchAbove: BODY_TEMPERATURE.reference.max, watchBelow: BODY_TEMPERATURE.reference.min },
  { metricId: "bloodGlucose", unit: "mg/dL", decimals: 0, value: num, above: BLOOD_GLUCOSE.cautionAtOrAbove, below: BLOOD_GLUCOSE.cautionBelow, watchAbove: BLOOD_GLUCOSE.reference.max, watchBelow: BLOOD_GLUCOSE.reference.min },
  { metricId: "sleep", unit: "h", decimals: 1, value: num, below: SLEEP.cautionBelow, watchBelow: TREND_WATCH.sleepWatchBelow },
  { metricId: "mood", unit: "/ 5", decimals: 1, value: num, below: MOOD.cautionAtOrBelow, watchBelow: MOOD.reference.min },
];

export interface TrendWatch {
  metricId: MetricId;
  part?: string;
  direction: "rising" | "falling";
  /** Change per mission day from the fitted line. */
  slopePerDay: number;
  limit: number;
  unit: string;
  /** Whole days until the fitted line reaches the limit, at least 1. */
  daysToLimit: number;
  fit: number;
  text: string;
}

/** Least-squares line y = a + b·x and its R². */
export function linearFit(points: readonly [number, number][]): { a: number; b: number; r2: number } {
  const n = points.length;
  const mx = points.reduce((s, [x]) => s + x, 0) / n;
  const my = points.reduce((s, [, y]) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  const a = my - b * mx;
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { a, b, r2 };
}

function fmt(v: number, decimals: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(v);
}

/** Trend watches for indicators that are NOMINAL on `day`, soonest first. */
export function trendWatch(days: readonly EffectiveDay[], day: number, diagnostics: Record<MetricId, MetricDiagnostic>): TrendWatch[] {
  const out: TrendWatch[] = [];
  const first = Math.max(1, day - TREND_WATCH.windowDays + 1);
  for (const s of SERIES) {
    if (diagnostics[s.metricId].status !== "NOMINAL") continue;
    const points: [number, number][] = [];
    for (let d = first; d <= day; d++) {
      const r = days[d - 1]?.readings[s.metricId];
      const y = r ? s.value(r.value) : undefined;
      if (y !== undefined && Number.isFinite(y)) points.push([d, y]);
    }
    if (points.length < TREND_WATCH.minReadings) continue;
    const { a, b, r2 } = linearFit(points);
    if (r2 < TREND_WATCH.minFit || b === 0) continue;
    const now = a + b * day;
    const limit = b > 0 ? s.above : s.below;
    const gate = b > 0 ? s.watchAbove : s.watchBelow;
    if (limit === undefined || gate === undefined) continue;
    const latest = points[points.length - 1]![1];
    if (b > 0 ? latest <= gate : latest >= gate) continue;
    const gap = limit - now;
    // Already at or past the limit on the fitted line, or heading away from it.
    if (gap / b <= 0) continue;
    const daysToLimit = Math.max(1, Math.ceil(gap / b));
    if (daysToLimit > TREND_WATCH.horizonDays) continue;
    const name = METRIC_GUIDANCE[s.metricId].name;
    const label = s.part ? `${name} (${s.part})` : name;
    const direction = b > 0 ? "rising" : "falling";
    out.push({
      metricId: s.metricId,
      ...(s.part ? { part: s.part } : {}),
      direction,
      slopePerDay: b,
      limit,
      unit: s.unit,
      daysToLimit,
      fit: r2,
      text: `${label} is ${direction} about ${fmt(Math.abs(b), s.decimals + 1)} ${s.unit} a day. If the ${TREND_WATCH.windowDays}-day trend continues it would reach the caution limit of ${fmt(limit, s.decimals)} ${s.unit} in about ${daysToLimit} ${daysToLimit === 1 ? "day" : "days"}. Keep measuring at the same time and posture. This is a projection, not a diagnosis.`,
    });
  }
  return out.toSorted((x, y) => x.daysToLimit - y.daysToLimit);
}
