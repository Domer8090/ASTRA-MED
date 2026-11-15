/**
 * Spoken answers for Tuesday's everyday questions, built only from engine
 * output (diagnostics, tasks, advisories, readiness). Pure functions: no
 * thresholds are compared here and no status is decided here.
 */
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type { CountermeasureTask, EnvironmentAdvisory, MetricDiagnostic, ReadinessSummary } from "../types/health";
import { formatWithUnit } from "../utils/formatting";

/** When a reading was taken, as said aloud: "today at 07:40", "yesterday", "on day 112". */
export function spokenWhen(missionDay: number, iso: string, today: number): string {
  const t = Date.parse(iso);
  const time = Number.isNaN(t) ? "" : ` at ${String(new Date(t).getUTCHours()).padStart(2, "0")}:${String(new Date(t).getUTCMinutes()).padStart(2, "0")}`;
  if (missionDay === today) return `today${time}`;
  if (missionDay === today - 1) return "yesterday";
  return `on day ${missionDay}`;
}

/** "Is my heart rate normal?", "What's my blood pressure?", "Why is my temperature critical?" */
export function readingAnswer(d: MetricDiagnostic, today = d.latest?.missionDay ?? 0): string {
  const name = METRIC_GUIDANCE[d.metricId].shortName.toLowerCase();
  if (!d.latest) return `I don't have a ${name} reading yet. Measure it, tell me the number, and I'll check it for you.`;
  const value = formatWithUnit(d.metricId, d.latest.value);
  const when = spokenWhen(d.latest.missionDay, d.latest.recordedAt, today);
  if (d.status === "NOMINAL") return `Your ${name} was ${value} ${when}. That's NOMINAL, right inside your range. ${d.recommendedNextStep}`;
  return `Your ${name} was ${value} ${when}, and that's ${d.status}. ${d.summary} Here's what to do: ${d.recommendedNextStep}`;
}

/** Said right after a reading is saved by voice. */
export function loggedAnswer(d: MetricDiagnostic): string {
  const name = METRIC_GUIDANCE[d.metricId].shortName.toLowerCase();
  if (!d.latest) return `Got it, your ${name} is saved.`;
  const value = formatWithUnit(d.metricId, d.latest.value);
  if (d.status === "NOMINAL") return `Got it. ${value} for your ${name}, saved. That's NOMINAL, right inside your range.`;
  return `Saved ${value} for your ${name}. That's ${d.status}. ${d.summary} Here's what to do: ${d.recommendedNextStep}`;
}

/** "What's left on my checklist?", "What should I do next?" */
export function tasksAnswer(tasks: readonly CountermeasureTask[], primaryAction: string): string {
  const left = tasks.filter((t) => !t.completed);
  if (!tasks.length) return `Nothing is scheduled today. The most important thing now: ${primaryAction}`;
  if (!left.length) return `You've done all ${tasks.length} tasks today. Nice work. The most important thing now: ${primaryAction}`;
  const names = left.map((t) => t.title);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `You've got ${left.length} of ${tasks.length} tasks left: ${list}. The most important thing now: ${primaryAction}`;
}

/** "Is there a solar storm?", "Is it safe outside?", "Any radiation alert?" */
export function weatherAnswer(advisories: readonly EnvironmentAdvisory[], feedLabel: string): string {
  const note = "Space weather is an environmental hazard, not your personal dose; your dosimeter reading is the personal number.";
  if (!advisories.length) return `No space-weather advisory today. The space-weather feed is ${feedLabel}. ${note}`;
  const list = advisories.map((a) => `${a.title}, level ${a.level}`).join("; ");
  return `${advisories.length === 1 ? "One advisory" : `${advisories.length} advisories`} today: ${list}. Follow the protective actions in your action queue. ${note}`;
}

/** "Can I talk to the ground?", "What's the signal delay?" */
export function commsAnswer(linkUp: boolean, lightMinutes: number): string {
  const delay = `A message between Earth and Mars takes about ${Math.round(lightMinutes)} minutes one way today, so a question and answer take about ${Math.round(lightMinutes * 2)} minutes.`;
  return linkUp
    ? `The ground link is up. ${delay} You can message the medical officer from the action queue.`
    : `There's no ground link right now. I answer from onboard rules, and you can still write a message to the medical officer; it is sent when the link returns. ${delay}`;
}

/** "What day is it?", "How many days are left?" */
export function timeAnswer(day: number, totalDays: number, shipTime: string): string {
  return `It's day ${day} of ${totalDays}, ${shipTime} ship time. ${totalDays - day} days to go.`;
}

/** "What's my plan score?", "What's my streak?" */
export function readinessAnswer(r: ReadinessSummary): string {
  return `Your plan score is ${r.score} out of 100, with ${r.completedTasks} of ${r.totalTasks} tasks done today and a ${r.streakDays}-day streak. ${r.message} The plan score never changes a health status.`;
}

/** Task title words a crew member might use, for "I finished my workout". */
const TASK_WORDS: [RegExp, RegExp][] = [
  [/\b(workout|exercise|ared|training|gym|weights)\b/i, /ared|exercise|strength/i],
  [/\b(water|hydration|drinking|fluids?)\b/i, /hydration/i],
  [/\b(sleep\s*log|logged\s+my\s+sleep)\b/i, /sleep/i],
  [/\b(check[- ]?in|health\s+check)\b/i, /check-in|check in/i],
  [/\b(radiation|dosimeter)\b/i, /radiation/i],
  [/\b(wind[- ]?down|blue[- ]?light|screens?)\b/i, /wind-down|blue-light/i],
  [/\b(reaction|pvt|cognitive)\b/i, /pvt|reaction/i],
];

/** The task a sentence like "I finished my workout" refers to, if any. */
export function taskMentioned(text: string, tasks: readonly CountermeasureTask[]): CountermeasureTask | undefined {
  for (const [spoken, title] of TASK_WORDS) {
    if (!spoken.test(text)) continue;
    const task = tasks.find((t) => title.test(t.title));
    if (task) return task;
  }
  return undefined;
}
