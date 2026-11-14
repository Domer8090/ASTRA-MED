/**
 * Configured reference ranges and status rules.
 *
 * IMPORTANT: these are PROTOTYPE DEMONSTRATION ASSUMPTIONS. They are not
 * official NASA flight rules or validated clinical standards. Values tagged
 * `supplied-prototype` come from the table in PROMPT.md §8.2. Values tagged
 * `astra-assumption` were added by this build to close gaps in that table and
 * have no cited source. Values tagged `mission-plan` are demo mission-plan
 * targets that a real mission protocol would set per crew member.
 *
 * A real deployment must have every value and escalation rule reviewed and
 * approved by qualified aerospace-medicine personnel.
 *
 * This file is named `thresholds` rather than `nasaBaselines` on purpose, so
 * no reader mistakes it for a NASA-published baseline.
 */
import type { ThresholdProvenance } from "../types/health";

export interface Band {
  min: number;
  max: number;
}

export interface Bounded {
  /** Plausible data-entry bounds; values outside are rejected as entry errors. */
  entry: Band;
  /** Days without a reading before the metric is flagged stale. */
  staleAfterDays: number;
}

export const HEART_RATE = {
  unit: "bpm",
  reference: { min: 50, max: 68 },
  cautionAbove: 85,
  cautionBelow: 45,
  criticalAbove: 105,
  provenance: "supplied-prototype" as ThresholdProvenance,
  entry: { min: 25, max: 220 },
  staleAfterDays: 2,
} as const;

export const BLOOD_PRESSURE = {
  unit: "mmHg",
  reference: { systolic: { min: 110, max: 125 }, diastolic: { min: 70, max: 80 } },
  cautionAbove: { systolic: 135, diastolic: 85 },
  cautionBelow: { systolic: 95, diastolic: 60 },
  criticalAbove: { systolic: 150, diastolic: 95 },
  criticalBelow: { systolic: 85, diastolic: 55 },
  provenance: "supplied-prototype" as ThresholdProvenance,
  entry: { systolic: { min: 60, max: 260 }, diastolic: { min: 30, max: 160 } },
  staleAfterDays: 2,
} as const;

export const BODY_TEMPERATURE = {
  unit: "°C",
  reference: { min: 36.6, max: 37.5 },
  cautionAtOrAbove: 37.6,
  criticalAtOrAbove: 38.2,
  provenance: "supplied-prototype" as ThresholdProvenance,
  /** Not in the supplied table. Added so a low reading is not silently nominal. */
  cautionBelow: 36.0,
  cautionBelowProvenance: "astra-assumption" as ThresholdProvenance,
  entry: { min: 32, max: 43 },
  staleAfterDays: 2,
} as const;

export const BLOOD_GLUCOSE = {
  unit: "mg/dL",
  reference: { min: 75, max: 105 },
  cautionAtOrAbove: 110,
  cautionBelow: 68,
  criticalAtOrAbove: 140,
  criticalBelow: 55,
  provenance: "supplied-prototype" as ThresholdProvenance,
  entry: { min: 20, max: 600 },
  staleAfterDays: 3,
} as const;

export const SLEEP = {
  unit: "h",
  reference: { min: 6.0, max: 7.5 },
  /** Below this for `cautionPersistenceDays` consecutive days is CAUTION (5.0–5.9 for 2+ days in the table). */
  cautionBelow: 6.0,
  cautionPersistenceDays: 2,
  criticalBelow: 4.5,
  provenance: "supplied-prototype" as ThresholdProvenance,
  /** Not in the supplied table: one night between 4.5 and 5.0 h is CAUTION on its own. */
  singleNightCautionBelow: 5.0,
  singleNightProvenance: "astra-assumption" as ThresholdProvenance,
  entry: { min: 0, max: 16 },
  staleAfterDays: 2,
} as const;

export const MOOD = {
  unit: "/ 5",
  reference: { min: 3.5, max: 5 },
  cautionAtOrBelow: 2.5,
  cautionPersistenceDays: 3,
  criticalAtOrBelow: 1.5,
  provenance: "supplied-prototype" as ThresholdProvenance,
  entry: { min: 1, max: 5 },
  staleAfterDays: 2,
} as const;

export const ARED = {
  unit: "min",
  /** Demo target only (PROMPT.md §13.1). Editable in Settings; mission protocol sets the real plan. */
  defaultTargetMinutes: 60,
  targetProvenance: "mission-plan" as ThresholdProvenance,
  /** A session below this fraction of target counts as missed. */
  missedFraction: 0.5,
  /** CRITICAL when at least this many sessions were missed in the trailing window. */
  criticalMissedSessions: 3,
  criticalWindowDays: 7,
  ruleProvenance: "astra-assumption" as ThresholdProvenance,
  entry: { min: 0, max: 240 },
  staleAfterDays: 2,
} as const;

export const RADIATION = {
  unit: "mSv",
  /** Daily dose above this multiple of the trailing median is an "unusual daily increase" (CAUTION). */
  unusualDailyFactor: 2.0,
  trailingWindowDays: 14,
  ruleProvenance: "astra-assumption" as ThresholdProvenance,
  /**
   * Mission exposure budget in mSv. Deliberately null: exposure limits depend on
   * mission, dose rate, particle type and approved radiation protection limits.
   * While null, ASTRA-MED never raises CRITICAL from a cumulative value.
   */
  missionExposureBudgetMsv: null as number | null,
  /** Daily dose entry bounds for a cumulative dosimeter reading delta. */
  entry: { min: 0, max: 5000 },
  staleAfterDays: 2,
} as const;

export const PVT = {
  unit: "ms",
  /** Baseline is the crew member's median over mission days 1–14. */
  baselineDays: 14,
  /** CAUTION when mean reaction time exceeds baseline by this fraction on consecutive checks. */
  cautionSlowerFraction: 0.15,
  cautionPersistenceChecks: 2,
  provenance: "astra-assumption" as ThresholdProvenance,
  entry: { min: 100, max: 2000 },
  staleAfterDays: 5,
} as const;

export const HYDRATION = {
  unit: "L",
  /** Demo plan only; the mission nutrition plan sets the real target. */
  defaultTargetLiters: 2.0,
  targetProvenance: "mission-plan" as ThresholdProvenance,
  cautionPersistenceDays: 2,
  ruleProvenance: "astra-assumption" as ThresholdProvenance,
  entry: { min: 0, max: 8 },
  staleAfterDays: 2,
} as const;

export const SYMPTOMS = {
  /** Any reported neuro-ocular symptom within this many days is CAUTION until reviewed. */
  lookbackDays: 3,
  provenance: "astra-assumption" as ThresholdProvenance,
  staleAfterDays: 10,
} as const;

export const COUNTERMEASURES = {
  /** A day counts toward the streak when at least this fraction of tasks is complete. */
  streakMinCompletion: 0.8,
  provenance: "astra-assumption" as ThresholdProvenance,
} as const;

export const MISSION = {
  name: "ARES TRANSIT — DEMO MISSION",
  shortName: "ARES TRANSIT",
  totalDays: 180,
  crewId: "FE-2",
  crewLabel: "Flight Engineer 2 (demo identity)",
  /** Mission day 1 begins at this UTC instant. Used only to stamp synthetic readings. */
  epochUtc: "2026-05-04T00:00:00Z",
  defaultDay: 42,
} as const;

/** Human-readable rule table for the Data Sources view. */
export interface ThresholdRow {
  indicator: string;
  reference: string;
  caution: string;
  critical: string;
  provenance: ThresholdProvenance;
  note?: string;
}

export function describeThresholds(aredTarget: number, hydrationTarget: number): ThresholdRow[] {
  return [
    {
      indicator: "Resting heart rate",
      reference: "50–68 bpm",
      caution: "> 85 or < 45 bpm",
      critical: "> 105 bpm",
      provenance: "supplied-prototype",
    },
    {
      indicator: "Blood pressure",
      reference: "110/70–125/80 mmHg",
      caution: "> 135/85 or < 95/60 mmHg",
      critical: "> 150/95 or < 85/55 mmHg",
      provenance: "supplied-prototype",
    },
    {
      indicator: "Body temperature",
      reference: "36.6–37.5 °C",
      caution: "37.6–38.1 °C",
      critical: "≥ 38.2 °C",
      provenance: "supplied-prototype",
      note: "Low reading < 36.0 °C is CAUTION (ASTRA assumption, not in supplied table).",
    },
    {
      indicator: "Blood glucose",
      reference: "75–105 mg/dL",
      caution: "110–139 or < 68 mg/dL",
      critical: "≥ 140 or < 55 mg/dL",
      provenance: "supplied-prototype",
      note: "Interpretation depends on timing (fasting or post-meal) and the mission protocol.",
    },
    {
      indicator: "Sleep",
      reference: "6.0–7.5 h",
      caution: "< 6.0 h for 2+ consecutive days",
      critical: "< 4.5 h",
      provenance: "supplied-prototype",
      note: "One night of 4.5–4.9 h is CAUTION on its own (ASTRA assumption).",
    },
    {
      indicator: "Mood",
      reference: "3.5–5 / 5",
      caution: "≤ 2.5 for 3+ consecutive days",
      critical: "≤ 1.5",
      provenance: "supplied-prototype",
    },
    {
      indicator: "ARED resistive exercise",
      reference: `Plan: ${aredTarget} min/day (demo target)`,
      caution: "Below planned target",
      critical: "3+ missed sessions (< 50% of plan) in 7 days",
      provenance: "mission-plan",
      note: "Missed-session rule is an ASTRA assumption. Not an individual prescription.",
    },
    {
      indicator: "Cumulative radiation",
      reference: "Mission-dependent",
      caution: "Daily dose > 2× trailing 14-day median",
      critical: "Only against a configured mission exposure budget (not configured)",
      provenance: "astra-assumption",
      note: "Space-weather events never create a personal dose value.",
    },
    {
      indicator: "PVT reaction time",
      reference: "Within 15% of days 1–14 median",
      caution: "> 15% slower on 2 consecutive checks",
      critical: "None configured",
      provenance: "astra-assumption",
    },
    {
      indicator: "Hydration",
      reference: `Plan: ${hydrationTarget.toFixed(1)} L/day (demo target)`,
      caution: "Below plan for 2+ consecutive days",
      critical: "None configured",
      provenance: "mission-plan",
    },
    {
      indicator: "Neuro-ocular symptom check",
      reference: "No symptoms reported",
      caution: "Any symptom reported in last 3 days",
      critical: "None configured",
      provenance: "astra-assumption",
      note: "A self-check cannot diagnose SANS.",
    },
  ];
}

/**
 * Trend watch: an early-warning projection for indicators that are still
 * NOMINAL. A least-squares line through the last `windowDays` readings is
 * extended forward; if it reaches a caution limit within `horizonDays` and
 * the fit is good enough, the console shows TREND WATCH. It never changes a
 * health status. All values here are ASTRA assumptions.
 */
export const TREND_WATCH = {
  windowDays: 7,
  minReadings: 5,
  horizonDays: 7,
  /** Minimum R² of the fitted line; noisier series are ignored. */
  minFit: 0.5,
  /** Sleep has no band between reference and caution, so watch starts below this. */
  sleepWatchBelow: 6.5,
  provenance: "astra-assumption" as ThresholdProvenance,
} as const;
