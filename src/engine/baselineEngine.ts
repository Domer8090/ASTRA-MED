/**
 * Baseline drift: a small Isolation Forest (Liu, Ting and Zhou, 2008) trained
 * on this astronaut's own earlier mission days. It scores how unusual the
 * recent days look when heart rate, blood pressure, temperature, sleep and
 * mood are taken together, and names the indicators that moved most against
 * the personal baseline.
 *
 * Pure and deterministic (seeded). A drift cue is an early-warning prompt to
 * keep measuring carefully; it never changes a health status and is not a
 * diagnosis.
 */
import { BASELINE_DRIFT } from "../config/thresholds";
import type { EffectiveDay, MeasurementValue } from "../types/health";
import { mulberry32 } from "../utils/prng";

export type DriftFeatureId = "heartRate" | "systolic" | "diastolic" | "bodyTemperature" | "sleep" | "mood";

interface FeatureDef {
  id: DriftFeatureId;
  label: string;
  unit: string;
  decimals: number;
  read: (day: EffectiveDay) => number | undefined;
}

const num = (v: MeasurementValue | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const bp = (v: MeasurementValue | undefined, k: "systolic" | "diastolic") =>
  typeof v === "object" && v !== null && "systolic" in v && Number.isFinite(v[k]) ? v[k] : undefined;

export const DRIFT_FEATURES: readonly FeatureDef[] = [
  { id: "heartRate", label: "Resting heart rate", unit: "bpm", decimals: 0, read: (d) => num(d.readings.heartRate?.value) },
  { id: "systolic", label: "Systolic blood pressure", unit: "mmHg", decimals: 0, read: (d) => bp(d.readings.bloodPressure?.value, "systolic") },
  { id: "diastolic", label: "Diastolic blood pressure", unit: "mmHg", decimals: 0, read: (d) => bp(d.readings.bloodPressure?.value, "diastolic") },
  { id: "bodyTemperature", label: "Body temperature", unit: "°C", decimals: 1, read: (d) => num(d.readings.bodyTemperature?.value) },
  { id: "sleep", label: "Sleep", unit: "h", decimals: 1, read: (d) => num(d.readings.sleep?.value) },
  { id: "mood", label: "Mood", unit: "/ 5", decimals: 1, read: (d) => num(d.readings.mood?.value) },
];

// ---------------------------------------------------------------- Isolation Forest

type Node = { kind: "leaf"; size: number } | { kind: "split"; feature: number; value: number; left: Node; right: Node };

export interface IsolationForest {
  trees: Node[];
  sampleSize: number;
}

const EULER = 0.5772156649;

/** Average path length of an unsuccessful binary-search-tree lookup among n points. */
export function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + EULER) - (2 * (n - 1)) / n;
}

function buildTree(rows: number[][], depth: number, limit: number, rand: () => number): Node {
  if (depth >= limit || rows.length <= 1) return { kind: "leaf", size: rows.length };
  const width = rows[0]!.length;
  // Try a few features so a constant column does not end the branch early.
  for (let attempt = 0; attempt < width; attempt++) {
    const feature = Math.floor(rand() * width);
    let min = Infinity;
    let max = -Infinity;
    for (const r of rows) {
      const v = r[feature]!;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (max <= min) continue;
    const value = min + rand() * (max - min);
    const left = rows.filter((r) => r[feature]! < value);
    const right = rows.filter((r) => r[feature]! >= value);
    return { kind: "split", feature, value, left: buildTree(left, depth + 1, limit, rand), right: buildTree(right, depth + 1, limit, rand) };
  }
  return { kind: "leaf", size: rows.length };
}

/** Train on rows of equal width. Each tree sees a random subsample without replacement. */
export function trainIsolationForest(rows: readonly number[][], options: { trees: number; sampleSize: number; seed: number }): IsolationForest {
  const rand = mulberry32(options.seed);
  const sampleSize = Math.min(options.sampleSize, rows.length);
  const limit = Math.ceil(Math.log2(Math.max(2, sampleSize)));
  const trees: Node[] = [];
  for (let t = 0; t < options.trees; t++) {
    const pool = rows.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    trees.push(buildTree(pool.slice(0, sampleSize), 0, limit, rand));
  }
  return { trees, sampleSize };
}

function pathLength(node: Node, x: readonly number[], depth: number): number {
  if (node.kind === "leaf") return depth + averagePathLength(node.size);
  return pathLength(x[node.feature]! < node.value ? node.left : node.right, x, depth + 1);
}

/** Anomaly score in (0, 1]. About 0.5 is ordinary; values near 1 isolate quickly. */
export function anomalyScore(forest: IsolationForest, x: readonly number[]): number {
  const mean = forest.trees.reduce((s, t) => s + pathLength(t, x, 0), 0) / forest.trees.length;
  const c = averagePathLength(forest.sampleSize);
  return c === 0 ? 0.5 : 2 ** (-mean / c);
}

// ---------------------------------------------------------------- Baseline drift

export interface DriftDriver {
  feature: DriftFeatureId;
  label: string;
  unit: string;
  baselineMean: number;
  recentMean: number;
  /** Change of the recent mean against the personal baseline, in percent. */
  pctChange: number;
  /** Recent mean in baseline standard deviations. */
  z: number;
  direction: "higher" | "lower";
  text: string;
}

export interface BaselineDrift {
  state: "insufficient" | "steady" | "drift";
  day: number;
  baselineDays: [number, number];
  trainingDays: [number, number] | null;
  scores: { day: number; score: number }[];
  unusualDays: number;
  latestScore: number | null;
  /** Indicators furthest from the personal baseline, largest first. */
  drivers: DriftDriver[];
  text: string;
}

interface Stats {
  mean: number;
  sd: number;
}

function stats(values: number[]): Stats | null {
  if (values.length < 3) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return { mean, sd: Math.sqrt(variance) };
}

function fmt(v: number, decimals: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(v);
}

function rowFor(day: EffectiveDay | undefined, base: (Stats | null)[]): number[] | null {
  if (!day) return null;
  let missing = 0;
  const row = DRIFT_FEATURES.map((f, i) => {
    const s = base[i];
    const v = f.read(day);
    if (!s) return 0;
    if (v === undefined) {
      missing++;
      return 0;
    }
    return (v - s.mean) / Math.max(s.sd, 1e-6);
  });
  return missing > DRIFT_FEATURES.length / 2 ? null : row;
}

const insufficient = (day: number, baselineDays: [number, number], text: string): BaselineDrift => ({
  state: "insufficient",
  day,
  baselineDays,
  trainingDays: null,
  scores: [],
  unusualDays: 0,
  latestScore: null,
  drivers: [],
  text,
});

/**
 * Score the recent window ending on `day` against a forest trained on earlier
 * days. Features are standardised with the personal baseline (the first
 * `baselineDays` mission days), so drivers read as "x% above your baseline".
 */
export function baselineDrift(days: readonly EffectiveDay[], day: number, config = BASELINE_DRIFT): BaselineDrift {
  const baselineDays: [number, number] = [1, config.baselineDays];
  const base = DRIFT_FEATURES.map((f) =>
    stats(
      days
        .slice(0, config.baselineDays)
        .map((d) => f.read(d))
        .filter((v): v is number => v !== undefined),
    ),
  );
  if (base.every((s) => s === null)) return insufficient(day, baselineDays, "Not enough readings yet to learn a personal baseline.");

  const recentFrom = Math.max(1, day - config.recentDays + 1);
  const trainTo = recentFrom - 1;
  const trainFrom = Math.max(1, trainTo - config.maxTrainingDays + 1);
  const training: number[][] = [];
  for (let d = trainFrom; d <= trainTo; d++) {
    const r = rowFor(days[d - 1], base);
    if (r) training.push(r);
  }
  if (training.length < config.minTrainingDays) {
    return insufficient(day, baselineDays, `Pattern learning starts once ${config.minTrainingDays + config.recentDays} days of readings exist.`);
  }

  const forest = trainIsolationForest(training, { trees: config.trees, sampleSize: config.sampleSize, seed: config.seed + trainTo });
  const scores: { day: number; score: number }[] = [];
  for (let d = recentFrom; d <= day; d++) {
    const r = rowFor(days[d - 1], base);
    if (r) scores.push({ day: d, score: anomalyScore(forest, r) });
  }
  const unusualDays = scores.filter((s) => s.score >= config.unusualScore).length;

  const drivers: DriftDriver[] = [];
  DRIFT_FEATURES.forEach((f, i) => {
    const s = base[i];
    if (!s) return;
    const recent: number[] = [];
    for (let d = recentFrom; d <= day; d++) {
      const v = days[d - 1] ? f.read(days[d - 1]!) : undefined;
      if (v !== undefined) recent.push(v);
    }
    if (recent.length < 3) return;
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const z = (recentMean - s.mean) / Math.max(s.sd, 1e-6);
    if (Math.abs(z) < config.driverZ) return;
    const pctChange = s.mean === 0 ? 0 : ((recentMean - s.mean) / Math.abs(s.mean)) * 100;
    const direction = z > 0 ? "higher" : "lower";
    drivers.push({
      feature: f.id,
      label: f.label,
      unit: f.unit,
      baselineMean: s.mean,
      recentMean,
      pctChange,
      z,
      direction,
      text: `${f.label} averaged ${fmt(recentMean, f.decimals)} ${f.unit} over the last ${recent.length} days, ${fmt(Math.abs(pctChange), 0)}% ${direction} than your baseline of ${fmt(s.mean, f.decimals)} ${f.unit}.`,
    });
  });
  drivers.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

  const latestScore = scores.at(-1)?.score ?? null;
  const drift = unusualDays >= config.minUnusualDays && drivers.length > 0;
  const text = drift
    ? `${unusualDays} of the last ${scores.length} days look unlike your own earlier pattern. ${drivers[0]!.text} This is a pattern cue, not a diagnosis: keep measuring at the same time and posture.`
    : "Recent days look like your own earlier pattern.";

  return { state: drift ? "drift" : "steady", day, baselineDays, trainingDays: [trainFrom, trainTo], scores, unusualDays, latestScore, drivers, text };
}
