import { BLOOD_GLUCOSE, BLOOD_PRESSURE, BODY_TEMPERATURE, HEART_RATE, SLEEP } from "../../config/thresholds";
import { COLORS } from "../../config/theme";
import type { MetricId, TrendTabId } from "../../types/health";

export interface SeriesDef {
  key: string;
  name: string;
  unit: string;
  color: string;
  kind: "line" | "bar" | "area";
  axis?: "left" | "right";
  decimals: number;
  manualKey?: string;
}

export interface TabDef {
  id: TrendTabId;
  label: string;
  metrics: MetricId[];
  series: SeriesDef[];
  bands: { y1: number; y2: number; label: string }[];
  leftDomain: [number | "auto", number | "auto"];
  rightDomain?: [number | "auto", number | "auto"];
  leftUnit: string;
  rightUnit?: string;
}

export const TABS: TabDef[] = [
  {
    id: "heartRate",
    label: "Heart rate",
    metrics: ["heartRate"],
    series: [{ key: "heartRate", name: "Resting heart rate", unit: "bpm", color: COLORS.cyan, kind: "line", decimals: 0, manualKey: "heartRateManual" }],
    bands: [{ y1: HEART_RATE.reference.min, y2: HEART_RATE.reference.max, label: "Configured Reference Range" }],
    leftDomain: [40, 100],
    leftUnit: "bpm",
  },
  {
    id: "bloodPressure",
    label: "Blood pressure",
    metrics: ["bloodPressure"],
    series: [
      { key: "systolic", name: "Systolic", unit: "mmHg", color: COLORS.cyan, kind: "line", decimals: 0, manualKey: "systolicManual" },
      { key: "diastolic", name: "Diastolic", unit: "mmHg", color: COLORS.blue, kind: "line", decimals: 0, manualKey: "diastolicManual" },
    ],
    bands: [
      { y1: BLOOD_PRESSURE.reference.systolic.min, y2: BLOOD_PRESSURE.reference.systolic.max, label: "Configured Reference Range (systolic)" },
      { y1: BLOOD_PRESSURE.reference.diastolic.min, y2: BLOOD_PRESSURE.reference.diastolic.max, label: "Configured Reference Range (diastolic)" },
    ],
    leftDomain: [55, 155],
    leftUnit: "mmHg",
  },
  {
    id: "bloodGlucose",
    label: "Glucose",
    metrics: ["bloodGlucose"],
    series: [{ key: "bloodGlucose", name: "Blood glucose", unit: "mg/dL", color: COLORS.cyan, kind: "line", decimals: 0, manualKey: "bloodGlucoseManual" }],
    bands: [{ y1: BLOOD_GLUCOSE.reference.min, y2: BLOOD_GLUCOSE.reference.max, label: "Configured Reference Range" }],
    leftDomain: [60, 130],
    leftUnit: "mg/dL",
  },
  {
    id: "bodyTemperature",
    label: "Temperature",
    metrics: ["bodyTemperature"],
    series: [{ key: "bodyTemperature", name: "Body temperature", unit: "°C", color: COLORS.cyan, kind: "line", decimals: 1, manualKey: "bodyTemperatureManual" }],
    bands: [{ y1: BODY_TEMPERATURE.reference.min, y2: BODY_TEMPERATURE.reference.max, label: "Configured Reference Range" }],
    leftDomain: [36, 38.4],
    leftUnit: "°C",
  },
  {
    id: "sleepMood",
    label: "Sleep & mood",
    metrics: ["sleep", "mood"],
    series: [
      { key: "sleep", name: "Sleep", unit: "h", color: COLORS.cyan, kind: "line", axis: "left", decimals: 1, manualKey: "sleepManual" },
      { key: "mood", name: "Mood", unit: "/ 5", color: COLORS.blue, kind: "line", axis: "right", decimals: 1, manualKey: "moodManual" },
    ],
    bands: [{ y1: SLEEP.reference.min, y2: SLEEP.reference.max, label: "Configured Reference Range (sleep)" }],
    leftDomain: [3, 9],
    rightDomain: [1, 5],
    leftUnit: "h",
    rightUnit: "/ 5",
  },
  {
    id: "ared",
    label: "ARED exercise",
    metrics: ["aredMinutes"],
    series: [{ key: "aredMinutes", name: "ARED minutes", unit: "min", color: COLORS.cyan, kind: "bar", decimals: 0, manualKey: "aredManual" }],
    bands: [],
    leftDomain: [0, 90],
    leftUnit: "min",
  },
  {
    id: "radiation",
    label: "Radiation",
    metrics: ["radiation"],
    series: [
      { key: "dailyDose", name: "Daily dose (dosimeter)", unit: "mSv", color: COLORS.blue, kind: "bar", axis: "left", decimals: 2 },
      { key: "cumulativeDose", name: "Cumulative dose", unit: "mSv", color: COLORS.cyan, kind: "area", axis: "right", decimals: 1, manualKey: "cumulativeManual" },
    ],
    bands: [],
    leftDomain: [0, "auto"],
    rightDomain: [0, "auto"],
    leftUnit: "mSv/day",
    rightUnit: "mSv",
  },
  {
    id: "pvtHydration",
    label: "PVT & hydration",
    metrics: ["pvt", "hydration"],
    series: [
      { key: "pvt", name: "PVT mean reaction time", unit: "ms", color: COLORS.cyan, kind: "line", axis: "left", decimals: 0, manualKey: "pvtManual" },
      { key: "hydration", name: "Fluid intake", unit: "L", color: COLORS.blue, kind: "bar", axis: "right", decimals: 1, manualKey: "hydrationManual" },
    ],
    bands: [],
    leftDomain: [180, 360],
    rightDomain: [0, 4],
    leftUnit: "ms",
    rightUnit: "L",
  },
];
