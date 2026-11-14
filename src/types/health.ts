/**
 * ASTRA-MED domain types.
 * Everything the engines, services and components exchange is defined here.
 */

export type HealthStatus = "NOMINAL" | "CAUTION" | "CRITICAL";

export const STATUS_RANK: Record<HealthStatus, number> = {
  NOMINAL: 0,
  CAUTION: 1,
  CRITICAL: 2,
};

/** The eight indicators PROMPT.md §7 requires. */
export type PrimaryMetricId =
  | "heartRate"
  | "bloodPressure"
  | "bloodGlucose"
  | "bodyTemperature"
  | "sleep"
  | "mood"
  | "aredMinutes"
  | "radiation";

/** Optional indicators used by body systems and countermeasures. */
export type SupplementalMetricId = "pvt" | "hydration" | "symptoms";

export type MetricId = PrimaryMetricId | SupplementalMetricId;

export const PRIMARY_METRIC_IDS: readonly PrimaryMetricId[] = [
  "heartRate",
  "bloodPressure",
  "bloodGlucose",
  "bodyTemperature",
  "sleep",
  "mood",
  "aredMinutes",
  "radiation",
] as const;

export const SUPPLEMENTAL_METRIC_IDS: readonly SupplementalMetricId[] = [
  "pvt",
  "hydration",
  "symptoms",
] as const;

export const ALL_METRIC_IDS: readonly MetricId[] = [
  ...PRIMARY_METRIC_IDS,
  ...SUPPLEMENTAL_METRIC_IDS,
];

export interface BloodPressureValue {
  systolic: number;
  diastolic: number;
}

export interface SymptomValue {
  blurredVision: boolean;
  headache: boolean;
  eyePressure: boolean;
  otherSymptom: boolean;
}

export type MeasurementValue = number | BloodPressureValue | SymptomValue;

export type MeasurementSource = "synthetic" | "manual" | "api" | "import";

export type GlucoseContext = "fasting" | "post-meal" | "other";

export interface VitalMeasurement {
  id: string;
  metricId: MetricId;
  value: MeasurementValue;
  unit: string;
  missionDay: number;
  /** ISO 8601, UTC, on the mission timeline (fictional epoch): mission day + ship time. */
  recordedAt: string;
  /** Real wall-clock time the entry was typed (ISO UTC). Audit only. */
  enteredAt?: string;
  source: MeasurementSource;
  notes?: string;
  glucoseContext?: GlucoseContext;
}

/** One synthetic mission day. Values are demonstration data, not real telemetry. */
export interface MissionDayTelemetry {
  missionDay: number;
  heartRate: number;
  systolic: number;
  diastolic: number;
  glucose: number;
  temperature: number;
  sleepHours: number;
  moodScore: number;
  aredMinutes: number;
  dailyRadiationMsv: number;
  cumulativeRadiationMsv: number;
  /** Mean PVT reaction time, ms. Measured every third day; null otherwise. */
  pvtMeanMs: number | null;
  hydrationLiters: number;
  /** Weekly symptom check; null on days without a scheduled check. */
  symptoms: SymptomValue | null;
  /** Minutes after 00:00 UTC that the morning vitals were taken. */
  vitalsMinuteOfDay: number;
}

/** A value as the engines see it for one metric on one day, after merging manual entries. */
export interface MetricReading {
  metricId: MetricId;
  missionDay: number;
  value: MeasurementValue;
  recordedAt: string;
  source: MeasurementSource;
  measurementId?: string;
  notes?: string;
  glucoseContext?: GlucoseContext;
}

/** Per-day effective readings. A missing key means no reading that day. */
export type EffectiveDay = {
  missionDay: number;
  readings: Partial<Record<MetricId, MetricReading>>;
  /** Daily radiation dose derived from the (possibly rebased) cumulative dosimeter series. */
  dailyRadiationMsv: number;
};

export type ThresholdProvenance = "supplied-prototype" | "astra-assumption" | "mission-plan";

export interface RuleTrace {
  ruleId: string;
  status: HealthStatus;
  description: string;
  observed: string;
  threshold: string;
  provenance: ThresholdProvenance;
}

export type Freshness = "current" | "stale" | "missing";

export interface SourceRef {
  label: string;
  url: string;
}

export type BasisProvenance = ThresholdProvenance | "scenario-simulation" | "routine";

/** Why a recommendation exists: which indicator, which configured rule, and what (if anything) backs it. */
export interface RecommendationBasis {
  indicator: string;
  rule: string;
  provenance: BasisProvenance;
  reference: SourceRef | null;
  referenceNote: string;
}

export interface MetricDiagnostic {
  metricId: MetricId;
  status: HealthStatus;
  /** What changed. */
  summary: string;
  /** Why it might matter in space. */
  explanation: string;
  /** What to do next according to the approved protocol. */
  recommendedNextStep: string;
  evaluatedAt: string;
  missionDay: number;
  latest: MetricReading | null;
  previous: MetricReading | null;
  freshness: Freshness;
  /** Consecutive days (ending on the evaluated day) with the same non-nominal status. */
  persistenceDays: number;
  /** Rules that produced the status. Empty when nominal with no notes. */
  triggeredRules: RuleTrace[];
  /** Short notes that do not change status, e.g. "above reference, below caution". */
  notes: string[];
  basis: RecommendationBasis;
}

export type AdvisorySource = "scenario" | "donki";

export type HazardLevel = "WATCH" | "WARNING" | "ALL CLEAR";

export interface ProtectiveAction {
  id: string;
  text: string;
  systems: BodySystemId[];
  basis: RecommendationBasis;
}

export interface SystemRelation {
  id: BodySystemId;
  relation: "Direct" | "Indirect" | "Operational";
  text: string;
  indicators: MetricId[];
}

/** Environmental hazard assessment. Never a dose and never merged into health status. */
export interface EnvironmentAdvisory {
  id: string;
  source: AdvisorySource;
  /** CAUTION for WATCH or WARNING; NOMINAL for ALL CLEAR. */
  severity: HealthStatus;
  level: HazardLevel;
  phase: string;
  title: string;
  summary: string;
  whyItMatters: string;
  nextStep: string;
  provenanceLabel: string;
  startTime?: string;
  missionDayRange?: [number, number];
  relations: SystemRelation[];
  actions: ProtectiveAction[];
  basis: RecommendationBasis;
}

export type BodySystemId =
  | "neuroOcular"
  | "cardiovascular"
  | "musculoskeletal"
  | "immuneRadiation"
  | "metabolicCircadian";

export const BODY_SYSTEM_IDS: readonly BodySystemId[] = [
  "neuroOcular",
  "cardiovascular",
  "musculoskeletal",
  "immuneRadiation",
  "metabolicCircadian",
] as const;

export type TrendTabId =
  | "heartRate"
  | "bloodPressure"
  | "bloodGlucose"
  | "bodyTemperature"
  | "sleepMood"
  | "ared"
  | "radiation"
  | "pvtHydration";

export interface BodySystemDefinition {
  id: BodySystemId;
  name: string;
  shortName: string;
  metrics: MetricId[];
  whyItMatters: string;
  inSpace: string[];
  relevantMeasurements: string[];
  selfCheckSteps: string[];
  deviceRequired: string;
  caveat: string;
  trendTab: TrendTabId;
  nominalNextStep: string;
}

export interface BodySystemState {
  id: BodySystemId;
  status: HealthStatus;
  diagnostics: MetricDiagnostic[];
  advisories: EnvironmentAdvisory[];
  observations: string[];
  recommendedNextStep: string;
}

export interface MetricGuidance {
  metricId: MetricId;
  name: string;
  shortName: string;
  unit: string;
  whatItMeasures: string;
  whyItMatters: string;
  deviceRequired: string;
  howToMeasure: string[];
  microgravityEffects: string;
  whenToRepeat: string;
  whatToRecord: string[];
  nextStep: string;
  trendTab: TrendTabId | null;
  system: BodySystemId;
  /** Scientific context for this indicator, or null when none was verified. Context never validates a threshold. */
  reference: SourceRef | null;
}

export type GuidanceRef =
  | { kind: "metric"; id: MetricId }
  | { kind: "system"; id: BodySystemId };

export type TaskCategory = "exercise" | "cognitive" | "hydration" | "sleep" | "monitoring" | "radiation";

export interface CountermeasureTaskDefinition {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  targetLabel: string;
  xp: number;
  linkedMetric?: MetricId;
  guidance: GuidanceRef;
  /** Shown when the task was missed the previous day. */
  missedPrompt: string;
  /** Morning tasks are already done on a scenario's focus day. */
  timing: "morning" | "day" | "evening";
  /** Scheduled every N days starting on day 1. Omitted means daily. */
  everyNDays?: number;
  /** Body systems this countermeasure supports. */
  systems: BodySystemId[];
}

export type CompletionVia = "checkbox" | "measurement" | "seed";

export interface TaskCompletionRecord {
  taskId: string;
  missionDay: number;
  completed: boolean;
  /** ISO UTC; present when completed. */
  completedAt?: string;
  via: CompletionVia;
}

/** View model consumed by the checklist (matches PROMPT.md §7.1 CountermeasureTask). */
export interface CountermeasureTask {
  id: string;
  title: string;
  description: string;
  category: string;
  targetLabel: string;
  xp: number;
  completed: boolean;
  completedAt?: string;
  via?: CompletionVia;
  linkedMetric?: MetricId;
  guidance: GuidanceRef;
  systems: BodySystemId[];
}

export type FollowUpKind = "metric" | "missed-task" | "advisory";

/** One ordered step of a protective action sequence. Completion is tracked per step. */
export interface FollowUpStep {
  id: string;
  text: string;
  systems: BodySystemId[];
  basis: RecommendationBasis;
  completed: boolean;
  completedAt?: string;
  /** Other alerts this step also addresses, e.g. the dosimeter CAUTION during an SEP. */
  alsoResolves?: string;
}

export interface FollowUpAction {
  id: string;
  kind: FollowUpKind;
  /** Body systems the follow-up relates to. */
  systems: BodySystemId[];
  severity: HealthStatus;
  title: string;
  reason: string;
  action: string;
  guidance: GuidanceRef;
  basis: RecommendationBasis;
  completed: boolean;
  completedAt?: string;
  /** Present for protective action sequences: ordered steps, highest priority first. */
  steps?: FollowUpStep[];
}

export type ScenarioId = "nominal" | "cardiovascular" | "sep";

export interface ScenarioEvent {
  id: string;
  title: string;
  startDay: number;
  endDay: number;
  kind: "health" | "environment" | "operations";
  description: string;
  /** Metrics this event is annotated on in trend charts. */
  metrics: MetricId[];
}

export interface ScenarioDefinition {
  id: ScenarioId;
  code: "A" | "B" | "C";
  name: string;
  summary: string;
  focusDay: number;
  /** Mission days where the scenario's story is visible; null for the nominal scenario. */
  storyDays: [number, number] | null;
  events: ScenarioEvent[];
}

export type TrendWindow = 7 | 30 | 90 | 180;

export interface MissionSettings {
  scenarioId: ScenarioId;
  selectedDay: number;
  aredTargetMinutes: number;
  hydrationTargetLiters: number;
  trendWindow: TrendWindow;
  trendTab: TrendTabId;
}

export interface ReadinessComponent {
  id: "tasks" | "weekly" | "followUps" | "freshness";
  label: string;
  /** Maximum points this part can add to the score. */
  weight: number;
  /** 0 to 1. */
  fraction: number;
  /** weight × fraction, unrounded. */
  points: number;
  detail: string;
}

export interface ReadinessSummary {
  score: number;
  /** The four weighted parts that add up to the score, in display order. */
  components: ReadinessComponent[];
  taskCompletion: number;
  weeklyAdherence: number;
  followUpCompletion: number;
  dataFreshness: number;
  completedTasks: number;
  totalTasks: number;
  totalXp: number;
  todayXp: number;
  streakDays: number;
  message: string;
}

export interface OverallStatus {
  status: HealthStatus;
  counts: Record<HealthStatus, number>;
  advisoryCount: number;
  drivers: MetricDiagnostic[];
}

/* ---------------- NASA DONKI ---------------- */

export type DonkiEventType = "FLR" | "SEP" | "CME" | "NOTIFICATION";
/**
 * live: received in a successful response during this browser session.
 * cached: received in an earlier session and read back from localStorage.
 * archived: bundled historical DONKI records (2024-05-08 to 2024-05-16).
 */
export type DonkiDataSource = "live" | "cached" | "archived";
export type DonkiHost = "api.nasa.gov" | "ccmc.gsfc.nasa.gov";

export interface DonkiDetail {
  label: string;
  value: string;
}

export interface DonkiEvent {
  id: string;
  type: DonkiEventType;
  title: string;
  startTime?: string;
  peakTime?: string;
  endTime?: string;
  severity?: string;
  description: string;
  sourceUrl?: string;
  dataSource: DonkiDataSource;
  details: DonkiDetail[];
  linkedIds: string[];
}

export interface DonkiAttempt {
  host: DonkiHost;
  /** HTTP status when a response arrived; absent for network errors and timeouts. */
  status?: number;
  error?: string;
}

export interface DonkiEndpointResult {
  type: DonkiEventType;
  ok: boolean;
  host?: DonkiHost;
  count: number;
  error?: string;
  attempts: DonkiAttempt[];
}

/** What the console currently holds for one DONKI event type. */
export interface DonkiTypeState {
  type: DonkiEventType;
  events: DonkiEvent[];
  source: DonkiDataSource;
  /** When this data was retrieved from NASA (archive: when the bundle was built). */
  retrievedAt: string | null;
  host: DonkiHost | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  /** Result of the most recent request for this type in this session; null when none was made. */
  lastAttempt: { at: string; ok: boolean; error?: string; attempts: DonkiAttempt[] } | null;
}

/**
 * LIVE: every type was received in this session.
 * PARTIAL: some types were received in this session.
 * CACHED: nothing received this session; showing data saved by an earlier session.
 * ARCHIVED: showing the bundled 2024 archive only.
 * UNAVAILABLE: the feed cannot be reached now (offline, or every request failed);
 * whatever is shown is cached or archived and labelled as such.
 */
export type SpaceWeatherMode = "LIVE" | "PARTIAL" | "CACHED" | "ARCHIVED" | "UNAVAILABLE";
