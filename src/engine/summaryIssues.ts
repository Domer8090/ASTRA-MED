/**
 * The four most important things for today, for the Summary. Pure: ranks what
 * the other engines already decided (status, trend watch, baseline drift,
 * advisories, tasks). It never compares a value with a threshold and never
 * changes a status.
 */
import type { CountermeasureTask, EnvironmentAdvisory, HealthStatus, MetricDiagnostic, MetricId } from "../types/health";
import type { BaselineDrift } from "./baselineEngine";
import type { TrendWatch } from "./trendEngine";

export type SummaryIssue =
  | { kind: "reading"; metricId: MetricId; status: HealthStatus }
  | { kind: "weather"; advisory: EnvironmentAdvisory }
  | { kind: "trend"; trend: TrendWatch }
  | { kind: "drift"; drift: BaselineDrift }
  | { kind: "tasks"; left: CountermeasureTask[]; total: number }
  | { kind: "allClear" };

export interface SummaryIssueInput {
  diagnostics: Record<MetricId, MetricDiagnostic>;
  metricIds: readonly MetricId[];
  advisories: readonly EnvironmentAdvisory[];
  trends: readonly TrendWatch[];
  drift: BaselineDrift;
  tasks: readonly CountermeasureTask[];
}

const RANK: Record<HealthStatus, number> = { CRITICAL: 2, CAUTION: 1, NOMINAL: 0 };

/**
 * Order: CRITICAL readings, CAUTION readings, an active space-weather
 * advisory, trend watches on readings not already listed, baseline drift,
 * tasks left today. With no flagged reading, an "all readings in range" card
 * comes first so the crew member sees the good news too.
 */
export function topIssues(input: SummaryIssueInput, max = 4): SummaryIssue[] {
  const out: SummaryIssue[] = [];
  const flagged = input.metricIds
    .filter((id) => input.diagnostics[id].status !== "NOMINAL")
    .sort((a, b) => RANK[input.diagnostics[b].status] - RANK[input.diagnostics[a].status]);
  if (!flagged.length) out.push({ kind: "allClear" });
  for (const id of flagged) out.push({ kind: "reading", metricId: id, status: input.diagnostics[id].status });
  const hazard = input.advisories.find((a) => a.level !== "ALL CLEAR");
  if (hazard) out.push({ kind: "weather", advisory: hazard });
  const listed = new Set(flagged);
  for (const trend of input.trends) if (!listed.has(trend.metricId)) out.push({ kind: "trend", trend });
  if (input.drift.state === "drift") out.push({ kind: "drift", drift: input.drift });
  const left = input.tasks.filter((t) => !t.completed);
  if (left.length) out.push({ kind: "tasks", left, total: input.tasks.length });
  return out.slice(0, max);
}
