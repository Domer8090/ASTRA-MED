/**
 * Deterministic synthetic 180-day mission telemetry.
 *
 * SYNTHETIC DEMONSTRATION DATA. Nothing here is real astronaut telemetry.
 * The generator uses fixed seeds, so every load produces the same mission.
 *
 * Modelling choices (plausible shape, not a physiological model):
 * - Early adaptation over the first ~2 weeks, then small smooth (AR(1)) variation.
 * - Short sleep nudges heart rate, glucose, PVT and mood in the expected direction.
 * - Daily dose sits near the GCR dose-equivalent rate MSL/RAD measured during its
 *   Mars cruise (order of 1.8 mSv/day; Zeitlin et al., Science 340, 2013), with a
 *   27-day modulation. Cumulative dose is the running sum, so it never decreases.
 */
import { MISSION } from "../config/thresholds";
import type { MissionDayTelemetry, ScenarioId } from "../types/health";
import { ar1Series, clamp, hashSeed, mulberry32, roundTo, smoothstep } from "../utils/prng";

const DAYS = MISSION.totalDays;

function stream(name: string): () => number {
  return mulberry32(hashSeed(`astra-med:${name}`));
}

interface BaseSeries {
  hrNoise: number[];
  sysNoise: number[];
  diaNoise: number[];
  glucoseNoise: number[];
  tempNoise: number[];
  sleepNoise: number[];
  moodNoise: number[];
  doseNoise: number[];
  pvtNoise: number[];
  hydrationNoise: number[];
  aredRoll: number[];
  minuteRoll: number[];
}

function baseSeries(): BaseSeries {
  return {
    hrNoise: ar1Series(stream("hr"), DAYS, 0.6, 1.5),
    sysNoise: ar1Series(stream("sys"), DAYS, 0.5, 2.8),
    diaNoise: ar1Series(stream("dia"), DAYS, 0.5, 1.8),
    glucoseNoise: ar1Series(stream("glu"), DAYS, 0.35, 3.6),
    tempNoise: ar1Series(stream("temp"), DAYS, 0.6, 0.08),
    sleepNoise: ar1Series(stream("sleep"), DAYS, 0.3, 0.32),
    moodNoise: ar1Series(stream("mood"), DAYS, 0.55, 0.18),
    doseNoise: ar1Series(stream("dose"), DAYS, 0.4, 0.035),
    pvtNoise: ar1Series(stream("pvt"), DAYS, 0.4, 7),
    hydrationNoise: ar1Series(stream("hyd"), DAYS, 0.3, 0.16),
    aredRoll: Array.from({ length: DAYS }, stream("ared")),
    minuteRoll: Array.from({ length: DAYS }, stream("minute")),
  };
}

/** Fixed base anomalies shared by every scenario. */
const SLEEP_OVERRIDES: Record<number, number> = { 27: 5.4, 28: 5.6 };
const ARED_OVERRIDES: Record<number, number> = { 51: 25, 88: 45, 141: 0 };
const GLUCOSE_OVERRIDES: Record<number, number> = { 63: 113 };

/** Scenario B: cardiovascular drift envelope (0..1). */
export function cardiovascularDrift(day: number): number {
  const rise = smoothstep(96, 116, day);
  const ease = 1 - 0.75 * smoothstep(126, 146, day);
  return rise * ease;
}

/** Scenario C: extra synthetic dosimeter dose (mSv) during the simulated SEP. */
const SEP_EXTRA_DOSE: Record<number, number> = { 131: 6.4, 132: 2.8, 133: 0.9 };
const SEP_SLEEP: Record<number, number> = { 131: 5.2, 132: 5.6 };

function generate(scenarioId: ScenarioId): MissionDayTelemetry[] {
  const s = baseSeries();
  const out: MissionDayTelemetry[] = [];
  let cumulative = 0;

  for (let i = 0; i < DAYS; i++) {
    const day = i + 1;
    const adapt = 1 - Math.exp(-day / 12);

    // Sleep first: other signals respond to it.
    let sleep = clamp(6.55 + (s.sleepNoise[i] ?? 0), 5.0, 8.0);
    if (SLEEP_OVERRIDES[day] !== undefined) sleep = SLEEP_OVERRIDES[day];
    if (scenarioId === "sep" && SEP_SLEEP[day] !== undefined) sleep = SEP_SLEEP[day];
    // Keep ordinary nights at or above the reference minimum so only scripted anomalies trip rules.
    if (SLEEP_OVERRIDES[day] === undefined && !(scenarioId === "sep" && SEP_SLEEP[day] !== undefined)) {
      sleep = Math.max(sleep, 6.0);
    }
    sleep = roundTo(sleep, 0.1);
    const deficit = Math.max(0, 6.5 - sleep);

    const cv = scenarioId === "cardiovascular" ? cardiovascularDrift(day) : 0;

    const heartRate = Math.round(60.5 - 2.5 * adapt + (s.hrNoise[i] ?? 0) + 1.6 * deficit + 31.5 * cv);
    const systolic = Math.round(117 - 5 * adapt + (s.sysNoise[i] ?? 0) + 27 * cv);
    const diastolic = Math.round(75 - 3 * adapt + 0.35 * (s.sysNoise[i] ?? 0) + (s.diaNoise[i] ?? 0) + 15.5 * cv);

    let glucose = Math.round(clamp(88 + (s.glucoseNoise[i] ?? 0) + 2.2 * deficit, 76, 104));
    if (GLUCOSE_OVERRIDES[day] !== undefined) glucose = GLUCOSE_OVERRIDES[day];

    const temperature = roundTo(clamp(36.85 + 0.22 * Math.min(1, day / 90) + (s.tempNoise[i] ?? 0), 36.6, 37.4), 0.1);

    const thirdQuarterDip = 0.28 * Math.exp(-(((day - 112) / 16) ** 2));
    const moodScore = roundTo(
      clamp(4.25 - thirdQuarterDip + (s.moodNoise[i] ?? 0) - 0.35 * deficit, 3.5, 5),
      0.1,
    );

    const roll = s.aredRoll[i] ?? 0.5;
    let aredMinutes = roll < 0.86 ? 60 : roll < 0.98 ? 65 : 55;
    if (ARED_OVERRIDES[day] !== undefined) aredMinutes = ARED_OVERRIDES[day];

    let dailyDose = roundTo(1.8 + 0.05 * Math.sin((2 * Math.PI * day) / 27) + (s.doseNoise[i] ?? 0), 0.01);
    if (scenarioId === "sep" && SEP_EXTRA_DOSE[day] !== undefined) {
      dailyDose = roundTo(dailyDose + SEP_EXTRA_DOSE[day], 0.01);
    }
    cumulative = roundTo(cumulative + dailyDose, 0.01);

    const pvtMeanMs = day % 3 === 1 ? Math.round(246 + (s.pvtNoise[i] ?? 0) + 14 * deficit) : null;
    const hydrationLiters = roundTo(clamp(2.45 + (s.hydrationNoise[i] ?? 0), 2.05, 3.1), 0.1);
    const symptoms =
      day % 7 === 0 || day === 1 ? { blurredVision: false, headache: false, eyePressure: false, otherSymptom: false } : null;

    out.push({
      missionDay: day,
      heartRate,
      systolic,
      diastolic,
      glucose,
      temperature,
      sleepHours: sleep,
      moodScore,
      aredMinutes,
      dailyRadiationMsv: dailyDose,
      cumulativeRadiationMsv: cumulative,
      pvtMeanMs,
      hydrationLiters,
      symptoms,
      vitalsMinuteOfDay: 6 * 60 + 40 + Math.floor((s.minuteRoll[i] ?? 0) * 35),
    });
  }
  return out;
}

const cache = new Map<ScenarioId, readonly MissionDayTelemetry[]>();

/** Bundled synthetic telemetry for a scenario. Cached; never depends on storage or network. */
export function getMissionTelemetry(scenarioId: ScenarioId): readonly MissionDayTelemetry[] {
  let data = cache.get(scenarioId);
  if (!data) {
    data = Object.freeze(generate(scenarioId));
    cache.set(scenarioId, data);
  }
  return data;
}
