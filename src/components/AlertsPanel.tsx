import { useMemo } from "react";
import { BookOpen, CircleCheck, PencilLine, Radiation } from "lucide-react";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import { useMissionModel } from "../hooks/useMissionModel";
import { useUiActions } from "../hooks/useUi";
import { ALL_METRIC_IDS, type HealthStatus } from "../types/health";
import { padDay } from "../utils/dates";
import { formatWithUnit } from "../utils/formatting";
import { Panel } from "./shared/Panel";
import { ProvenanceTag } from "./shared/ProvenanceTag";
import { BasisLine } from "./shared/BasisLine";
import { StatusBadge, StatusIcon } from "./shared/StatusBadge";

interface TimelineItem {
  key: string;
  day: number;
  kind: "status" | "manual" | "scenario";
  status?: HealthStatus;
  text: string;
}

const LOOKBACK = 14;

export function AlertsPanel() {
  const { overall, advisories, metricDayStatus, day, measurements, scenario } = useMissionModel();
  const { openGuidance } = useUiActions();

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    const from = Math.max(1, day - LOOKBACK + 1);
    for (const id of ALL_METRIC_IDS) {
      const series = metricDayStatus[id];
      for (let d = from; d <= day; d++) {
        const prev = d > 1 ? series[d - 2] : "NOMINAL";
        const cur = series[d - 1] ?? "NOMINAL";
        if (cur !== prev) {
          const name = METRIC_GUIDANCE[id].name;
          items.push({
            key: `${id}-${d}`,
            day: d,
            kind: "status",
            status: cur,
            text: cur === "NOMINAL" ? `${name} returned to NOMINAL` : `${name} changed to ${cur}`,
          });
        }
      }
    }
    for (const m of measurements) {
      if (m.missionDay >= from && m.missionDay <= day) {
        items.push({ key: m.id, day: m.missionDay, kind: "manual", text: `Logged ${METRIC_GUIDANCE[m.metricId].name.toLowerCase()}: ${formatWithUnit(m.metricId, m.value)}` });
      }
    }
    for (const e of scenario.events) {
      if (e.startDay >= from && e.startDay <= day) items.push({ key: e.id, day: e.startDay, kind: "scenario", text: `${e.title} began` });
    }
    return items.sort((a, b) => b.day - a.day || a.key.localeCompare(b.key)).slice(0, 18);
  }, [metricDayStatus, day, measurements, scenario.events]);

  const alerts = overall.drivers;
  const activeAdvisories = advisories.filter((a) => a.severity !== "NOMINAL");

  return (
    <Panel id="alerts" title="Alerts and health events" subtitle="Each alert answers what changed, why it matters in space and what to do next.">
      <h3 className="label">Active alerts, day {padDay(day)}</h3>
      {alerts.length === 0 && activeAdvisories.length === 0 ? (
        <div className="mt-2 flex items-start gap-2 rounded-tile border border-nominal/35 px-3 py-3">
          <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 text-nominal" />
          <p className="text-sm text-ink">
            No active alerts. All {overall.counts.NOMINAL} indicators are inside their configured ranges on mission day {day}.
          </p>
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {activeAdvisories.map((a) => (
            <li key={a.id} className="rounded-tile border border-caution/50 p-3">
              <p className="flex flex-wrap items-center gap-2">
                <Radiation aria-hidden="true" className="h-4 w-4 text-caution" />
                <span className="text-base font-semibold text-ink">{a.title}</span>
                <ProvenanceTag kind={a.source === "scenario" ? "SCENARIO" : "LIVE"} label={a.provenanceLabel} />
              </p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div>
                  <dt className="label">What changed</dt>
                  <dd className="text-ink">{a.summary}</dd>
                </div>
                <div>
                  <dt className="label">Why it matters in space</dt>
                  <dd className="text-ink-2">{a.whyItMatters}</dd>
                </div>
                <div>
                  <dt className="label text-cyan">What to do next</dt>
                  <dd className="text-ink">{a.nextStep}</dd>
                </div>
              </dl>
              <BasisLine basis={a.basis} />
            </li>
          ))}
          {alerts.map((d) => (
            <li key={d.metricId} className={`rounded-tile border p-3 ${d.status === "CRITICAL" ? "border-critical/60" : "border-caution/50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={d.status} />
                  <span className="text-base font-semibold text-ink">{METRIC_GUIDANCE[d.metricId].name}</span>
                  {d.persistenceDays > 1 ? <span className="text-xs text-ink-2">{d.persistenceDays} days</span> : <span className="text-xs text-ink-2">new today</span>}
                </p>
                <button type="button" className="btn btn-secondary min-h-[32px] text-xs" onClick={() => openGuidance({ kind: "metric", id: d.metricId })}>
                  <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
                  Open guidance
                </button>
              </div>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div>
                  <dt className="label">What changed</dt>
                  <dd className="text-ink">{d.summary}</dd>
                </div>
                <div>
                  <dt className="label">Why it matters in space</dt>
                  <dd className="text-ink-2">{d.explanation}</dd>
                </div>
                <div>
                  <dt className="label text-cyan">What to do next</dt>
                  <dd className="text-ink">{d.recommendedNextStep}</dd>
                </div>
              </dl>
              <BasisLine basis={d.basis} />
            </li>
          ))}
        </ul>
      )}

      <h3 className="label mt-5">Recent health events, last {LOOKBACK} days</h3>
      {timeline.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No status changes, entries or scenario events in the last {LOOKBACK} days.</p>
      ) : (
        <ol className="relative mt-2 border-l border-line pl-4">
          {timeline.map((t) => (
            <li key={t.key} className="relative pb-2.5 last:pb-0">
              <span className="absolute -left-[22px] top-1 flex h-3 w-3 items-center justify-center rounded-full border border-line-strong bg-space" aria-hidden="true" />
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="num text-ink-2">D{padDay(t.day)}</span>
                {t.kind === "status" && t.status ? (
                  <span className={t.status === "NOMINAL" ? "text-nominal" : t.status === "CAUTION" ? "text-caution" : "text-critical"}>
                    <StatusIcon status={t.status} className="h-3.5 w-3.5" />
                  </span>
                ) : t.kind === "manual" ? (
                  <PencilLine aria-hidden="true" className="h-3.5 w-3.5 text-cyan" />
                ) : (
                  <Radiation aria-hidden="true" className="h-3.5 w-3.5 text-blue" />
                )}
                <span className="text-ink">{t.text}</span>
                {t.kind === "manual" ? <ProvenanceTag kind="MANUAL" /> : t.kind === "scenario" ? <ProvenanceTag kind="SCENARIO" /> : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
