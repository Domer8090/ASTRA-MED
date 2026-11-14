/**
 * Deterministic rules engine.
 *
 * - Evaluates readings against the configured prototype thresholds.
 * - Applies persistence rules where the configuration requires several days.
 * - Flags stale or missing measurements.
 * - Explains every status with the rule that produced it.
 * - Never changes a recorded measurement, never names a disease and never
 *   prescribes medication or treatment.
 */
import {
  ARED,
  BLOOD_GLUCOSE,
  BLOOD_PRESSURE,
  BODY_TEMPERATURE,
  HEART_RATE,
  HYDRATION,
  MOOD,
  PVT,
  RADIATION,
  SLEEP,
  SYMPTOMS,
} from "../config/thresholds";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import {
  ALL_METRIC_IDS,
  PRIMARY_METRIC_IDS,
  STATUS_RANK,
  type EffectiveDay,
  type HealthStatus,
  type MetricDiagnostic,
  type MetricId,
  type MetricReading,
  type OverallStatus,
  type RuleTrace,
  type ThresholdProvenance,
  type EnvironmentAdvisory,
} from "../types/health";
import { formatDose, formatMetricValue, isBloodPressure, isSymptomValue, listSymptoms } from "../utils/formatting";
import { metricBasis } from "./basis";

export interface EngineSettings {
  aredTargetMinutes: number;
  hydrationTargetLiters: number;
}

export interface EngineInput {
  days: readonly EffectiveDay[];
  settings: EngineSettings;
  evaluatedAt: string;
}

interface ValueEval {
  status: HealthStatus;
  rules: RuleTrace[];
  notes: string[];
  summary: string;
  explanation: string;
  next: string;
}

const STALE_AFTER: Record<MetricId, number> = {
  heartRate: HEART_RATE.staleAfterDays,
  bloodPressure: BLOOD_PRESSURE.staleAfterDays,
  bloodGlucose: BLOOD_GLUCOSE.staleAfterDays,
  bodyTemperature: BODY_TEMPERATURE.staleAfterDays,
  sleep: SLEEP.staleAfterDays,
  mood: MOOD.staleAfterDays,
  aredMinutes: ARED.staleAfterDays,
  radiation: RADIATION.staleAfterDays,
  pvt: PVT.staleAfterDays,
  hydration: HYDRATION.staleAfterDays,
  symptoms: SYMPTOMS.staleAfterDays,
};

const REPEAT = "Repeat the measurement using the instructions.";
const RECORD = "Record symptoms and contact the medical officer when communication is available.";

export function worst(a: HealthStatus, b: HealthStatus): HealthStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function rule(
  ruleId: string,
  status: HealthStatus,
  description: string,
  observed: string,
  threshold: string,
  provenance: ThresholdProvenance,
): RuleTrace {
  return { ruleId, status, description, observed, threshold, provenance };
}

function readingOn(days: readonly EffectiveDay[], day: number, metricId: MetricId): MetricReading | undefined {
  return days[day - 1]?.readings[metricId];
}

function num(r: MetricReading | undefined): number | undefined {
  return r && typeof r.value === "number" ? r.value : undefined;
}

/** Most recent reading on or before `day`, searching back at most `lookback` days. */
export function latestReading(
  days: readonly EffectiveDay[],
  day: number,
  metricId: MetricId,
  lookback = 45,
): MetricReading | null {
  for (let d = day; d >= Math.max(1, day - lookback); d--) {
    const r = readingOn(days, d, metricId);
    if (r) return r;
  }
  return null;
}

function consecutiveDays(days: readonly EffectiveDay[], day: number, metricId: MetricId, test: (v: number) => boolean): number {
  let n = 0;
  for (let d = day; d >= 1; d--) {
    const v = num(readingOn(days, d, metricId));
    if (v === undefined || !test(v)) break;
    n++;
  }
  return n;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = values.toSorted((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

const nominal = (summary: string, explanation: string, next: string, notes: string[] = []): ValueEval => ({
  status: "NOMINAL",
  rules: [],
  notes,
  summary,
  explanation,
  next,
});

/* ---------------- per-metric evaluators ---------------- */

function evalHeartRate(_input: EngineInput, _day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const p = HEART_RATE.provenance;
  const why =
    "Fluid shifts and cardiovascular adaptation in microgravity change resting heart rate. Exertion, stress, sleep loss or illness can also raise it.";
  if (v > HEART_RATE.criticalAbove) {
    return {
      status: "CRITICAL",
      rules: [rule("hr-critical-high", "CRITICAL", "Above the configured critical limit", `${v} bpm`, `> ${HEART_RATE.criticalAbove} bpm`, p)],
      notes: [],
      summary: `Resting heart rate is ${v} bpm, above the configured critical limit of ${HEART_RATE.criticalAbove} bpm.`,
      explanation: why,
      next: `${REPEAT} If it is confirmed, follow the mission-approved cardiovascular protocol. ${RECORD}`,
    };
  }
  if (v > HEART_RATE.cautionAbove || v < HEART_RATE.cautionBelow) {
    const high = v > HEART_RATE.cautionAbove;
    return {
      status: "CAUTION",
      rules: [
        rule(
          high ? "hr-caution-high" : "hr-caution-low",
          "CAUTION",
          "Outside the configured demonstration range",
          `${v} bpm`,
          high ? `> ${HEART_RATE.cautionAbove} bpm` : `< ${HEART_RATE.cautionBelow} bpm`,
          p,
        ),
      ],
      notes: [],
      summary: `Resting heart rate is ${v} bpm, ${high ? "above" : "below"} the configured caution limit of ${high ? HEART_RATE.cautionAbove : HEART_RATE.cautionBelow} bpm.`,
      explanation: why,
      next: `${REPEAT} Use the same posture and rest period, then review the mission-approved cardiovascular protocol.`,
    };
  }
  const notes: string[] = [];
  if (v > HEART_RATE.reference.max) notes.push("Above the configured reference range, below the caution limit.");
  if (v < HEART_RATE.reference.min) notes.push("Below the configured reference range, above the caution limit.");
  return nominal(
    `Resting heart rate is ${v} bpm, inside the configured demonstration range.`,
    why,
    "Keep measuring at the same time and posture each day.",
    notes,
  );
}

function evalBloodPressure(_input: EngineInput, _day: number, r: MetricReading): ValueEval {
  if (!isBloodPressure(r.value)) return nominal("No valid blood-pressure value.", "", REPEAT);
  const { systolic: s, diastolic: d } = r.value;
  const t = BLOOD_PRESSURE;
  const p = t.provenance;
  const obs = `${s}/${d} mmHg`;
  const why =
    "Headward fluid shift and changes in blood volume alter blood pressure in microgravity. Cuff position, posture and recent exercise also change readings.";
  const critHigh = s > t.criticalAbove.systolic || d > t.criticalAbove.diastolic;
  const critLow = s < t.criticalBelow.systolic || d < t.criticalBelow.diastolic;
  if (critHigh || critLow) {
    return {
      status: "CRITICAL",
      rules: [
        rule(
          critHigh ? "bp-critical-high" : "bp-critical-low",
          "CRITICAL",
          "Beyond the configured critical limit",
          obs,
          critHigh ? `> ${t.criticalAbove.systolic}/${t.criticalAbove.diastolic} mmHg` : `< ${t.criticalBelow.systolic}/${t.criticalBelow.diastolic} mmHg`,
          p,
        ),
      ],
      notes: [],
      summary: `Blood pressure is ${obs}, beyond the configured critical limit.`,
      explanation: why,
      next: `${REPEAT} If it is confirmed, follow the mission-approved cardiovascular protocol. ${RECORD}`,
    };
  }
  const cHigh = s > t.cautionAbove.systolic || d > t.cautionAbove.diastolic;
  const cLow = s < t.cautionBelow.systolic || d < t.cautionBelow.diastolic;
  if (cHigh || cLow) {
    return {
      status: "CAUTION",
      rules: [
        rule(
          cHigh ? "bp-caution-high" : "bp-caution-low",
          "CAUTION",
          "Outside the configured demonstration range",
          obs,
          cHigh ? `> ${t.cautionAbove.systolic}/${t.cautionAbove.diastolic} mmHg` : `< ${t.cautionBelow.systolic}/${t.cautionBelow.diastolic} mmHg`,
          p,
        ),
      ],
      notes: [],
      summary: `Blood pressure is ${obs}, ${cHigh ? "above" : "below"} the configured caution limit.`,
      explanation: why,
      next: `${REPEAT} Rest for the protocol period, use the same arm and posture, and review the mission-approved cardiovascular protocol.`,
    };
  }
  const notes: string[] = [];
  if (s > t.reference.systolic.max || d > t.reference.diastolic.max) notes.push("Above the configured reference range, below the caution limit.");
  if (s < t.reference.systolic.min || d < t.reference.diastolic.min) notes.push("Below the configured reference range, above the caution limit.");
  return nominal(`Blood pressure is ${obs}, inside the configured demonstration range.`, why, "Keep the same cuff, arm and posture for each reading.", notes);
}

function evalTemperature(_input: EngineInput, _day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const t = BODY_TEMPERATURE;
  const obs = `${formatMetricValue("bodyTemperature", v)} °C`;
  const why = "Heat leaves the body more slowly without convection, and a raised temperature can be an early sign of illness.";
  if (v >= t.criticalAtOrAbove) {
    return {
      status: "CRITICAL",
      rules: [rule("temp-critical", "CRITICAL", "At or above the configured critical limit", obs, `≥ ${t.criticalAtOrAbove} °C`, t.provenance)],
      notes: [],
      summary: `Body temperature is ${obs}, at or above the configured critical limit of ${t.criticalAtOrAbove} °C.`,
      explanation: why,
      next: `${REPEAT} If it is confirmed, follow the mission-approved illness protocol. ${RECORD}`,
    };
  }
  if (v >= t.cautionAtOrAbove) {
    return {
      status: "CAUTION",
      rules: [rule("temp-caution-high", "CAUTION", "Outside the configured demonstration range", obs, `${t.cautionAtOrAbove}–${(t.criticalAtOrAbove - 0.1).toFixed(1)} °C`, t.provenance)],
      notes: [],
      summary: `Body temperature is ${obs}, above the configured reference range.`,
      explanation: why,
      next: "Repeat the measurement after 30 minutes at rest, away from exercise. Record any symptoms and review the mission-approved protocol.",
    };
  }
  if (v < t.cautionBelow) {
    return {
      status: "CAUTION",
      rules: [rule("temp-caution-low", "CAUTION", "Below the configured low limit", obs, `< ${t.cautionBelow} °C`, t.cautionBelowProvenance)],
      notes: [],
      summary: `Body temperature is ${obs}, below the configured low limit.`,
      explanation: "Low readings are often a measurement-site or device issue, but they need confirming.",
      next: `${REPEAT} Check the measurement site and device, then review the mission-approved protocol.`,
    };
  }
  const notes = v < t.reference.min ? ["Below the configured reference range, above the low limit."] : [];
  return nominal(`Body temperature is ${obs}, inside the configured demonstration range.`, why, "Measure at the same site and time each day.", notes);
}

function evalGlucose(_input: EngineInput, _day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const t = BLOOD_GLUCOSE;
  const obs = `${v} mg/dL`;
  const contextNote = r.glucoseContext === "post-meal" ? " The reading is recorded as post-meal; compare it with the mission timing protocol." : "";
  const why = `Sleep, meal timing, reduced loading and stress can all change glucose on a long mission. A single value needs its timing context.${contextNote}`;
  if (v >= t.criticalAtOrAbove || v < t.criticalBelow) {
    const high = v >= t.criticalAtOrAbove;
    return {
      status: "CRITICAL",
      rules: [rule(high ? "glu-critical-high" : "glu-critical-low", "CRITICAL", "Beyond the configured critical limit", obs, high ? `≥ ${t.criticalAtOrAbove} mg/dL` : `< ${t.criticalBelow} mg/dL`, t.provenance)],
      notes: [],
      summary: `Blood glucose is ${obs}, ${high ? "at or above" : "below"} the configured critical limit.`,
      explanation: why,
      next: `${REPEAT} Follow the mission-approved protocol for unusual results. ${RECORD}`,
    };
  }
  if (v >= t.cautionAtOrAbove || v < t.cautionBelow) {
    const high = v >= t.cautionAtOrAbove;
    return {
      status: "CAUTION",
      rules: [rule(high ? "glu-caution-high" : "glu-caution-low", "CAUTION", "Outside the configured demonstration range", obs, high ? `${t.cautionAtOrAbove}–${t.criticalAtOrAbove - 1} mg/dL` : `< ${t.cautionBelow} mg/dL`, t.provenance)],
      notes: r.glucoseContext ? [`Recorded as ${r.glucoseContext}.`] : [],
      summary: `Blood glucose is ${obs}, ${high ? "above" : "below"} the configured demonstration range.`,
      explanation: why,
      next: "Repeat at the next protocol time point and record whether it is fasting or post-meal. Review the mission-approved protocol if it stays outside the range.",
    };
  }
  const notes: string[] = [];
  if (v > t.reference.max) notes.push("Above the configured reference range, below the caution limit.");
  if (r.glucoseContext) notes.push(`Recorded as ${r.glucoseContext}.`);
  return nominal(`Blood glucose is ${obs}, inside the configured demonstration range.`, why, "Keep the scheduled glucose checks and note the timing context.", notes);
}

function evalSleep(input: EngineInput, day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const t = SLEEP;
  const obs = `${formatMetricValue("sleep", v)} h`;
  const why = "Repeated short sleep may affect attention and reaction time. Light cues, noise and schedule shifts disrupt sleep on a spacecraft.";
  if (v < t.criticalBelow) {
    return {
      status: "CRITICAL",
      rules: [rule("sleep-critical", "CRITICAL", "Below the configured critical limit", obs, `< ${t.criticalBelow} h`, t.provenance)],
      notes: [],
      summary: `Sleep was ${obs}, below the configured critical limit of ${t.criticalBelow} h.`,
      explanation: why,
      next: "Avoid starting safety-critical tasks without review. Follow the approved sleep and fatigue protocol and tell the medical officer when communication is available.",
    };
  }
  const run = consecutiveDays(input.days, day, "sleep", (x) => x < t.cautionBelow);
  if (run >= t.cautionPersistenceDays) {
    return {
      status: "CAUTION",
      rules: [rule("sleep-caution-persistent", "CAUTION", `Below target for ${t.cautionPersistenceDays}+ consecutive days`, `${obs}, ${run} days in a row`, `< ${t.cautionBelow} h for ${t.cautionPersistenceDays}+ days`, t.provenance)],
      notes: [],
      summary: `Sleep has been below the configured target for ${run} consecutive days (latest ${obs}).`,
      explanation: why,
      next: "Complete the scheduled rest-period check and review the approved sleep routine.",
    };
  }
  if (v < t.singleNightCautionBelow) {
    return {
      status: "CAUTION",
      rules: [rule("sleep-caution-single", "CAUTION", "One very short sleep period", obs, `< ${t.singleNightCautionBelow} h`, t.singleNightProvenance)],
      notes: [],
      summary: `Sleep was ${obs}, a very short sleep period.`,
      explanation: why,
      next: "Review the approved sleep routine and log tonight's sleep. Take extra care with safety-critical work today.",
    };
  }
  if (v < t.cautionBelow) {
    return nominal(
      `Sleep was ${obs}, below the ${t.cautionBelow} h target for one night.`,
      why,
      "Log tonight's sleep. If it is short again, review the approved sleep routine.",
      [`One short night. Caution applies after ${t.cautionPersistenceDays} consecutive nights below ${t.cautionBelow} h.`],
    );
  }
  return nominal(`Sleep was ${obs}, inside the configured reference range.`, why, "Keep logging sleep with the same method each day.");
}

function evalMood(input: EngineInput, day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const t = MOOD;
  const obs = `${formatMetricValue("mood", v)} / 5`;
  const why = "Isolation, confinement, distance from home and workload affect wellbeing on long missions. A persistent change matters more than a single day.";
  if (v <= t.criticalAtOrBelow) {
    return {
      status: "CRITICAL",
      rules: [rule("mood-critical", "CRITICAL", "At or below the configured critical limit", obs, `≤ ${t.criticalAtOrBelow}`, t.provenance)],
      notes: [],
      summary: `Mood check-in is ${obs}, at or below the configured critical limit.`,
      explanation: why,
      next: "Use the mission's approved behavioural-health resources now and contact the medical officer or a crewmate. Record how you feel when communication is available.",
    };
  }
  const run = consecutiveDays(input.days, day, "mood", (x) => x <= t.cautionAtOrBelow);
  if (run >= t.cautionPersistenceDays) {
    return {
      status: "CAUTION",
      rules: [rule("mood-caution-persistent", "CAUTION", `Low for ${t.cautionPersistenceDays}+ consecutive days`, `${obs}, ${run} days in a row`, `≤ ${t.cautionAtOrBelow} for ${t.cautionPersistenceDays}+ days`, t.provenance)],
      notes: [],
      summary: `Mood check-ins have been low for ${run} consecutive days (latest ${obs}).`,
      explanation: why,
      next: "Review the approved behavioural-health resources and plan a private conference with the medical officer when communication is available.",
    };
  }
  const notes = v <= t.cautionAtOrBelow ? [`One low check-in. Caution applies after ${t.cautionPersistenceDays} consecutive low days.`] : [];
  return nominal(`Mood check-in is ${obs}.`, why, "Keep using the same scale each day.", notes);
}

function evalAred(input: EngineInput, day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const target = input.settings.aredTargetMinutes;
  const obs = `${v} min`;
  const why = "Reduced mechanical loading contributes to bone and muscle loss, and resistive exercise is a key countermeasure. Minutes show adherence, not bone density.";
  const noIntensity = "Do not increase intensity or duration to make up for missed time.";
  let missed = 0;
  for (let d = day; d > Math.max(0, day - ARED.criticalWindowDays); d--) {
    const m = num(readingOn(input.days, d, "aredMinutes"));
    if (m !== undefined && m < target * ARED.missedFraction) missed++;
  }
  if (missed >= ARED.criticalMissedSessions) {
    return {
      status: "CRITICAL",
      rules: [rule("ared-critical-missed", "CRITICAL", "Repeated missed sessions", `${missed} missed in ${ARED.criticalWindowDays} days`, `≥ ${ARED.criticalMissedSessions} sessions below ${Math.round(ARED.missedFraction * 100)}% of plan`, ARED.ruleProvenance)],
      notes: [],
      summary: `${missed} resistive exercise sessions were missed in the last ${ARED.criticalWindowDays} days.`,
      explanation: why,
      next: `Report the missed sessions and review the exercise plan with the medical officer when communication is available. ${noIntensity}`,
    };
  }
  if (v < target) {
    return {
      status: "CAUTION",
      rules: [rule("ared-caution-below-plan", "CAUTION", "Below the planned target", obs, `< ${target} min (demo plan)`, ARED.targetProvenance)],
      notes: [],
      summary: `Resistive exercise was ${obs}, below today's planned ${target} min.`,
      explanation: why,
      next: `Record why the session was short (equipment, schedule or discomfort). Complete only the next assigned session. ${noIntensity}`,
    };
  }
  return nominal(`Resistive exercise was ${obs}, meeting the ${target} min demo plan.`, why, "Complete only the assigned session in today's plan.");
}

function evalRadiation(input: EngineInput, day: number, r: MetricReading): ValueEval {
  const cumulative = num(r) ?? 0;
  const daily = input.days[day - 1]?.dailyRadiationMsv ?? 0;
  const prior: number[] = [];
  for (let d = day - 1; d >= Math.max(1, day - RADIATION.trailingWindowDays); d--) {
    const x = input.days[d - 1]?.dailyRadiationMsv;
    if (x !== undefined) prior.push(x);
  }
  const med = median(prior);
  const why =
    "Outside Earth's magnetosphere, galactic cosmic rays deliver a steady dose and solar particle events can add more. Only the dosimeter gives your personal dose.";
  const obs = `${formatDose(daily)} today, ${formatDose(cumulative, 1)} cumulative`;
  const budget = RADIATION.missionExposureBudgetMsv;
  if (budget !== null && cumulative >= budget) {
    return {
      status: "CRITICAL",
      rules: [rule("rad-budget", "CRITICAL", "At or above the configured mission exposure budget", formatDose(cumulative, 1), `≥ ${budget} mSv`, RADIATION.ruleProvenance)],
      notes: [],
      summary: `Cumulative dose has reached the configured mission exposure budget.`,
      explanation: why,
      next: "Follow the approved mission exposure protocol and contact the medical officer when communication is available.",
    };
  }
  if (med !== null && prior.length >= 3 && daily > med * RADIATION.unusualDailyFactor) {
    return {
      status: "CAUTION",
      rules: [rule("rad-unusual-daily", "CAUTION", "Unusual daily increase", formatDose(daily), `> ${RADIATION.unusualDailyFactor}× trailing ${RADIATION.trailingWindowDays}-day median (${formatDose(med)})`, RADIATION.ruleProvenance)],
      notes: ["Personal dose comes from the dosimeter. Space-weather events are shown separately and never create a dose value."],
      summary: `Dosimeter daily dose is ${formatDose(daily)}, more than ${RADIATION.unusualDailyFactor}× the usual daily dose.`,
      explanation: why,
      next: "Confirm the dosimeter reading is current and from your device. Review the space-weather monitor and follow the approved radiation protection and shelter procedure when directed.",
    };
  }
  return nominal(
    `Dosimeter shows ${obs}, within the usual daily range.`,
    why,
    "Review the dosimeter and the space-weather monitor once per day.",
    budget === null ? ["No mission exposure budget is configured, so no cumulative critical limit applies."] : [],
  );
}

function pvtBaseline(days: readonly EffectiveDay[]): number | null {
  const v: number[] = [];
  for (let d = 1; d <= PVT.baselineDays; d++) {
    const x = num(readingOn(days, d, "pvt"));
    if (x !== undefined) v.push(x);
  }
  return median(v);
}

function evalPvt(input: EngineInput, day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const base = pvtBaseline(input.days);
  const obs = `${v} ms`;
  const why = "Slower reaction time can reveal fatigue from sleep loss or workload before you notice it.";
  if (base === null || day <= PVT.baselineDays) {
    return nominal(`PVT mean reaction time is ${obs}. Baseline is being established (days 1–${PVT.baselineDays}).`, why, "Complete each scheduled PVT session.");
  }
  const limit = base * (1 + PVT.cautionSlowerFraction);
  let slowChecks = 0;
  for (let d = day; d >= Math.max(1, day - 12) && slowChecks < 10; d--) {
    const x = num(readingOn(input.days, d, "pvt"));
    if (x === undefined) continue;
    if (x > limit) slowChecks++;
    else break;
  }
  if (slowChecks >= PVT.cautionPersistenceChecks) {
    return {
      status: "CAUTION",
      rules: [rule("pvt-slow", "CAUTION", "Slower than baseline on consecutive checks", `${obs}, ${slowChecks} checks`, `> ${Math.round(limit)} ms (baseline ${Math.round(base)} ms + ${Math.round(PVT.cautionSlowerFraction * 100)}%)`, PVT.provenance)],
      notes: [],
      summary: `PVT reaction time has been slower than your baseline on ${slowChecks} consecutive checks (latest ${obs}).`,
      explanation: why,
      next: "Review recent sleep and workload. Take extra care with safety-critical tasks and discuss the trend with the medical officer when communication is available.",
    };
  }
  const notes = v > limit ? ["One slow check. Caution applies after 2 consecutive slow checks."] : [];
  return nominal(`PVT mean reaction time is ${obs} (baseline ${Math.round(base)} ms).`, why, "Complete each scheduled PVT session.", notes);
}

function evalHydration(input: EngineInput, day: number, r: MetricReading): ValueEval {
  const v = num(r) ?? NaN;
  const target = input.settings.hydrationTargetLiters;
  const obs = `${formatMetricValue("hydration", v)} L`;
  const why = "Thirst is weaker in microgravity, and fluid intake supports cardiovascular adaptation and temperature control.";
  const run = consecutiveDays(input.days, day, "hydration", (x) => x < target);
  if (run >= HYDRATION.cautionPersistenceDays) {
    return {
      status: "CAUTION",
      rules: [rule("hyd-below-plan", "CAUTION", `Below plan for ${HYDRATION.cautionPersistenceDays}+ days`, `${obs}, ${run} days`, `< ${target.toFixed(1)} L (demo plan)`, HYDRATION.ruleProvenance)],
      notes: [],
      summary: `Fluid intake has been below the ${target.toFixed(1)} L demo plan for ${run} consecutive days.`,
      explanation: why,
      next: "Review the mission hydration plan and log intake at the end of today.",
    };
  }
  const notes = v < target ? ["One day below plan."] : [];
  return nominal(`Fluid intake was ${obs} against a ${target.toFixed(1)} L demo plan.`, why, "Log fluid intake at the end of each day.", notes);
}

function evalSymptoms(input: EngineInput, day: number): ValueEval {
  const why = "Fluid shifts toward the head can affect the eyes and vision. A self-check records symptoms; it cannot diagnose SANS.";
  for (let d = day; d > Math.max(0, day - SYMPTOMS.lookbackDays); d--) {
    const r = readingOn(input.days, d, "symptoms");
    if (r && isSymptomValue(r.value)) {
      const list = listSymptoms(r.value);
      if (list.length > 0) {
        return {
          status: "CAUTION",
          rules: [rule("sym-reported", "CAUTION", "Symptom reported", list.join(", "), `Any symptom within ${SYMPTOMS.lookbackDays} days`, SYMPTOMS.provenance)],
          notes: [],
          summary: `Symptom check on day ${d} reported: ${list.join(", ")}.`,
          explanation: why,
          next: "Compare with earlier checks. If the symptom is new or worsening, follow the mission protocol and note it for the medical officer.",
        };
      }
    }
  }
  return nominal("Latest symptom check reported no symptoms.", why, "Complete the scheduled vision and symptom check.");
}

type Evaluator = (input: EngineInput, day: number, r: MetricReading) => ValueEval;

const EVALUATORS: Record<MetricId, Evaluator> = {
  heartRate: evalHeartRate,
  bloodPressure: evalBloodPressure,
  bodyTemperature: evalTemperature,
  bloodGlucose: evalGlucose,
  sleep: evalSleep,
  mood: evalMood,
  aredMinutes: evalAred,
  radiation: evalRadiation,
  pvt: evalPvt,
  hydration: evalHydration,
  symptoms: (input, day) => evalSymptoms(input, day),
};

/* ---------------- metric diagnostic ---------------- */

const statusCache = new WeakMap<EngineInput, Map<string, HealthStatus>>();

function coreStatus(input: EngineInput, metricId: MetricId, day: number): HealthStatus {
  let cache = statusCache.get(input);
  if (!cache) {
    cache = new Map();
    statusCache.set(input, cache);
  }
  const key = `${metricId}:${day}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const latest = latestReading(input.days, day, metricId);
  let status: HealthStatus;
  if (!latest) status = "CAUTION";
  else {
    status = EVALUATORS[metricId](input, latest.missionDay, latest).status;
    if (day - latest.missionDay > STALE_AFTER[metricId]) status = worst(status, "CAUTION");
  }
  cache.set(key, status);
  return status;
}

export function evaluateMetric(input: EngineInput, metricId: MetricId, day: number): MetricDiagnostic {
  const name = METRIC_GUIDANCE[metricId].name;
  const latest = latestReading(input.days, day, metricId);
  const base = { metricId, evaluatedAt: input.evaluatedAt, missionDay: day };

  if (!latest) {
    return {
      ...base,
      status: "CAUTION",
      summary: `No ${name.toLowerCase()} reading has been recorded yet.`,
      explanation: "Without a reading, ASTRA-MED cannot evaluate this indicator.",
      recommendedNextStep: `Take a ${name.toLowerCase()} measurement using the guide.`,
      latest: null,
      previous: null,
      freshness: "missing",
      persistenceDays: 1,
      triggeredRules: [rule(`${metricId}-missing`, "CAUTION", "No measurement recorded", "none", "At least one reading", "astra-assumption")],
      notes: [],
      basis: metricBasis(metricId, [rule(`${metricId}-missing`, "CAUTION", "No measurement recorded", "none", "At least one reading", "astra-assumption")]),
    };
  }

  const previous = latestReading(input.days, latest.missionDay - 1, metricId);
  const ev = EVALUATORS[metricId](input, latest.missionDay, latest);
  const age = day - latest.missionDay;
  const stale = age > STALE_AFTER[metricId];
  let status = ev.status;
  const rules = [...ev.rules];
  let summary = ev.summary;
  let next = ev.next;
  if (stale) {
    status = worst(status, "CAUTION");
    rules.push(rule(`${metricId}-stale`, "CAUTION", "Measurement is stale", `${age} days old`, `Newer than ${STALE_AFTER[metricId]} days`, "astra-assumption"));
    summary = `The latest ${name.toLowerCase()} reading is ${age} days old. ${summary}`;
    next = `Take a new measurement using the guide. ${next}`;
  }

  let persistenceDays = 0;
  if (status !== "NOMINAL") {
    for (let d = day; d >= 1 && persistenceDays < 60; d--) {
      if (coreStatus(input, metricId, d) === status) persistenceDays++;
      else break;
    }
    if (persistenceDays >= 2 && !/consecutive/.test(summary)) {
      summary += ` This is day ${persistenceDays} at ${status}, which points to a persistent trend rather than a one-time reading.`;
    } else if (persistenceDays === 1 && previous) {
      summary += ` The previous reading on day ${previous.missionDay} was ${formatMetricValue(metricId, previous.value)}${metricId === "radiation" ? " mSv cumulative" : ""}, so this is a new deviation.`;
    }
  }

  return {
    ...base,
    status,
    summary,
    explanation: ev.explanation,
    recommendedNextStep: next,
    latest,
    previous,
    freshness: stale ? "stale" : "current",
    persistenceDays,
    triggeredRules: rules,
    notes: ev.notes,
    basis: metricBasis(metricId, rules, ev.notes),
  };
}

export function evaluateAllMetrics(input: EngineInput, day: number): Record<MetricId, MetricDiagnostic> {
  const out = {} as Record<MetricId, MetricDiagnostic>;
  for (const id of ALL_METRIC_IDS) out[id] = evaluateMetric(input, id, day);
  return out;
}

/** Shared aggregation: CRITICAL if any critical, CAUTION if any caution, else NOMINAL. */
export function aggregateStatus(
  diagnostics: Record<MetricId, MetricDiagnostic>,
  advisories: readonly EnvironmentAdvisory[] = [],
): OverallStatus {
  const counts: Record<HealthStatus, number> = { NOMINAL: 0, CAUTION: 0, CRITICAL: 0 };
  let status: HealthStatus = "NOMINAL";
  const drivers: MetricDiagnostic[] = [];
  for (const id of ALL_METRIC_IDS) {
    const d = diagnostics[id];
    counts[d.status]++;
    status = worst(status, d.status);
    if (d.status !== "NOMINAL") drivers.push(d);
  }
  drivers.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || PRIMARY_METRIC_IDS.indexOf(a.metricId as never) - PRIMARY_METRIC_IDS.indexOf(b.metricId as never));
  return { status, counts, advisoryCount: advisories.filter((a) => a.severity !== "NOMINAL").length, drivers };
}

/** Overall status for every mission day, plus each metric's status per day. Used by the mission track and chart annotations. */
export function evaluateMissionDays(input: EngineInput): { overall: HealthStatus[]; byMetric: Record<MetricId, HealthStatus[]> } {
  const byMetric = {} as Record<MetricId, HealthStatus[]>;
  for (const id of ALL_METRIC_IDS) byMetric[id] = [];
  const overall: HealthStatus[] = [];
  for (let day = 1; day <= input.days.length; day++) {
    let s: HealthStatus = "NOMINAL";
    for (const id of ALL_METRIC_IDS) {
      const st = coreStatus(input, id, day);
      byMetric[id].push(st);
      s = worst(s, st);
    }
    overall.push(s);
  }
  return { overall, byMetric };
}
