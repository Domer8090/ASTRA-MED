/**
 * Plain-text health summary for the flight surgeon. Built on the device from
 * engine output; nothing is sent anywhere. The crew chooses to copy or save it
 * and pass it on through the mission's own channels.
 */
import { BODY_SYSTEMS } from "../data/bodySystems";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type {
  BodySystemId,
  BodySystemState,
  EffectiveDay,
  EnvironmentAdvisory,
  FollowUpAction,
  MetricDiagnostic,
  MetricId,
  OverallStatus,
  ReadinessSummary,
  ScenarioDefinition,
} from "../types/health";
import { PRIMARY_METRIC_IDS } from "../types/health";
import { formatMetricValue, METRIC_UNITS } from "../utils/formatting";
import type { TrendWatch } from "./trendEngine";

export interface ReportInput {
  day: number;
  scenario: ScenarioDefinition;
  overall: OverallStatus;
  systems: Record<BodySystemId, BodySystemState>;
  diagnostics: Record<MetricId, MetricDiagnostic>;
  trends: readonly TrendWatch[];
  advisories: readonly EnvironmentAdvisory[];
  followUps: readonly FollowUpAction[];
  readiness: ReadinessSummary;
  days: readonly EffectiveDay[];
  generatedAt: string;
  signalDelayMinutes: number;
}

const WINDOW = 7;

function range(days: readonly EffectiveDay[], metric: MetricId, day: number): string {
  const values: string[] = [];
  for (let d = Math.max(1, day - WINDOW + 1); d <= day; d++) {
    const r = days[d - 1]?.readings[metric];
    if (r) values.push(formatMetricValue(metric, r.value));
  }
  return values.length ? values.join(", ") : "no readings";
}

export function buildSurgeonReport(i: ReportInput): string {
  const L: string[] = [];
  const push = (...lines: string[]) => L.push(...lines);
  const manual = PRIMARY_METRIC_IDS.some((m) => i.diagnostics[m].latest?.source === "manual");

  push(
    "ASTRA-MED HEALTH SUMMARY FOR THE FLIGHT SURGEON",
    `Mission day ${i.day}. Generated ${i.generatedAt} (UTC) on the crew device.`,
    `Scenario: ${i.scenario.code}, ${i.scenario.name}.`,
    `Data: ${manual ? "synthetic demo telemetry plus crew entries marked MANUAL" : "SYNTHETIC demo telemetry, not real astronaut data"}.`,
    "Thresholds are prototype demonstration ranges, not NASA flight rules.",
    `Earth–Mars one-way signal delay today: ${i.signalDelayMinutes.toFixed(1)} min.`,
    "",
    `OVERALL STATUS: ${i.overall.status} (${i.overall.counts.NOMINAL} nominal, ${i.overall.counts.CAUTION} caution, ${i.overall.counts.CRITICAL} critical)`,
    "",
    "BODY SYSTEMS",
  );
  for (const id of Object.keys(BODY_SYSTEMS) as BodySystemId[]) push(`- ${BODY_SYSTEMS[id].name}: ${i.systems[id].status}`);

  const flagged = Object.values(i.diagnostics).filter((d) => d.status !== "NOMINAL");
  push("", "INDICATORS OUTSIDE THE CONFIGURED RANGE");
  if (!flagged.length) push("- None.");
  for (const d of flagged) {
    push(`- ${METRIC_GUIDANCE[d.metricId].name}: ${d.status}. ${d.summary}`);
    for (const r of d.triggeredRules) push(`  Rule: ${r.description}, observed ${r.observed}, threshold ${r.threshold} (${r.provenance}).`);
    if (d.persistenceDays > 1) push(`  Persisting for ${d.persistenceDays} days.`);
    push(`  Crew step: ${d.recommendedNextStep}`);
  }

  push("", "TREND WATCH (projections, not diagnoses)");
  if (!i.trends.length) push("- None.");
  for (const t of i.trends) push(`- ${t.text}`);

  push("", "ENVIRONMENTAL HAZARDS (not personal dose)");
  if (!i.advisories.length) push("- None active.");
  for (const a of i.advisories) push(`- ${a.level}, ${a.phase}: ${a.summary} [${a.provenanceLabel}]`);

  push("", "FOLLOW-UP ACTIONS");
  if (!i.followUps.length) push("- None.");
  for (const f of i.followUps) {
    push(`- [${f.completed ? "done" : "open"}] ${f.title}: ${f.action}`);
    for (const s of f.steps ?? []) push(`    [${s.completed ? "done" : "open"}] ${s.text}`);
  }

  push("", `LAST ${WINDOW} DAYS (oldest first)`);
  for (const m of PRIMARY_METRIC_IDS) push(`- ${METRIC_GUIDANCE[m].name} (${METRIC_UNITS[m]}): ${range(i.days, m, i.day)}`);

  push(
    "",
    `COUNTERMEASURES: ${i.readiness.completedTasks} of ${i.readiness.totalTasks} tasks done today; readiness ${i.readiness.score}/100 (engagement indicator, not a medical clearance).`,
    "",
    "Prepared by the crew with ASTRA-MED, a NASA Space Apps 2026 prototype. Not a medical device.",
  );
  return L.join("\n");
}
