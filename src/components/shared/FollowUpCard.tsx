import { BookOpen, RotateCcw } from "lucide-react";
import { useMissionStore } from "../../hooks/useMissionState";
import { useToast } from "../../hooks/useToast";
import { useUiActions } from "../../hooks/useUi";
import type { BodySystemId, FollowUpAction } from "../../types/health";
import { formatLocalDateTime } from "../../utils/dates";
import { BasisLine } from "./BasisLine";
import { InfoTip } from "./InfoTip";
import { StatusBadge } from "./StatusBadge";

interface Props {
  f: FollowUpAction;
  day: number;
  /** Highlight the steps that concern this system; the rest stay visible, dimmed. */
  focusSystem?: BodySystemId;
  compact?: boolean;
}

/** A follow-up action, or a protective sequence with ordered steps completed one at a time. */
export function FollowUpCard({ f, day, focusSystem, compact = false }: Props) {
  const store = useMissionStore();
  const toast = useToast();
  const { openGuidance } = useUiActions();
  const frame = f.completed ? "border-line" : f.severity === "CRITICAL" ? "border-critical/55" : f.severity === "CAUTION" ? "border-caution/50" : "border-line-strong";

  const toggle = (id: string, completed: boolean, label: string) => {
    const r = store.setFollowUpCompletion(day, id, !completed);
    toast({ tone: r.persisted ? "success" : "warning", title: r.message, body: label });
  };

  return (
    <li className={`rounded-tile border px-3 py-2.5 ${frame} ${f.completed ? "opacity-75" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        {f.kind === "missed-task" ? <span className="chip-tag border-line-strong text-ink-2">Missed task</span> : <StatusBadge status={f.severity} />}
        <p className={`text-sm font-semibold ${f.completed ? "text-ink-2" : "text-ink"}`}>{f.title}</p>
        <InfoTip label="Why">
          <p>{f.reason}</p>
        </InfoTip>
      </div>

      {f.steps ? (
        <ol className="mt-2 space-y-1.5" aria-label="Ordered steps, highest priority first">
          {f.steps.map((s, i) => {
            const relevant = !focusSystem || s.systems.includes(focusSystem);
            const isNext = !s.completed && f.steps!.findIndex((x) => !x.completed) === i;
            return (
              <li key={s.id} className={`rounded-control border px-2.5 py-2 ${isNext ? "border-cyan/60 bg-raised" : "border-line"} ${relevant ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.completed}
                    aria-label={`Step ${i + 1}: ${s.text}`}
                    onClick={() => toggle(s.id, s.completed, s.text)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-badge border ${s.completed ? "border-nominal bg-nominal" : "border-line-strong bg-space hover:border-cyan"}`}
                  >
                    <svg viewBox="0 0 16 16" className="t-check h-3 w-3" data-checked={s.completed} aria-hidden="true">
                      <path d="M3.5 8.4l3 3 6-6.6" fill="none" stroke="#060B14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${s.completed ? "text-ink-2 line-through decoration-ink-3" : "text-ink"}`}>
                      <span className="num mr-1.5 text-2xs text-ink-3">{i + 1}.</span>
                      {isNext ? <span className="mr-1.5 font-cond text-2xs font-bold tracking-label text-cyan">NEXT</span> : null}
                      {s.text}
                      </p>
                    {s.alsoResolves ? <p className="mt-0.5 text-2xs text-caution">Also covers: {s.alsoResolves}</p> : null}
                    {!compact && (relevant || isNext) ? <BasisLine basis={s.basis} /> : null}
                    {s.completed && s.completedAt ? <p className="mt-0.5 text-2xs text-ink-3">Done {formatLocalDateTime(s.completedAt)} (real time)</p> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-ink">
            <span className="font-semibold text-cyan">Next: </span>
            {f.action}
            <BasisLine basis={f.basis} />
          </p>
        </>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-ghost min-h-[28px] px-2 text-xs" onClick={() => openGuidance(f.guidance)}>
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
          Guidance
        </button>
        {!f.steps ? (
          <button type="button" aria-pressed={f.completed} className="btn btn-secondary min-h-[28px] px-2 text-xs" onClick={() => toggle(f.id, f.completed, f.title)}>
            {f.completed ? <RotateCcw aria-hidden="true" className="h-3 w-3" /> : null}
            {f.completed ? "Reopen" : "Mark done"}
          </button>
        ) : (
          <span className="text-2xs text-ink-3">
            {f.steps.filter((s) => s.completed).length} of {f.steps.length} steps done
          </span>
        )}
        {!f.steps && f.completed && f.completedAt ? <span className="text-2xs text-ink-3">Done {formatLocalDateTime(f.completedAt)}</span> : null}
      </div>
    </li>
  );
}
