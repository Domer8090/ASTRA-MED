/**
 * Countermeasure completion, XP, streaks and the prototype readiness score.
 *
 * The readiness score is an operational engagement indicator, NOT a medical
 * clearance. It never changes or hides a health status.
 *
 * XP is derived from completion records, so completing the same task twice on
 * the same mission day can never award XP twice.
 */
import { COUNTERMEASURES } from "../config/thresholds";
import { SCENARIOS } from "../data/scenarios";
import type {
  CountermeasureTask,
  CountermeasureTaskDefinition,
  EffectiveDay,
  FollowUpAction,
  MetricDiagnostic,
  MetricId,
  ReadinessComponent,
  ReadinessSummary,
  ScenarioId,
  TaskCompletionRecord,
} from "../types/health";
import { PRIMARY_METRIC_IDS } from "../types/health";
import { hashSeed, mulberry32 } from "../utils/prng";

/** User completion records by mission day, then task id. They override seeded history. */
export type CompletionLog = Record<number, Record<string, TaskCompletionRecord>>;

export interface ReadinessInput {
  scenarioId: ScenarioId;
  tasks: readonly CountermeasureTaskDefinition[];
  days: readonly EffectiveDay[];
  completions: CompletionLog;
  aredTargetMinutes: number;
  hydrationTargetLiters: number;
}

const SEED_ADHERENCE: Record<ScenarioId, number> = { nominal: 0.95, cardiovascular: 0.92, sep: 0.94 };

export function isScheduled(task: CountermeasureTaskDefinition, day: number): boolean {
  return task.everyNDays ? (day - 1) % task.everyNDays === 0 : true;
}

export function scheduledTasks(input: ReadinessInput, day: number): CountermeasureTaskDefinition[] {
  return input.tasks.filter((t) => isScheduled(t, day));
}

function numericReading(input: ReadinessInput, day: number, metric: MetricId): number | undefined {
  const r = input.days[day - 1]?.readings[metric];
  return r && typeof r.value === "number" ? r.value : undefined;
}

/** Synthetic adherence history. Deterministic per scenario, day and task. */
export function seededCompletion(input: ReadinessInput, day: number, task: CountermeasureTaskDefinition): boolean {
  const focus = SCENARIOS[input.scenarioId].focusDay;
  if (day === focus) return task.timing === "morning";
  switch (task.id) {
    case "ared-session": {
      const m = numericReading(input, day, "aredMinutes");
      return m !== undefined && m >= input.aredTargetMinutes;
    }
    case "hydration-check": {
      const h = numericReading(input, day, "hydration");
      return h !== undefined && h >= input.hydrationTargetLiters;
    }
    case "sleep-log":
      return input.days[day - 1]?.readings.sleep !== undefined;
    case "pvt-check":
      return input.days[day - 1]?.readings.pvt !== undefined;
    default: {
      const rand = mulberry32(hashSeed(`${input.scenarioId}:${day}:${task.id}`));
      return rand() < SEED_ADHERENCE[input.scenarioId];
    }
  }
}

export function tasksForDay(input: ReadinessInput, day: number): CountermeasureTask[] {
  const records = input.completions[day] ?? {};
  return scheduledTasks(input, day).map((t) => {
    const rec = records[t.id];
    const completed = rec ? rec.completed : seededCompletion(input, day, t);
    const via = rec ? rec.via : completed ? "seed" : undefined;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      targetLabel: t.targetLabel,
      xp: t.xp,
      completed,
      ...(rec?.completed && rec.completedAt ? { completedAt: rec.completedAt } : {}),
      ...(via ? { via } : {}),
      ...(t.linkedMetric ? { linkedMetric: t.linkedMetric } : {}),
      guidance: t.guidance,
      systems: t.systems,
    };
  });
}

export function dayCompletion(input: ReadinessInput, day: number): number {
  const tasks = tasksForDay(input, day);
  if (tasks.length === 0) return 1;
  return tasks.filter((t) => t.completed).length / tasks.length;
}

/** XP earned on one day: each completed task counts once. */
export function dayXp(input: ReadinessInput, day: number): number {
  return tasksForDay(input, day).reduce((sum, t) => sum + (t.completed ? t.xp : 0), 0);
}

export function totalXp(input: ReadinessInput, upToDay: number): number {
  let sum = 0;
  for (let d = 1; d <= upToDay; d++) sum += dayXp(input, d);
  return sum;
}

/**
 * Consecutive days meeting the streak threshold, ending on the selected day.
 * If the selected day is still in progress (below threshold) it does not break
 * the streak; counting starts from the day before.
 */
export function computeStreak(input: ReadinessInput, day: number): number {
  let streak = 0;
  let d = day;
  if (dayCompletion(input, d) < COUNTERMEASURES.streakMinCompletion) d--;
  for (; d >= 1; d--) {
    if (dayCompletion(input, d) >= COUNTERMEASURES.streakMinCompletion) streak++;
    else break;
  }
  return streak;
}

export function weeklyAdherence(input: ReadinessInput, day: number): number {
  const start = Math.max(1, day - 6);
  let sum = 0;
  for (let d = start; d <= day; d++) sum += dayCompletion(input, d);
  return sum / (day - start + 1);
}

/** Points available to each part of the readiness score. They add up to 100 (ASTRA assumption). */
export const READINESS_WEIGHTS = { tasks: 50, weekly: 20, followUps: 15, freshness: 15 } as const;

function message(score: number, completed: number, total: number): string {
  if (total > 0 && completed === total) return "Every scheduled countermeasure is complete for today.";
  if (score >= 85) return "Countermeasures are on track. Keep the routine going.";
  if (score >= 65) return `Good progress: ${completed} of ${total} tasks done. The rest are listed below.`;
  if (score >= 40) return "A few tasks are still open today. Start with the one at the top.";
  return "Today's plan is just starting. Open the first task to begin.";
}

export function computeReadiness(
  input: ReadinessInput,
  day: number,
  followUps: readonly FollowUpAction[],
  diagnostics: Record<MetricId, MetricDiagnostic>,
): ReadinessSummary {
  const tasks = tasksForDay(input, day);
  const completedTasks = tasks.filter((t) => t.completed).length;
  const taskCompletion = tasks.length ? completedTasks / tasks.length : 1;
  const weekly = weeklyAdherence(input, day);
  const followUpCompletion = followUps.length ? followUps.filter((f) => f.completed).length / followUps.length : 1;
  const fresh = PRIMARY_METRIC_IDS.filter((id) => diagnostics[id].freshness === "current").length / PRIMARY_METRIC_IDS.length;
  const followUpsDone = followUps.filter((f) => f.completed).length;
  const freshCount = PRIMARY_METRIC_IDS.filter((id) => diagnostics[id].freshness === "current").length;
  const part = (id: ReadinessComponent["id"], label: string, fraction: number, detail: string): ReadinessComponent => ({
    id,
    label,
    weight: READINESS_WEIGHTS[id],
    fraction,
    points: READINESS_WEIGHTS[id] * fraction,
    detail,
  });
  const components = [
    part("tasks", "Today's countermeasure tasks", taskCompletion, `${completedTasks} of ${tasks.length} done`),
    part("weekly", "7-day task adherence", weekly, `${Math.round(weekly * 100)}% average over the last ${Math.min(7, day)} days`),
    part("followUps", "Follow-up actions done", followUpCompletion, followUps.length ? `${followUpsDone} of ${followUps.length} done` : "none needed today, full points"),
    part("freshness", "Fresh required measurements", fresh, `${freshCount} of ${PRIMARY_METRIC_IDS.length} current`),
  ];
  const score = Math.round(components.reduce((sum, c) => sum + c.points, 0));
  return {
    score,
    components,
    taskCompletion,
    weeklyAdherence: weekly,
    followUpCompletion,
    dataFreshness: fresh,
    completedTasks,
    totalTasks: tasks.length,
    totalXp: totalXp(input, day),
    todayXp: dayXp(input, day),
    streakDays: computeStreak(input, day),
    message: message(score, completedTasks, tasks.length),
  };
}
