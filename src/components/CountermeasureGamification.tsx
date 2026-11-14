import { BookOpen, ChevronDown, Flame, Plus, Trophy } from "lucide-react";
import { COUNTERMEASURES } from "../config/thresholds";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import { useToast } from "../hooks/useToast";
import { useUiActions } from "../hooks/useUi";
import type { CountermeasureTask } from "../types/health";
import { formatLocalDateTime, padDay } from "../utils/dates";
import { percent } from "../utils/formatting";
import { Panel } from "./shared/Panel";
import { FollowUpCard } from "./shared/FollowUpCard";
import { ReadinessBreakdown } from "./shared/ReadinessBreakdown";

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150 ${checked ? "border-nominal bg-nominal" : "border-line-strong bg-space"}`}
    >
      <svg viewBox="0 0 16 16" className="t-check h-3.5 w-3.5" data-checked={checked}>
        <path d="M3.5 8.4l3 3 6-6.6" fill="none" stroke="#060B14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const VIA_LABEL: Record<NonNullable<CountermeasureTask["via"]>, string> = {
  seed: "Synthetic history",
  checkbox: "Marked by you",
  measurement: "From logged measurement",
};

function TaskRow({ task, day }: { task: CountermeasureTask; day: number }) {
  const store = useMissionStore();
  const toast = useToast();
  const { openLog, openGuidance } = useUiActions();

  const toggle = () => {
    const next = !task.completed;
    const r = store.setTaskCompletion(day, task.id, next);
    toast({
      tone: r.persisted ? "success" : "warning",
      title: next ? `${task.title}: complete` : `${task.title}: marked not complete`,
      body: next ? `+${task.xp} XP for day ${day}. XP is counted once per task per day.` : `${task.xp} XP removed for day ${day}.`,
      action: { label: "Undo", onClick: () => store.setTaskCompletion(day, task.id, !next) },
    });
  };

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        onClick={toggle}
        className="-m-2 flex min-h-[44px] flex-1 items-start gap-3 rounded-tile p-2 text-left hover:bg-raised/60"
      >
        <CheckBox checked={task.completed} />
        <span className="min-w-0 flex-1">
          <span className={`block text-base font-semibold ${task.completed ? "text-ink-2" : "text-ink"}`}>{task.title}</span>
          <span className="mt-0.5 block text-sm text-ink-2">{task.description}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-3">
            <span>Target: {task.targetLabel}</span>
            {task.completed && task.via ? (
              <span>
                {VIA_LABEL[task.via]}
                {task.completedAt ? `, marked ${formatLocalDateTime(task.completedAt)} (real time)` : ""}
              </span>
            ) : null}
          </span>
        </span>
        <span className={`num shrink-0 text-sm font-medium ${task.completed ? "text-nominal" : "text-ink-2"}`}>+{task.xp}&nbsp;XP</span>
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        {task.linkedMetric ? (
          <button type="button" className="btn btn-ghost min-h-[32px] px-2 text-xs" onClick={() => openLog({ metricId: task.linkedMetric!, day })} aria-label={`Log measurement for ${task.title}`}>
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Log
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost min-h-[32px] px-2 text-xs" onClick={() => openGuidance(task.guidance)} aria-label={`Guidance for ${task.title}`}>
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
          Guide
        </button>
      </div>
    </li>
  );
}

export function CountermeasureGamification() {
  const { tasks, readiness, day, followUps } = useMissionModel();
  const openFollowUps = followUps.filter((f) => !f.completed).length;

  return (
    <Panel
      id="countermeasures"
      title="Today's countermeasures"
      subtitle={
        <>
          Mission day <span className="num">{padDay(day)}</span>. Example tasks for the demo plan, not NASA prescriptions. Completion never changes a health status.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-tile border border-line bg-line sm:grid-cols-4">
        <div className="bg-panel px-3 py-2.5">
          <p className="label">Daily completion</p>
          <p className="num mt-0.5 text-lg font-semibold text-ink">{percent(readiness.taskCompletion)}</p>
          <div className="mt-1 h-1 rounded-full bg-line" aria-hidden="true">
            <div className="h-full rounded-full bg-nominal transition-[width] duration-300" style={{ width: percent(readiness.taskCompletion) }} />
          </div>
        </div>
        <div className="bg-panel px-3 py-2.5">
          <p className="label">Completed</p>
          <p className="num mt-0.5 text-lg font-semibold text-ink">
            {readiness.completedTasks}
            <span className="text-ink-3">/{readiness.totalTasks}</span>
          </p>
        </div>
        <div className="bg-panel px-3 py-2.5">
          <p className="label flex items-center gap-1">
            <Flame aria-hidden="true" className="h-3.5 w-3.5" />
            Current streak
          </p>
          <p className="num mt-0.5 text-lg font-semibold text-ink">
            {readiness.streakDays}
            <span className="text-sm text-ink-3"> days</span>
          </p>
        </div>
        <div className="bg-panel px-3 py-2.5">
          <p className="label flex items-center gap-1">
            <Trophy aria-hidden="true" className="h-3.5 w-3.5" />
            Readiness XP
          </p>
          <p className="num mt-0.5 text-lg font-semibold text-ink">
            {readiness.totalXp.toLocaleString()}
            <span className="text-sm text-nominal"> +{readiness.todayXp}</span>
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-2" aria-live="polite">
        {readiness.message}
      </p>
      <p className="mt-0.5 text-2xs text-ink-3">XP, streak and completion include synthetic adherence history for earlier days, plus anything you mark.</p>
      <details className="group mt-2 rounded-tile border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-ink">Readiness </span>
            <span className="num font-semibold text-ink">{readiness.score}/100</span>
            <span className="text-ink-2">: how it relates to today&apos;s {percent(readiness.taskCompletion)}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="border-t border-line px-3 py-3">
          <p className="mb-3 text-sm text-ink-2">Today&apos;s tasks are half of the score. The rest comes from the last seven days, follow-ups and fresh measurements. It is an engagement indicator, not a medical clearance.</p>
          <ReadinessBreakdown readiness={readiness} />
        </div>
      </details>

      <ul className="mt-2 divide-y divide-line" aria-label={`Countermeasure tasks for day ${day}`}>
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} day={day} />
        ))}
      </ul>
      <p className="mt-1 text-2xs text-ink-3">
        A day counts toward the streak when at least {Math.round(COUNTERMEASURES.streakMinCompletion * 100)}% of its tasks are complete (ASTRA assumption). Days before the scenario day carry synthetic adherence history.
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="label">Follow-up actions {openFollowUps ? <span className="text-caution">({openFollowUps} open)</span> : null}</h3>
        <p className="mt-0.5 text-sm text-ink-2">Pre-approved next steps for anything missed yesterday or outside its configured range today.</p>
        {followUps.length === 0 ? (
          <p className="mt-2 rounded-tile border border-dashed border-line-strong px-3 py-3 text-sm text-ink-2">No follow-ups for day {day}. Every indicator is inside its configured range and yesterday's tasks were completed.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {followUps.map((f) => (
              <FollowUpCard key={f.id} f={f} day={day} />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
