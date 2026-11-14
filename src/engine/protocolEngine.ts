/**
 * Deterministic self-correction prompts.
 *
 * Turns non-nominal diagnostics, environment advisories and yesterday's missed
 * tasks into follow-up actions that point at pre-approved guidance. It never
 * changes medication, exercise intensity or clinical treatment.
 */
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import {
  ALL_METRIC_IDS,
  STATUS_RANK,
  type CountermeasureTask,
  type CountermeasureTaskDefinition,
  type EnvironmentAdvisory,
  type FollowUpAction,
  type GuidanceRef,
  type HealthStatus,
  type MetricDiagnostic,
  type MetricId,
} from "../types/health";

/** Completed follow-ups by mission day, then follow-up id (ISO timestamp). */
export type FollowUpLog = Record<number, Record<string, string>>;

const KIND_ORDER: Record<FollowUpAction["kind"], number> = { metric: 0, advisory: 1, "missed-task": 2 };

export function buildFollowUps(args: {
  day: number;
  diagnostics: Record<MetricId, MetricDiagnostic>;
  advisories: readonly EnvironmentAdvisory[];
  yesterdayTasks: readonly CountermeasureTask[];
  taskDefinitions: readonly CountermeasureTaskDefinition[];
  log: FollowUpLog;
}): FollowUpAction[] {
  const done = args.log[args.day] ?? {};
  const out: FollowUpAction[] = [];

  for (const id of ALL_METRIC_IDS) {
    const d = args.diagnostics[id];
    if (d.status === "NOMINAL") continue;
    const fid = `metric:${id}`;
    out.push({
      id: fid,
      kind: "metric",
      severity: d.status,
      title: `Follow up on ${METRIC_GUIDANCE[id].name.toLowerCase()}`,
      reason: d.summary,
      action: d.recommendedNextStep,
      guidance: { kind: "metric", id },
      completed: Boolean(done[fid]),
      ...(done[fid] ? { completedAt: done[fid] } : {}),
    });
  }

  for (const a of args.advisories) {
    const fid = `advisory:${a.id}`;
    out.push({
      id: fid,
      kind: "advisory",
      severity: a.severity,
      title: a.title,
      reason: a.summary,
      action: a.nextStep,
      guidance: { kind: "system", id: "immuneRadiation" },
      completed: Boolean(done[fid]),
      ...(done[fid] ? { completedAt: done[fid] } : {}),
    });
  }

  if (args.day > 1) {
    for (const t of args.yesterdayTasks) {
      if (t.completed) continue;
      const def = args.taskDefinitions.find((x) => x.id === t.id);
      if (!def) continue;
      const fid = `missed:${t.id}`;
      out.push({
        id: fid,
        kind: "missed-task",
        severity: "NOMINAL",
        title: `Missed yesterday: ${t.title}`,
        reason: `"${t.title}" was not completed on day ${args.day - 1}.`,
        action: def.missedPrompt,
        guidance: def.guidance,
        completed: Boolean(done[fid]),
        ...(done[fid] ? { completedAt: done[fid] } : {}),
      });
    }
  }

  return out.sort((a, b) => STATUS_RANK[b.severity] - STATUS_RANK[a.severity] || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

export interface PrimaryAction {
  text: string;
  severity: HealthStatus;
  guidance: GuidanceRef | null;
  source: "follow-up" | "task" | "none";
}

/** The single most important current action for the readiness banner. */
export function mostImportantAction(
  followUps: readonly FollowUpAction[],
  tasks: readonly CountermeasureTask[],
  day: number,
): PrimaryAction {
  const open = followUps.find((f) => !f.completed && f.kind !== "missed-task") ?? followUps.find((f) => !f.completed);
  if (open) return { text: open.action, severity: open.severity, guidance: open.guidance, source: "follow-up" };
  const task = tasks.find((t) => !t.completed);
  if (task) return { text: `Complete "${task.title}" (${task.targetLabel}).`, severity: "NOMINAL", guidance: task.guidance, source: "task" };
  return { text: `All checks and countermeasures are complete for mission day ${day}.`, severity: "NOMINAL", guidance: null, source: "none" };
}
