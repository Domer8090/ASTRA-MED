import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, LineChart, Plus, Radiation } from "lucide-react";
import { BODY_SYSTEMS } from "../data/bodySystems";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import { useUiActions, useUiState } from "../hooks/useUi";
import { BODY_SYSTEM_IDS, type BodySystemId, type MetricId } from "../types/health";
import { formatWithUnit } from "../utils/formatting";
import { BodyPlate } from "./bodymap/BodyPlate";
import { scrollToSection } from "./navigation";
import { Panel } from "./shared/Panel";
import { ProvenanceTag } from "./shared/ProvenanceTag";
import { Segmented } from "./shared/Segmented";
import { StatusBadge } from "./shared/StatusBadge";

function useCompact<T extends HTMLElement>(threshold: number) {
  const ref = useRef<T>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setCompact(entry.contentRect.width < threshold);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [threshold]);
  return [ref, compact] as const;
}

const KEY_METRIC: Record<BodySystemId, MetricId> = {
  neuroOcular: "sleep",
  cardiovascular: "heartRate",
  musculoskeletal: "aredMinutes",
  immuneRadiation: "radiation",
  metabolicCircadian: "bloodGlucose",
};

export function BodyMapPanel() {
  const { systems, diagnostics } = useMissionModel();
  const { selectedSystem } = useUiState();
  const { selectSystem, openGuidance, openLog } = useUiActions();
  const store = useMissionStore();
  const [plateRef, compact] = useCompact<HTMLDivElement>(540);
  const [tab, setTab] = useState<"status" | "selfcheck">("status");

  const keyReadings = useMemo(() => {
    const out = {} as Record<BodySystemId, string>;
    for (const id of BODY_SYSTEM_IDS) {
      const d = diagnostics[KEY_METRIC[id]];
      out[id] = d.latest ? `${METRIC_GUIDANCE[d.metricId].shortName} ${formatWithUnit(d.metricId, d.latest.value)}` : "No reading";
    }
    return out;
  }, [diagnostics]);

  const def = BODY_SYSTEMS[selectedSystem];
  const st = systems[selectedSystem];

  return (
    <Panel
      id="body"
      title="Body systems"
      subtitle="Select a body system on the plate to see its status, what to check and why it matters in microgravity."
      bodyClassName="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
    >
      <div ref={plateRef} className="min-w-0 border-b border-line p-3 md:p-4 lg:border-b-0 lg:border-r">
        <p className="label mb-1 px-1">Select a body system</p>
        <div className={compact ? "mx-auto max-w-[300px]" : ""}>
          <BodyPlate systems={systems} selected={selectedSystem} onSelect={selectSystem} compact={compact} keyReadings={keyReadings} />
        </div>
        {compact ? (
          <ul className="mt-3 grid gap-2" aria-label="Body systems">
            {BODY_SYSTEM_IDS.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={selectedSystem === id}
                  onClick={() => selectSystem(id)}
                  className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-tile border px-3 py-2 text-left ${selectedSystem === id ? "border-cyan bg-raised" : "border-line bg-panel"}`}
                >
                  <span className="min-w-0">
                    <span className="block font-cond text-md font-semibold text-ink">{BODY_SYSTEMS[id].shortName}</span>
                    <span className="num block truncate text-2xs text-ink-2">{keyReadings[id]}</span>
                  </span>
                  <StatusBadge status={systems[id].status} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="min-w-0 p-4 md:p-5" aria-live="polite" aria-atomic="false">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="label">System status</p>
            <h3 className="mt-0.5 font-cond text-xl font-bold text-ink">{def.name}</h3>
          </div>
          <StatusBadge status={st.status} size="md" />
        </div>
        <p className="mt-2 max-w-[62ch] text-base text-ink-2">{def.whyItMatters}</p>

        {st.advisories.length > 0 ? (
          <div className="mt-3 rounded-tile border border-caution/50 bg-caution/[0.07] p-3">
            <p className="flex items-center gap-1.5 font-cond text-sm font-bold uppercase tracking-label text-caution">
              <Radiation aria-hidden="true" className="h-4 w-4" />
              Environmental hazard, not personal dose
            </p>
            {st.advisories.map((a) => (
              <div key={a.id} className="mt-1.5">
                <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                  {a.title}
                  <ProvenanceTag kind={a.source === "scenario" ? "SCENARIO" : "LIVE"} label={a.provenanceLabel} />
                </p>
                <p className="mt-0.5 text-sm text-ink-2">{a.summary}</p>
              </div>
            ))}
          </div>
        ) : null}

        <Segmented
          className="mt-4"
          label="System detail view"
          value={tab}
          onChange={setTab}
          options={[
            { value: "status", label: "Status & context" },
            { value: "selfcheck", label: "Self-check guide" },
          ]}
        />

        {tab === "status" ? (
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="label">Current observations</h4>
              <ul className="mt-1.5 divide-y divide-line rounded-tile border border-line">
                {st.diagnostics.map((d) => (
                  <li key={d.metricId}>
                    <button type="button" onClick={() => openGuidance({ kind: "metric", id: d.metricId })} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-raised">
                      <span className="min-w-0">
                        <span className="block text-base text-ink">{METRIC_GUIDANCE[d.metricId].name}</span>
                        <span className="block truncate text-xs text-ink-2">{d.status === "NOMINAL" ? (d.notes[0] ?? "Inside the configured range.") : d.summary}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="num text-sm text-ink">{d.latest ? formatWithUnit(d.metricId, d.latest.value) : "—"}</span>
                        <StatusBadge status={d.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="label">Why it matters in microgravity</h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-base text-ink-2 marker:text-ink-3">
                {def.inSpace.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-tile border border-line-strong bg-raised p-3">
              <h4 className="label text-cyan">Recommended next step</h4>
              <p className="mt-1 text-base text-ink">{st.recommendedNextStep}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="label">What to measure or check</h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-base text-ink-2 marker:text-ink-3">
                {def.relevantMeasurements.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="label">Self-check guide</h4>
              <ol className="mt-1.5 space-y-1.5">
                {def.selfCheckSteps.map((t, i) => (
                  <li key={t} className="flex gap-3 text-base text-ink">
                    <span className="num mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-badge border border-line-strong text-2xs text-ink-2">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-sm text-ink-2">
                <span className="font-semibold text-ink">Equipment: </span>
                {def.deviceRequired}
              </p>
            </div>
            <p className="rounded-tile border border-line px-3 py-2 text-sm text-ink-2">{def.caveat}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => openGuidance({ kind: "system", id: selectedSystem })}>
            <BookOpen aria-hidden="true" className="h-4 w-4" />
            Open full guidance
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              store.setTrendTab(def.trendTab);
              scrollToSection("trends");
            }}
          >
            <LineChart aria-hidden="true" className="h-4 w-4" />
            View trend
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => openLog({ metricId: def.metrics[0] ?? "heartRate" })}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Log measurement
          </button>
        </div>
      </div>
    </Panel>
  );
}
