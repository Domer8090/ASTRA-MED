import { useState } from "react";
import { ArrowLeft, CheckCheck, ChevronLeft, ChevronRight, FileText, Inbox, RadioTower, Send, Stethoscope, WifiOff } from "lucide-react";
import { STATUS_COLOR, STATUS_TEXT_CLASS } from "../../config/theme";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { hazardMap } from "../../engine/hazardMap";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useMissionStore } from "../../hooks/useMissionState";
import { useToast } from "../../hooks/useToast";
import { useTuesday } from "../../hooks/useTuesday";
import { goToView } from "../../hooks/useView";
import { wellbeingSummary } from "../../state/tuesdayStore";
import { ALL_METRIC_IDS, type HealthStatus, type MetricId } from "../../types/health";
import { formatReadingDate, missionSignalMinutes, padDay } from "../../utils/dates";
import { formatWithUnit } from "../../utils/formatting";
import { StatusBadge, StatusIcon } from "../shared/StatusBadge";
import { SurgeonReportDialog } from "../SurgeonReportDialog";

const RANK: Record<HealthStatus, number> = { CRITICAL: 0, CAUTION: 1, NOMINAL: 2 };
const HEAT_ROWS: readonly MetricId[] = ALL_METRIC_IDS;

/** One row per indicator, one column per mission day, coloured by the engine's status that day. */
function StatusHeatmap() {
  const m = useMissionModel();
  const store = useMissionStore();
  const days = m.dayStatus.length;
  const cellW = 5;
  const rowH = 14;
  const labelW = 132;
  const width = labelW + days * cellW;
  const height = HEAT_ROWS.length * rowH + 18;
  // Replay stops at the selected day: later days are not shown or counted.
  const counts = m.dayStatus.slice(0, m.day).reduce(
    (acc, s) => {
      acc[s]++;
      return acc;
    },
    { NOMINAL: 0, CAUTION: 0, CRITICAL: 0 } as Record<HealthStatus, number>,
  );
  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * width - labelW;
    if (x < 0) return;
    store.setSelectedDay(Math.min(days, Math.max(1, Math.floor(x / cellW) + 1)));
  };
  return (
    <section aria-labelledby="mo-heat" className="panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="mo-heat" className="font-cond text-md font-bold text-ink">
          Mission status by indicator
        </h2>
        <p className="flex flex-wrap gap-3 text-xs text-ink-2">
          {(["NOMINAL", "CAUTION", "CRITICAL"] as const).map((s) => (
            <span key={s} className={`flex items-center gap-1 ${STATUS_TEXT_CLASS[s]}`}>
              <StatusIcon status={s} className="h-3 w-3" />
              <span className="num">{counts[s]}</span> {counts[s] === 1 ? "day" : "days"} {s}
            </span>
          ))}
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-3">
        Days 1 to {m.day}. Select a day to review it; the cyan outline marks the selected day and grey cells are days not yet reached.
      </p>
      <div className="mt-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[760px] cursor-crosshair"
          role="img"
          aria-label={`Mission days 1 to ${m.day}: ${counts.NOMINAL} NOMINAL, ${counts.CAUTION} CAUTION, ${counts.CRITICAL} CRITICAL. Selected day ${m.day}.`}
          onClick={pick}
        >
          {HEAT_ROWS.map((id, r) => (
            <g key={id} transform={`translate(0 ${r * rowH})`}>
              <text x={0} y={rowH - 4} className="fill-ink-2 font-cond text-[10px]">
                {METRIC_GUIDANCE[id].shortName}
              </text>
              {m.metricDayStatus[id].map((s, i) => (
                <rect
                  key={i}
                  x={labelW + i * cellW}
                  y={2}
                  width={cellW - 1}
                  height={rowH - 4}
                  className={i < m.day ? undefined : "fill-line"}
                  fill={i < m.day ? STATUS_COLOR[s] : undefined}
                  opacity={i >= m.day ? 0.45 : s === "NOMINAL" ? 0.22 : s === "CRITICAL" ? 1 : 0.9}
                />
              ))}
              <rect x={labelW} y={rowH - 1} width={days * cellW} height={0.5} className="fill-line" />
            </g>
          ))}
          <rect x={labelW + (m.day - 1) * cellW - 0.5} y={0} width={cellW} height={HEAT_ROWS.length * rowH} fill="none" className="stroke-cyan" strokeWidth={1.2} />
          {[1, 30, 60, 90, 120, 150, 180].filter((d) => d <= days).map((d) => (
            <text
              key={d}
              x={labelW + (d - (d === days ? 0 : 1)) * cellW}
              y={height - 4}
              textAnchor={d === 1 ? "start" : d === days ? "end" : "middle"}
              className="num fill-ink-3 text-[9px]"
            >
              D{d}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function CrewInbox() {
  const { data, store, linkUp } = useTuesday();
  const toast = useToast();
  const [reply, setReply] = useState("");
  const messages = [...data.outbox].reverse();
  const send = () => {
    const text = reply.trim();
    if (!text) return;
    store.addMessage({ role: "officer", text });
    setReply("");
    toast({ tone: "success", title: linkUp ? "Reply sent to the crew" : "Reply queued for uplink", body: linkUp ? "It appears in Tuesday. In flight it arrives after the signal delay." : "It appears in Tuesday; in flight it would go up at the next contact." });
  };
  return (
    <section aria-labelledby="mo-inbox" className="panel flex min-h-0 flex-col p-4">
      <h2 id="mo-inbox" className="flex items-center gap-2 font-cond text-md font-bold text-ink">
        <Inbox aria-hidden="true" className="h-4 w-4 text-cyan" />
        Messages from the crew
        <span className="num text-sm text-ink-2">{data.outbox.filter((x) => !x.reviewed).length} new</span>
      </h2>
      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No messages. The crew sends them with Contact medical officer in the console or Tuesday.</p>
      ) : (
        <ul className="mt-2 flex max-h-[30rem] flex-col gap-2 overflow-y-auto pr-1">
          {messages.map((q) => {
            const report = q.text.split("CREW REPORT\n")[1]?.split("\n")[0]?.trim();
            const written = report && report !== "(nothing written)" ? report : null;
            return (
              <li key={q.id} className={`rounded-tile border px-3 py-2 ${q.reviewed ? "border-line bg-panel" : q.priority === "urgent" ? "border-critical/60 bg-critical/[0.05]" : "border-line-strong bg-raised"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                  <span className={`chip-tag ${q.priority === "urgent" ? "border-critical/60 text-critical" : "border-line-strong text-ink-2"}`}>{q.priority}</span>
                  <span className="num text-xs text-ink-2">
                    Day {q.missionDay}, received {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="ml-auto">
                    {q.reviewed ? (
                      <span className="chip-tag border-nominal/50 text-nominal">Reviewed</span>
                    ) : (
                      <button type="button" className="btn btn-secondary min-h-[30px] px-2 text-xs" onClick={() => store.markReviewed(q.id)}>
                        <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                        Mark reviewed
                      </button>
                    )}
                  </span>
                </div>
                <p className={`mt-1.5 text-sm ${written ? "text-ink" : "italic text-ink-3"}`}>{written ?? "No crew report written. Console status is attached."}</p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-semibold text-cyan">Full message</summary>
                  <pre className="num mt-2 whitespace-pre-wrap rounded-tile border border-line bg-space/60 p-2 text-xs text-ink-2">{q.text}</pre>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <label className="mt-3 flex flex-col gap-1 text-sm text-ink">
        Reply to the crew
        <textarea className="field min-h-[64px] text-sm" value={reply} maxLength={1200} onChange={(e) => setReply(e.target.value)} placeholder="Your advice, written by you. It appears in Tuesday as a message from the medical officer." />
      </label>
      <button type="button" className="btn btn-primary mt-2 self-start" disabled={!reply.trim()} onClick={send}>
        <Send aria-hidden="true" className="h-4 w-4" />
        {linkUp ? "Send reply" : "Queue reply for uplink"}
      </button>
    </section>
  );
}

function EarlyWarnings() {
  const m = useMissionModel();
  const hazard = m.advisories.find((a) => a.level !== "ALL CLEAR");
  const items = [
    ...(m.drift.state === "drift" ? [{ k: "drift", tag: "PATTERN", text: `${m.drift.unusualDays} of ${m.drift.scores.length} recent days unlike the crew member's baseline. ${m.drift.drivers[0]?.text ?? ""}` }] : []),
    ...m.trends.map((t, i) => ({ k: `t${i}`, tag: "TREND", text: t.text })),
    ...(hazard ? [{ k: "hz", tag: `HAZARD ${hazard.level}`, text: `${hazard.title}. ${hazard.summary}` }] : []),
  ];
  return (
    <section aria-labelledby="mo-early" className="panel p-4">
      <h2 id="mo-early" className="font-cond text-md font-bold text-ink">
        Early warnings
      </h2>
      {items.length ? (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.k} className="text-sm text-ink">
              <span className="chip-tag mr-2 border-cyan/50 text-cyan">{it.tag}</span>
              {it.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-2">No trend watch, pattern drift or environmental hazard on day {m.day}.</p>
      )}
      <p className="mt-3 text-xs text-ink-3">Projections and pattern cues, not diagnoses. They never change a status.</p>
    </section>
  );
}

function IndicatorTable() {
  const m = useMissionModel();
  const rows = Object.values(m.diagnostics).toSorted((a, b) => RANK[a.status] - RANK[b.status] || b.persistenceDays - a.persistenceDays);
  return (
    <section aria-labelledby="mo-table" className="panel p-4">
      <h2 id="mo-table" className="font-cond text-md font-bold text-ink">
        Indicators on day {m.day}
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="label border-b border-line">
              <th className="py-1.5 pr-3 font-semibold">Indicator</th>
              <th className="py-1.5 pr-3 font-semibold">Latest</th>
              <th className="py-1.5 pr-3 font-semibold">Status</th>
              <th className="py-1.5 pr-3 font-semibold">Rule</th>
              <th className="py-1.5 pr-3 font-semibold">Days</th>
              <th className="py-1.5 font-semibold">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.metricId} className="border-b border-line-soft">
                <td className="py-1.5 pr-3 text-ink">{METRIC_GUIDANCE[d.metricId].name}</td>
                <td className="num py-1.5 pr-3 text-ink">{d.latest ? formatWithUnit(d.metricId, d.latest.value) : "none"}</td>
                <td className="py-1.5 pr-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="num py-1.5 pr-3 text-xs text-ink-2">{d.triggeredRules[0]?.threshold ?? "inside range"}</td>
                <td className="num py-1.5 pr-3 text-ink-2">{d.status === "NOMINAL" ? "" : d.persistenceDays}</td>
                <td className="num py-1.5 text-xs text-ink-2">
                  {d.latest ? `${formatReadingDate(d.latest.missionDay, d.latest.recordedAt)}${d.latest.source === "manual" || d.latest.source === "tuesday" ? " crew" : ""}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">Prototype thresholds, not NASA flight rules. Synthetic data unless marked crew.</p>
    </section>
  );
}

function HazardsAndWellbeing() {
  const m = useMissionModel();
  const { data, linkUp } = useTuesday();
  const week = wellbeingSummary(data.activity, m.day);
  const cards = hazardMap({
    systems: m.systems,
    diagnostics: m.diagnostics,
    advisories: m.advisories,
    drift: m.drift,
    linkUp,
    signalDelayMinutes: missionSignalMinutes(m.day),
    queuedMessages: data.outbox.length,
    checkInsThisWeek: week.checkIns,
    rechargeMinutesThisWeek: week.rechargeMinutes,
  });
  return (
    <section aria-labelledby="mo-hazards" className="panel p-4">
      <h2 id="mo-hazards" className="font-cond text-md font-bold text-ink">
        Five hazards and crew wellbeing
      </h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {cards.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm text-ink">
            {c.status ? <StatusBadge status={c.status} /> : <span className="chip-tag border-line-strong text-ink-2">{c.chip}</span>}
            <span className="font-semibold">{c.name}:</span>
            <span className="text-ink-2">{c.facts[0]}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-line pt-3 text-sm text-ink">
        <p>
          Last 7 days: <span className="num">{week.checkIns}</span> check-ins
          {week.averageEnergy !== null ? (
            <>
              , average energy <span className="num">{week.averageEnergy.toFixed(1)}</span>/5
            </>
          ) : null}
          , <span className="num">{week.rechargeMinutes}</span> min of recharge
          {week.averageAfter !== null ? (
            <>
              , feeling <span className="num">{week.averageAfter.toFixed(1)}</span>/5 afterwards
            </>
          ) : null}
          .
        </p>
        <p className="mt-1 text-xs text-ink-3">Tuesday conversations stay private to the crew member; only these counts are shown here.</p>
      </div>
    </section>
  );
}

/**
 * Ground-side view for the medical officer (flight surgeon). In flight this
 * would run at mission control on data received at each contact; in this
 * prototype it reads the same browser's data.
 */
export function MedicalOfficerDashboard() {
  const m = useMissionModel();
  const store = useMissionStore();
  const { linkUp, simulatedLos, setSimulatedLos } = useTuesday();
  const [reportOpen, setReportOpen] = useState(false);
  const delay = missionSignalMinutes(m.day);
  const counts = m.overall.counts;

  return (
    <div className="min-h-dvh">
      <SurgeonReportDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      <header className="sticky top-0 z-30 border-b border-line bg-space">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <button type="button" className="btn btn-ghost min-h-[40px] px-2" onClick={() => goToView("crew")}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Crew console
          </button>
          <div className="flex items-center gap-2">
            <Stethoscope aria-hidden="true" className="h-5 w-5 text-cyan" />
            <div>
              <h1 className="font-cond text-lg font-bold leading-tight text-ink">Medical officer dashboard</h1>
              <p className="text-xs text-ink-2">Ground view, Ares Transit demo mission, crew FE-2</p>
            </div>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Mission day">
            <button type="button" className="btn btn-ghost min-h-[36px] min-w-[36px] px-1" aria-label="Previous day" onClick={() => store.setSelectedDay(m.day - 1)} disabled={m.day <= 1}>
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="num text-md text-ink">D{padDay(m.day)}</span>
            <button type="button" className="btn btn-ghost min-h-[36px] min-w-[36px] px-1" aria-label="Next day" onClick={() => store.setSelectedDay(m.day + 1)} disabled={m.day >= m.dayStatus.length}>
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <p className={`flex items-center gap-1.5 text-sm ${linkUp ? "text-ink-2" : "text-caution"}`}>
            {linkUp ? <RadioTower aria-hidden="true" className="h-4 w-4" /> : <WifiOff aria-hidden="true" className="h-4 w-4" />}
            {linkUp ? `Link up, ${delay.toFixed(1)} min one way` : "Loss of signal"}
          </p>
          <label className="flex items-center gap-1.5 text-xs text-ink-2">
            <input type="checkbox" checked={simulatedLos} onChange={(e) => setSimulatedLos(e.target.checked)} />
            Simulate loss of signal
          </label>
          <button type="button" className="btn btn-secondary ml-auto" onClick={() => setReportOpen(true)}>
            <FileText aria-hidden="true" className="h-4 w-4" />
            Flight-surgeon report
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-4">
        <p className="text-xs text-ink-3">
          In flight this view runs at mission control on data received at each contact. In this prototype it reads this browser's data. Synthetic demonstration data and prototype thresholds; not an operational medical system.
        </p>
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="flex flex-col gap-3">
          <section aria-labelledby="mo-status" className={`panel border p-4 ${m.overall.status === "CRITICAL" ? "border-critical/60" : m.overall.status === "CAUTION" ? "border-caution/55" : ""}`}>
            <h2 id="mo-status" className="label">
              Crew health, day {padDay(m.day)}
            </h2>
            <p className={`mt-1 flex items-center gap-2 font-cond text-2xl font-bold tracking-status ${STATUS_TEXT_CLASS[m.overall.status]}`}>
              <StatusIcon status={m.overall.status} className="h-8 w-8" />
              {m.overall.status}
            </p>
            <p className="mt-1 flex flex-wrap gap-3 text-sm text-ink-2">
              {(["CRITICAL", "CAUTION", "NOMINAL"] as const).map((s) => (
                <span key={s} className={counts[s] && s !== "NOMINAL" ? STATUS_TEXT_CLASS[s] : ""}>
                  <span className="num">{counts[s]}</span> {s}
                </span>
              ))}
            </p>
            <p className="mt-3 text-sm text-ink">
              <span className="text-ink-2">Crew next action: </span>
              {m.primaryAction.text}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              Readiness <span className="num text-ink">{m.readiness.score}</span>/100
              {m.lastReading ? (
                <>
                  , last check <span className="num text-ink">{formatReadingDate(m.lastReading.missionDay, m.lastReading.recordedAt)}</span>
                </>
              ) : null}
            </p>
          </section>
            <EarlyWarnings />
          </div>
          <CrewInbox />
        </div>
        <StatusHeatmap />
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <IndicatorTable />
          <HazardsAndWellbeing />
        </div>
      </main>
    </div>
  );
}
