import { BookOpen, ChevronDown, Plus, Radiation } from "lucide-react";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useMissionStore } from "../../hooks/useMissionState";
import { useToast } from "../../hooks/useToast";
import { useUiActions, useUiState } from "../../hooks/useUi";
import { STATUS_RANK, type MetricDiagnostic } from "../../types/health";
import { formatWithUnit } from "../../utils/formatting";
import { ProvenanceTag } from "../shared/ProvenanceTag";
import { BasisLine } from "../shared/BasisLine";
import { FollowUpCard } from "../shared/FollowUpCard";
import { StatusBadge } from "../shared/StatusBadge";
import { TrendChip } from "../shared/TrendChip";
import { useConsoleFocus, useSelectedSystem } from "./useConsoleFocus";

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border ${checked ? "border-nominal bg-nominal" : "border-line-strong bg-space"}`}>
      <svg viewBox="0 0 16 16" className="t-check h-3 w-3" data-checked={checked}>
        <path d="M3.5 8.4l3 3 6-6.6" fill="none" stroke="#060B14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Diagnosis, observations, countermeasures and self-check for the selected body system. */
export function SystemIntelPanel() {
  const { systems, diagnostics, tasks, followUps, day, trends } = useMissionModel();
  const { system: selectedSystem, mode, priority } = useSelectedSystem();
  const { selectedMetric } = useUiState();
  const { openGuidance, openLog, followPriority } = useUiActions();
  const { focusSystem: focusPriority } = useConsoleFocus();
  const { focusMetric } = useConsoleFocus();
  const store = useMissionStore();
  const toast = useToast();

  const def = BODY_SYSTEMS[selectedSystem];
  const st = systems[selectedSystem];
  const focus: MetricDiagnostic =
    selectedMetric && def.metrics.includes(selectedMetric)
      ? diagnostics[selectedMetric]
      : (st.diagnostics.toSorted((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])[0] ?? diagnostics[def.metrics[0]!]);
  const focusName = METRIC_GUIDANCE[focus.metricId].name;
  const sysTasks = tasks.filter((t) => t.systems.includes(selectedSystem));
  const sysFollowUps = followUps.filter((f) => f.systems.includes(selectedSystem));
  const frame = st.status === "CRITICAL" ? "border-critical/60" : st.status === "CAUTION" ? "border-caution/55" : "border-line";

  return (
    <section id="intel" data-tour="intel" aria-labelledby="intel-title" aria-live="polite" className={`panel flex min-w-0 flex-col border ${frame}`}>
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="label">System status</p>
          <h2 id="intel-title" className="font-cond text-lg font-bold leading-tight text-ink">
            {def.name}
          </h2>
        </div>
        <StatusBadge status={st.status} size="md" />
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-1.5 text-2xs text-ink-3">
        {mode === "auto" ? (
          <span>Showing the highest-priority system: {priority.reason}.</span>
        ) : priority.id !== selectedSystem ? (
          <>
            <span>
              Your selection. Highest priority now: {BODY_SYSTEMS[priority.id].shortName.toLowerCase()} ({priority.reason}).
            </span>
            <button
              type="button"
              className="link text-2xs"
              onClick={() => {
                followPriority();
                focusPriority(priority.id);
                followPriority();
              }}
            >
              Show priority system
            </button>
          </>
        ) : (
          <span>Your selection is also the highest-priority system.</span>
        )}
      </div>

      {st.advisories.map((a) => {
        const rel = a.relations.find((r) => r.id === selectedSystem);
        return (
          <div key={a.id} className={`mx-4 mt-3 rounded-tile border px-3 py-2 ${a.level === "ALL CLEAR" ? "border-nominal/40" : "border-caution/50 bg-caution/[0.07]"}`}>
            <p className={`flex flex-wrap items-center gap-1.5 font-cond text-xs font-bold uppercase tracking-label ${a.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}`}>
              <Radiation aria-hidden="true" className="h-3.5 w-3.5" />
              Environmental hazard {a.level}, not personal dose
              <ProvenanceTag kind="SCENARIO" label={a.provenanceLabel} />
            </p>
            <p className="mt-1 text-sm text-ink">{a.phase}: {rel ? <span className="text-ink-2">{rel.relation} link. {rel.text}</span> : a.summary}</p>
          </div>
        );
      })}

      <div className="px-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="label">Diagnosis: {focusName}</h3>
          <StatusBadge status={focus.status} />
        </div>
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="font-cond text-2xs font-semibold uppercase tracking-label text-ink-3">What changed</dt>
            <dd className="text-ink">{focus.summary}</dd>
          </div>
          {trends
            .filter((t) => t.metricId === focus.metricId)
            .map((t) => (
              <div key={`${t.metricId}-${t.part ?? ""}`} className="rounded-tile border border-cyan/40 px-3 py-2">
                <dt>
                  <TrendChip />
                </dt>
                <dd className="mt-1 text-ink">{t.text}</dd>
              </div>
            ))}
          <div className="rounded-tile border border-line-strong bg-raised px-3 py-2">
            <dt className="font-cond text-2xs font-semibold uppercase tracking-label text-cyan">Recommended next step</dt>
            <dd className="mt-0.5 text-ink">{focus.recommendedNextStep}</dd>
          </div>
        </dl>
        <details className="group mt-2 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-2 [&::-webkit-details-marker]:hidden">
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 -rotate-90 transition-transform duration-150 group-open:rotate-0" />
            Why it matters in microgravity
          </summary>
          <p className="mt-1 text-ink-2">{focus.explanation}</p>
        </details>
        <BasisLine basis={focus.basis} />
      </div>

      <div className="px-4 pt-4">
        <h3 className="label">Observations</h3>
        <ul className="mt-1.5 divide-y divide-line rounded-tile border border-line">
          {st.diagnostics.map((d) => (
            <li key={d.metricId}>
              <button
                type="button"
                aria-pressed={d.metricId === focus.metricId}
                onClick={() => focusMetric(d.metricId, selectedSystem)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${d.metricId === focus.metricId ? "bg-raised" : "hover:bg-raised/50"}`}
              >
                <span className="truncate text-ink">{METRIC_GUIDANCE[d.metricId].name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="num text-xs text-ink">{d.latest ? formatWithUnit(d.metricId, d.latest.value) : "—"}</span>
                  <StatusBadge status={d.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 pt-4">
        <h3 className="label">Countermeasures for this system, day {day}</h3>
        {sysFollowUps.length ? (
          <ul className="mt-1.5 space-y-1.5">
            {sysFollowUps.map((f) => (
              <FollowUpCard key={f.id} f={f} day={day} focusSystem={selectedSystem} compact />
            ))}
          </ul>
        ) : null}
        <ul className="mt-1.5 divide-y divide-line rounded-tile border border-line">
          {sysTasks.length === 0 ? <li className="px-3 py-2 text-sm text-ink-2">No scheduled task for this system today.</li> : null}
          {sysTasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 px-2 py-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={t.completed}
                onClick={() => {
                  const r = store.setTaskCompletion(day, t.id, !t.completed);
                  toast({
                    tone: r.persisted ? "success" : "warning",
                    title: t.completed ? `${t.title}: marked not complete` : `${t.title}: complete`,
                    body: t.completed ? `${t.xp} XP removed for day ${day}.` : `+${t.xp} XP for day ${day}, counted once.`,
                    action: { label: "Undo", onClick: () => store.setTaskCompletion(day, t.id, t.completed) },
                  });
                }}
                className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2.5 rounded-control px-1 text-left hover:bg-raised/50"
              >
                <CheckMark checked={t.completed} />
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-semibold ${t.completed ? "text-ink-2" : "text-ink"}`}>{t.title}</span>
                  <span className="block truncate text-2xs text-ink-3">{t.targetLabel}</span>
                </span>
                <span className={`num ml-auto shrink-0 text-xs ${t.completed ? "text-nominal" : "text-ink-3"}`}>+{t.xp}</span>
              </button>
              {t.linkedMetric ? (
                <button type="button" className="btn btn-ghost min-h-[32px] px-1.5 text-xs" aria-label={`Log measurement for ${t.title}`} onClick={() => openLog({ metricId: t.linkedMetric!, day })}>
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <details className="group mx-4 mt-4 rounded-tile border border-line" open={st.status !== "NOMINAL"}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span className="label">Self-check guide ({def.selfCheckSteps.length} steps)</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <ol className="space-y-1.5 border-t border-line px-3 py-2.5">
          {def.selfCheckSteps.map((s, i) => (
            <li key={s} className="flex gap-2.5 text-sm text-ink">
              <span className="num mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-badge border border-line-strong text-2xs text-ink-2">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="border-t border-line px-3 py-2 text-xs text-ink-2">
          Equipment: {def.deviceRequired} {def.caveat}
        </p>
      </details>

      <div className="mt-auto flex flex-wrap gap-2 px-4 py-3">
        <button type="button" className="btn btn-secondary text-xs" onClick={() => openGuidance({ kind: "metric", id: focus.metricId })}>
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
          {METRIC_GUIDANCE[focus.metricId].shortName} guidance
        </button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => openGuidance({ kind: "system", id: selectedSystem })}>
          System reference
        </button>
      </div>
    </section>
  );
}
