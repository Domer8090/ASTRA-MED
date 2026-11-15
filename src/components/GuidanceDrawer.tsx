import { ChevronDown, LineChart, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { BODY_SYSTEMS } from "../data/bodySystems";
import { GUIDANCE_DISCLAIMER, METRIC_GUIDANCE } from "../data/metricGuidance";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import { useUiActions, useUiState } from "../hooks/useUi";
import type { GuidanceRef, MetricDiagnostic, RuleTrace } from "../types/health";
import { formatWithUnit } from "../utils/formatting";
import { scrollToSection } from "./navigation";
import { Dialog } from "./shared/Dialog";
import { ProvenanceTag } from "./shared/ProvenanceTag";
import { StatusBadge } from "./shared/StatusBadge";
import { BasisLine } from "./shared/BasisLine";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-4 first:border-t-0">
      <h3 className="text-sm font-semibold text-ink-2">{title}</h3>
      <div className="mt-1.5 text-md leading-relaxed text-ink">{children}</div>
    </section>
  );
}

const PROV: Record<RuleTrace["provenance"], "SUPPLIED PROTOTYPE" | "ASTRA ASSUMPTION" | "MISSION PLAN"> = {
  "supplied-prototype": "SUPPLIED PROTOTYPE",
  "astra-assumption": "ASTRA ASSUMPTION",
  "mission-plan": "MISSION PLAN",
};

/** The three things a crew member needs, in large type. */
function ThreeQuestions({ d, howToMeasure }: { d: MetricDiagnostic; howToMeasure: readonly string[] }) {
  const tone = d.status === "CRITICAL" ? "border-critical/60" : d.status === "CAUTION" ? "border-caution/55" : "border-line";
  return (
    <div className="mx-5 mt-4 flex flex-col gap-3">
      <div className={`rounded-tile border ${tone} bg-panel px-4 py-4`}>
        <p className="text-sm font-semibold text-ink-2">Right now</p>
        <p className="mt-1 text-lg leading-snug text-ink">{d.summary}</p>
      </div>
      <div className="rounded-tile border border-cyan/40 bg-cyan/5 px-4 py-4">
        <p className="text-sm font-semibold text-cyan">What to do</p>
        <p className="mt-1 text-lg leading-snug text-ink">{d.recommendedNextStep}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-ink-3">
          Why this step <BasisLine basis={d.basis} />
        </p>
      </div>
      <div className="rounded-tile border border-line bg-panel px-4 py-4">
        <p className="text-sm font-semibold text-ink-2">How to measure</p>
        <ol className="mt-2 space-y-2">
          {howToMeasure.map((s, i) => (
            <li key={s} className="flex gap-3 text-md leading-snug text-ink">
              <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs text-ink-2">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function RuleTable({ rules }: { rules: RuleTrace[] }) {
  if (rules.length === 0) return <p className="text-sm text-ink-2">No caution or critical rule is active. The reading is inside the configured demonstration range.</p>;
  return (
    <ul className="space-y-2">
      {rules.map((r) => (
        <li key={r.ruleId} className="rounded-tile border border-line p-3">
          <p className="flex flex-wrap items-center gap-2 text-base text-ink">
            <StatusBadge status={r.status} />
            {r.description}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Observed <span className="num text-ink">{r.observed}</span>, rule <span className="num text-ink">{r.threshold}</span>
          </p>
          <ProvenanceTag kind={PROV[r.provenance]} className="mt-1.5" />
        </li>
      ))}
    </ul>
  );
}

function MetricGuidanceBody({ id }: { id: GuidanceRef & { kind: "metric" } }) {
  const g = METRIC_GUIDANCE[id.id];
  const { diagnostics } = useMissionModel();
  const d = diagnostics[id.id];
  return (
    <>
      <ThreeQuestions d={d} howToMeasure={g.howToMeasure} />
      <details className="group mx-5 mt-3 rounded-tile border border-line">
        <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 text-md font-semibold text-ink">
          More about this reading
          <ChevronDown aria-hidden="true" className="h-5 w-5 text-ink-2 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <Section title="Why it might matter in space">{d.explanation}</Section>
        {d.notes.length > 0 ? <Section title="Note">{d.notes.join(" ")}</Section> : null}
        <Section title="Why this status">
          <RuleTable rules={d.triggeredRules} />
        </Section>
        <Section title="What it measures">{g.whatItMeasures}</Section>
        <Section title="Why it matters">{g.whyItMatters}</Section>
        <Section title="Equipment">{g.deviceRequired}</Section>
        <Section title="What can affect it in microgravity">{g.microgravityEffects}</Section>
        <Section title="When to repeat">{g.whenToRepeat}</Section>
        <Section title="What to record">
          <ul className="list-disc space-y-0.5 pl-5 marker:text-ink-3">
            {g.whatToRecord.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Section>
        <Section title="Afterwards">{g.nextStep}</Section>
      </details>
    </>
  );
}

function SystemGuidanceBody({ id }: { id: GuidanceRef & { kind: "system" } }) {
  const def = BODY_SYSTEMS[id.id];
  const { systems } = useMissionModel();
  const { openGuidance } = useUiActions();
  const st = systems[id.id];
  return (
    <>
      {st.advisories.map((a) => {
        const rel = a.relations.find((r) => r.id === id.id);
        return (
          <div key={a.id} className={`mx-5 mt-4 rounded-tile border px-4 py-3 ${a.level === "ALL CLEAR" ? "border-nominal/40" : "border-caution/50 bg-caution/[0.06]"}`}>
            <p className={`label ${a.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}`}>Environmental hazard {a.level}, not personal dose</p>
            <p className="mt-1 text-sm text-ink">
              {a.title}. {rel ? `${rel.relation} link: ${rel.text}` : a.summary}
            </p>
          </div>
        );
      })}
      <div className="mx-5 mt-4 rounded-tile border border-line bg-panel px-4 py-3">
        <p className="label">Recommended next step</p>
        <p className="mt-1 text-base text-ink">{st.recommendedNextStep}</p>
      </div>
      <Section title="Why it matters">{def.whyItMatters}</Section>
      <Section title="Why microgravity or radiation can change the risk">
        <ul className="list-disc space-y-1 pl-5 marker:text-ink-3">
          {def.inSpace.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>
      <Section title="Relevant metrics">
        <ul className="divide-y divide-line rounded-tile border border-line">
          {st.diagnostics.map((d) => (
            <li key={d.metricId}>
              <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-panel" onClick={() => openGuidance({ kind: "metric", id: d.metricId })}>
                <span>{METRIC_GUIDANCE[d.metricId].name}</span>
                <span className="flex items-center gap-2">
                  <span className="num text-sm">{d.latest ? formatWithUnit(d.metricId, d.latest.value) : "—"}</span>
                  <StatusBadge status={d.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="What to measure or check">
        <ul className="list-disc space-y-1 pl-5 marker:text-ink-3">
          {def.relevantMeasurements.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>
      <Section title="Self-check guide">
        <ol className="space-y-1.5">
          {def.selfCheckSteps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-badge border border-line-strong text-2xs text-ink-2">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-ink-2">Equipment: {def.deviceRequired}</p>
      </Section>
      <Section title="Limits of this check">{def.caveat}</Section>
    </>
  );
}

export function GuidanceDrawer() {
  const { guidance } = useUiState();
  const { closeGuidance, openLog } = useUiActions();
  const { diagnostics, systems } = useMissionModel();
  const store = useMissionStore();
  const desktop = useMediaQuery("(min-width: 1024px)");

  const title = guidance ? (guidance.kind === "metric" ? METRIC_GUIDANCE[guidance.id].name : BODY_SYSTEMS[guidance.id].name) : "Guidance";
  const status = guidance ? (guidance.kind === "metric" ? diagnostics[guidance.id].status : systems[guidance.id].status) : null;
  const trendTab = guidance ? (guidance.kind === "metric" ? METRIC_GUIDANCE[guidance.id].trendTab : BODY_SYSTEMS[guidance.id].trendTab) : null;
  const logMetric = guidance ? (guidance.kind === "metric" ? guidance.id : BODY_SYSTEMS[guidance.id].metrics[0]) : undefined;

  return (
    <Dialog
      open={guidance !== null}
      onClose={closeGuidance}
      title={title}
      labelId="guidance-title"
      variant="drawer"
      modal={!desktop}
      titleExtra={
        status ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-sm text-ink-2">{guidance?.kind === "metric" ? "Reading guide" : "Body system guide"}</span>
          </div>
        ) : null
      }
      footer={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {logMetric ? (
              <button type="button" className="btn btn-primary" onClick={() => openLog({ metricId: logMetric })}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add reading
              </button>
            ) : null}
            {trendTab ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  store.setTrendTab(trendTab);
                  closeGuidance();
                  window.setTimeout(() => scrollToSection("trends"), 50);
                }}
              >
                <LineChart aria-hidden="true" className="h-4 w-4" />
                View trend
              </button>
            ) : null}
          </div>
          <p className="text-2xs leading-4 text-ink-3">{GUIDANCE_DISCLAIMER}</p>
        </div>
      }
    >
      <div data-autofocus tabIndex={-1} className="pb-4 outline-none">
        {guidance?.kind === "metric" ? <MetricGuidanceBody id={guidance} /> : null}
        {guidance?.kind === "system" ? <SystemGuidanceBody id={guidance} /> : null}
      </div>
    </Dialog>
  );
}
