/**
 * Deterministic self-correction prompts.
 *
 * Turns non-nominal diagnostics, environment advisories and yesterday's missed
 * tasks into follow-up actions that point at pre-approved guidance. It never
 * changes medication, exercise intensity or clinical treatment.
 */
import { BODY_SYSTEMS } from "../data/bodySystems";
import { basisFor } from "./basis";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import {
  ALL_METRIC_IDS,
  BODY_SYSTEM_IDS,
  STATUS_RANK,
  type CountermeasureTask,
  type CountermeasureTaskDefinition,
  type EnvironmentAdvisory,
  type FollowUpAction,
  type GuidanceRef,
  type HealthStatus,
  type MetricDiagnostic,
  type MetricId,
  type RecommendationBasis,
} from "../types/health";

/** Completed follow-ups by mission day, then follow-up id (ISO timestamp). */
export type FollowUpLog = Record<number, Record<string, string>>;

const KIND_ORDER: Record<FollowUpAction["kind"], number> = { advisory: 0, metric: 1, "missed-task": 2 };

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

  // An active scenario hazard owns the dosimeter follow-up: it becomes a step of the
  // protective sequence instead of a separate, overlapping action.
  const hazardOwnsDose = args.advisories.some((a) => a.source === "scenario" && a.level !== "ALL CLEAR");

  for (const id of ALL_METRIC_IDS) {
    const d = args.diagnostics[id];
    if (d.status === "NOMINAL") continue;
    if (id === "radiation" && hazardOwnsDose) continue;
    const fid = `metric:${id}`;
    out.push({
      id: fid,
      kind: "metric",
      systems: BODY_SYSTEM_IDS.filter((sys) => BODY_SYSTEMS[sys].metrics.includes(id)),
      severity: d.status,
      title: `Follow up on ${METRIC_GUIDANCE[id].name.toLowerCase()}`,
      reason: d.summary,
      action: d.recommendedNextStep,
      guidance: { kind: "metric", id },
      basis: d.basis,
      completed: Boolean(done[fid]),
      ...(done[fid] ? { completedAt: done[fid] } : {}),
    });
  }

  // One prioritised sequence per hazard assessment, not one follow-up per action.
  for (const a of args.advisories) {
    const dose = args.diagnostics.radiation;
    const steps = a.actions.map((act) => {
      const sid = `hazard:${a.source}:${act.id}`;
      const absorbs = hazardOwnsDose && a.source === "scenario" && /dosimeter|record/.test(act.id) && dose.status !== "NOMINAL";
      return {
        id: sid,
        text: act.text,
        systems: act.systems,
        basis: act.basis,
        completed: Boolean(done[sid]),
        ...(done[sid] ? { completedAt: done[sid] } : {}),
        ...(absorbs ? { alsoResolves: `Dosimeter ${dose.status}: ${dose.summary.split(". ")[0]}.` } : {}),
      };
    });
    const firstOpen = steps.find((x) => !x.completed);
    const doneCount = steps.filter((x) => x.completed).length;
    out.push({
      id: `sequence:${a.source}:${a.level}`,
      kind: "advisory",
      systems: [...new Set(steps.flatMap((x) => x.systems))],
      severity: a.severity,
      title: `${a.level === "ALL CLEAR" ? "Post-event steps" : "Protective action sequence"}: ${a.title}`,
      reason: `${a.summary} ${doneCount} of ${steps.length} steps done.`,
      action: firstOpen ? `Step ${steps.indexOf(firstOpen) + 1} of ${steps.length}: ${firstOpen.text}` : "All steps in this sequence are done.",
      guidance: { kind: "system", id: "immuneRadiation" },
      basis: firstOpen?.basis ?? a.basis,
      completed: steps.length > 0 && doneCount === steps.length,
      steps,
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
        systems: def.systems,
        severity: "NOMINAL",
        title: `Missed yesterday: ${t.title}`,
        reason: `"${t.title}" was not completed on day ${args.day - 1}.`,
        action: def.missedPrompt,
        guidance: def.guidance,
        basis: basisFor(`Countermeasure task: ${t.title}`, `Not marked complete on mission day ${args.day - 1}`, "mission-plan", null, "Demo mission plan. Example task, not a NASA prescription."),
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
  basis: RecommendationBasis | null;
}

/** The single most important current action for the readiness banner. */
export function mostImportantAction(
  followUps: readonly FollowUpAction[],
  tasks: readonly CountermeasureTask[],
  day: number,
): PrimaryAction {
  const open = followUps.find((f) => !f.completed && f.kind !== "missed-task") ?? followUps.find((f) => !f.completed);
  if (open) return { text: open.action, severity: open.severity, guidance: open.guidance, source: "follow-up", basis: open.basis };
  const task = tasks.find((t) => !t.completed);
  if (task)
    return {
      text: `Complete "${task.title}" (${task.targetLabel}).`,
      severity: "NOMINAL",
      guidance: task.guidance,
      source: "task",
      basis: basisFor(`Countermeasure task: ${task.title}`, `Scheduled for mission day ${day}`, "mission-plan", null, "Demo mission plan. Example task, not a NASA prescription."),
    };
  return { text: `All checks and countermeasures are complete for mission day ${day}.`, severity: "NOMINAL", guidance: null, source: "none", basis: null };
}
