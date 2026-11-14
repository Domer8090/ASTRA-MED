import type { BloodPressureValue, MeasurementValue, MetricId, SymptomValue } from "../types/health";

export function isBloodPressure(v: MeasurementValue): v is BloodPressureValue {
  return typeof v === "object" && v !== null && "systolic" in v && "diastolic" in v;
}

export function isSymptomValue(v: MeasurementValue): v is SymptomValue {
  return typeof v === "object" && v !== null && "blurredVision" in v;
}

export const METRIC_UNITS: Record<MetricId, string> = {
  heartRate: "bpm",
  bloodPressure: "mmHg",
  bloodGlucose: "mg/dL",
  bodyTemperature: "°C",
  sleep: "h",
  mood: "/ 5",
  aredMinutes: "min",
  radiation: "mSv",
  pvt: "ms",
  hydration: "L",
  symptoms: "",
};

const DECIMALS: Record<MetricId, number> = {
  heartRate: 0,
  bloodPressure: 0,
  bloodGlucose: 0,
  bodyTemperature: 1,
  sleep: 1,
  mood: 1,
  aredMinutes: 0,
  radiation: 1,
  pvt: 0,
  hydration: 1,
  symptoms: 0,
};

const numberFormats = new Map<number, Intl.NumberFormat>();
function nf(decimals: number): Intl.NumberFormat {
  let f = numberFormats.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    numberFormats.set(decimals, f);
  }
  return f;
}

export function formatNumber(value: number, decimals: number): string {
  return nf(decimals).format(value);
}

const SYMPTOM_LABELS: Record<keyof SymptomValue, string> = {
  blurredVision: "blurred vision",
  eyePressure: "eye pressure",
  headache: "headache",
  otherSymptom: "other symptom",
};

export function listSymptoms(v: SymptomValue): string[] {
  return (Object.keys(SYMPTOM_LABELS) as (keyof SymptomValue)[]).filter((k) => v[k]).map((k) => SYMPTOM_LABELS[k]);
}

/** Value text without unit. */
export function formatMetricValue(metricId: MetricId, value: MeasurementValue): string {
  if (isBloodPressure(value)) return `${Math.round(value.systolic)}/${Math.round(value.diastolic)}`;
  if (isSymptomValue(value)) {
    const s = listSymptoms(value);
    return s.length === 0 ? "None reported" : capitalize(s.join(", "));
  }
  return formatNumber(value, DECIMALS[metricId]);
}

export function formatWithUnit(metricId: MetricId, value: MeasurementValue): string {
  const unit = METRIC_UNITS[metricId];
  const text = formatMetricValue(metricId, value);
  if (!unit) return text;
  return unit.startsWith("/") ? `${text} ${unit}` : `${text}\u00a0${unit}`;
}

export function formatDose(msv: number, decimals = 2): string {
  return `${formatNumber(msv, decimals)}\u00a0mSv`;
}

function signed(n: number, decimals: number): string {
  if (Math.abs(n) < 10 ** -decimals / 2) return "±0";
  const s = formatNumber(Math.abs(n), decimals);
  return n > 0 ? `+${s}` : `−${s}`;
}

/** Change from the previous reading, e.g. "+3", "−2/+1". Null when not comparable. */
export function formatDelta(metricId: MetricId, current: MeasurementValue, previous: MeasurementValue | undefined): string | null {
  if (previous === undefined) return null;
  if (isBloodPressure(current) && isBloodPressure(previous)) {
    return `${signed(current.systolic - previous.systolic, 0)}/${signed(current.diastolic - previous.diastolic, 0)}`;
  }
  if (typeof current === "number" && typeof previous === "number") {
    return signed(current - previous, DECIMALS[metricId]);
  }
  return null;
}

export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
