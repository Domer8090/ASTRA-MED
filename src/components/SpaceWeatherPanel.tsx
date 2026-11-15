import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, Radiation, RefreshCw, ShieldAlert, Sun } from "lucide-react";
import { BODY_SYSTEMS } from "../data/bodySystems";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import { SEP_DOSE_MODEL_SUMMARY } from "../data/scenarioHazards";
import { useCmeForecast } from "../hooks/useCmeForecast";
import { useMissionModel } from "../hooks/useMissionModel";
import { lastArrival, nextArrival, type CmeArrival, type ForecastLocation } from "../services/enlilForecast";
import { useNow } from "../hooks/useNow";
import { useSpaceWeather } from "../hooks/useSpaceWeather";
import { useToast } from "../hooks/useToast";
import { useUiActions } from "../hooks/useUi";
import { DONKI_TYPES, usingDemoKey } from "../services/nasaDonkiApi";
import type { DonkiDataSource, DonkiEvent, DonkiEventType, EnvironmentAdvisory, SpaceWeatherMode } from "../types/health";
import { formatLocalDateTime, formatMissionDate, formatRelative } from "../utils/dates";
import { FollowUpCard } from "./shared/FollowUpCard";
import { Panel } from "./shared/Panel";
import { ProvenanceTag, type Provenance } from "./shared/ProvenanceTag";
import { InfoTip } from "./shared/InfoTip";

const TYPE_LABEL: Record<DonkiEventType, string> = {
  FLR: "Solar flares",
  SEP: "Solar particle storms (SEP)",
  CME: "Solar eruptions (CME)",
  NOTIFICATION: "Notifications",
};

const MODE_TAG: Record<SpaceWeatherMode, { kind: Provenance; label: string }> = {
  LIVE: { kind: "LIVE", label: "LIVE" },
  PARTIAL: { kind: "PARTIAL", label: "PARTIAL LIVE" },
  CACHED: { kind: "CACHED", label: "CACHED" },
  ARCHIVED: { kind: "ARCHIVED", label: "ARCHIVED" },
  UNAVAILABLE: { kind: "UNAVAILABLE", label: "UNAVAILABLE" },
};

const SOURCE_TAG: Record<DonkiDataSource, { kind: Provenance; label: string }> = {
  live: { kind: "LIVE", label: "LIVE" },
  cached: { kind: "CACHED", label: "CACHED" },
  archived: { kind: "ARCHIVED", label: "ARCHIVED 2024" },
};

type Filter = "ALL" | DonkiEventType;

/** Plain names for DONKI event types. */
const PLAIN_TYPE: Record<string, string> = {
  FLR: "Solar flare",
  SEP: "Radiation storm",
  CME: "Solar eruption (CME)",
  NOTIFICATION: "Notice",
};

function EventRow({ e }: { e: DonkiEvent }) {
  const [open, setOpen] = useState(false);
  const id = `ev-${e.type}-${e.id.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_64px]">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-raised/60">
        <span className={`mt-0.5 w-28 shrink-0 text-sm font-semibold ${e.type === "SEP" ? "text-caution" : e.type === "FLR" ? "text-[#f8c36b]" : e.type === "CME" ? "text-blue" : "text-ink-2"}`}>{PLAIN_TYPE[e.type] ?? e.type}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base text-ink">{e.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-2">
            <span className="font-semibold text-ink" title={e.startTime ?? "No start time supplied"}>{e.startTime ? formatLocalDateTime(e.startTime) : "No start time in record"}</span>
            {e.severity ? <span className="chip-tag border-line-strong text-ink">{e.severity}</span> : null}
            <ProvenanceTag kind={SOURCE_TAG[e.dataSource].kind} label={SOURCE_TAG[e.dataSource].label} />
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`mt-1 h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div id={id} className="border-t border-line bg-space/40 px-3 py-3 pl-[72px] text-sm">
          <p className="text-ink-2">{e.description}</p>
          {e.details.length ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {e.details.map((d) => (
                <div key={d.label} className="contents">
                  <dt className="text-ink-3">{d.label}</dt>
                  <dd className="num text-ink">{d.label === "Peak" ? formatLocalDateTime(d.value) : d.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="num mt-2 break-all text-2xs text-ink-3">ID {e.id}</p>
          {e.linkedIds.length ? <p className="num mt-0.5 break-all text-2xs text-ink-3">Linked: {e.linkedIds.join(", ")}</p> : null}
          {e.sourceUrl ? (
            <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-flex items-center gap-1 text-sm">
              View source record on NASA CCMC DONKI
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** The mission's environmental hazard assessment: level, phase, affected systems and protective actions. */
function HazardAssessment({ a, day }: { a: EnvironmentAdvisory | undefined; day: number }) {
  const { followUps } = useMissionModel();
  const { openGuidance } = useUiActions();
  if (!a) {
    return (
      <div className="flex items-start gap-3 rounded-tile border border-line p-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 text-nominal" />
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold text-ink-2">
            {formatMissionDate(day)}
            <InfoTip label="Environment">Scenario C simulates a solar particle event: precursor day 130, event days 131–133, all clear day 134.</InfoTip>
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">No solar storm or radiation warning today.</p>
          <p className="text-base text-ink-2">Nothing to do. Keep your normal routine.</p>
        </div>
      </div>
    );
  }
  const sequence = followUps.find((f) => f.id === `sequence:${a.source}:${a.level}`);
  const tone = a.level === "ALL CLEAR" ? "border-nominal/40" : a.level === "WARNING" ? "border-caution bg-caution/[0.06]" : "border-caution/50";
  return (
    <div className={`rounded-tile border p-3 md:p-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold text-ink-2">
            {formatMissionDate(day)}
            {a.missionDayRange ? ` · event ${formatMissionDate(a.missionDayRange[0])} – ${formatMissionDate(a.missionDayRange[1])}` : a.startTime ? ` · started ${formatLocalDateTime(a.startTime)} (real-world date)` : ""}
            <InfoTip label="Why it matters">
              <p>{a.whyItMatters}</p>
              {a.source === "scenario" ? <p className="text-xs">Dosimeter model: {SEP_DOSE_MODEL_SUMMARY} The hazard level itself never sets a dose.</p> : null}
            </InfoTip>
          </p>
          <p className={`mt-1 flex items-center gap-2 font-cond text-xl font-bold tracking-status ${a.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}`}>
            <ShieldAlert aria-hidden="true" className="h-5 w-5" />
            {a.level}
            <span className="font-sans text-md font-semibold normal-case tracking-normal text-ink">{a.phase}</span>
          </p>
        </div>
        <ProvenanceTag kind={a.source === "scenario" ? "SCENARIO" : "LIVE"} label={a.provenanceLabel} />
      </div>
      <p className="mt-2 text-base text-ink">{a.summary}</p>
      <p className="mt-1 text-base font-semibold text-ink">What to do: <span className="font-normal">{a.nextStep}</span></p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <h4 className="text-base font-semibold text-ink">Relationship to body systems</h4>
          <ul className="mt-1.5 space-y-1.5">
            {a.relations.map((r) => (
              <li key={r.id} className="rounded-tile border border-line px-3 py-2">
                <p className="flex items-center gap-2 text-sm">
                  <span className="chip-tag border-line-strong text-ink-2">{r.relation}</span>
                  <InfoTip label={BODY_SYSTEMS[r.id].shortName}>{r.text}</InfoTip>
                  <button type="button" className="link text-sm" onClick={() => openGuidance({ kind: "system", id: r.id })}>
                    {BODY_SYSTEMS[r.id].shortName}
                  </button>
                </p>
                <p className="mt-0.5 text-2xs text-ink-3">Watch: {r.indicators.map((m) => METRIC_GUIDANCE[m].shortName).join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-base font-semibold text-ink">Protective action sequence (in priority order)</h4>
          {sequence ? (
            <ul className="mt-1.5">
              <FollowUpCard f={sequence} day={day} />
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ArrivalCell({ location, a, last, now }: { location: ForecastLocation; a: CmeArrival | undefined; last: CmeArrival | undefined; now: number }) {
  return (
    <div className="bg-panel px-3 py-3">
      <p className="label">{location === "Mars" ? "At Mars (Ares transit reference)" : "At Earth (mission control)"}</p>
      {a ? (
        <>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-md font-semibold text-ink">
            <span>{formatRelative(a.arrivalTime, now)}</span>
            <span className="num text-sm font-normal text-ink-2">{formatLocalDateTime(a.arrivalTime)}</span>
          </p>
          <p className="mt-0.5 text-sm text-ink-2">
            {a.glancingBlow ? "Glancing blow predicted" : "Direct arrival predicted"}
            {a.cmeSpeedKms ? (
              <>
                {", CME launched at "}
                <span className="num">{Math.round(a.cmeSpeedKms)}</span> km/s
              </>
            ) : null}
            .
          </p>
          {a.link ? (
            <a href={a.link} target="_blank" rel="noopener noreferrer" className="link mt-1 inline-flex items-center gap-1 text-xs">
              Model run {a.simulationId}
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink">No CME arrival predicted ahead.</p>
          <p className="mt-0.5 text-xs text-ink-2">
            {last ? (
              <>
                Last predicted arrival {formatRelative(last.arrivalTime, now)} (<span className="num">{formatLocalDateTime(last.arrivalTime)}</span>){last.glancingBlow ? ", glancing blow" : ""}.
              </>
            ) : (
              "None in model runs from the last 10 days."
            )}
          </p>
        </>
      )}
    </div>
  );
}

/** NASA CCMC WSA-ENLIL model forecasts of CMEs reaching Earth and Mars. */
function CmeForecastCard() {
  const fc = useCmeForecast();
  const now = useNow(60_000).getTime();
  const tag = fc.source === "live" ? { kind: "LIVE" as const, label: "LIVE" } : fc.source === "cached" ? { kind: "CACHED" as const, label: "CACHED" } : { kind: "UNAVAILABLE" as const, label: "NOT LOADED" };
  return (
    <div className="mt-4 rounded-tile border border-line">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 pt-3">
        <div>
          <h3 className="flex items-center gap-2 font-cond text-md font-bold text-ink">
            <Sun aria-hidden="true" className="h-4 w-4 text-caution" />
            Solar storm forecast: Earth and Mars
            <InfoTip label="Solar storm forecast">
              <p>When the next coronal mass ejection is predicted to arrive, from NASA&apos;s WSA-ENLIL model runs in DONKI. A forecast, not an observation; arrival times are often off by half a day or more.</p>
              <p className="text-xs">The model reports planets and spacecraft, not the Ares ship, so Mars stands in for a Mars transit. It never sets a dose or a health status.</p>
            </InfoTip>
          </h3>
        </div>
        <ProvenanceTag kind={tag.kind} label={tag.label} />
      </div>
      <div className="mt-3 grid gap-px border-t border-line bg-line sm:grid-cols-2">
        <ArrivalCell location="Mars" a={nextArrival(fc.arrivals, "Mars", now)} last={lastArrival(fc.arrivals, "Mars", now)} now={now} />
        <ArrivalCell location="Earth" a={nextArrival(fc.arrivals, "Earth", now)} last={lastArrival(fc.arrivals, "Earth", now)} now={now} />
      </div>
      <p className="border-t border-line px-3 py-2 text-2xs text-ink-3">
        {fc.retrievedAt ? `Retrieved ${formatRelative(fc.retrievedAt, now)}${fc.host ? ` from ${fc.host}` : ""}.` : fc.loading ? "Loading the model forecast…" : "No forecast loaded yet. It loads automatically when online."}{" "}
        {fc.error ?? ""}
      </p>
    </div>
  );
}

export function SpaceWeatherPanel() {
  const wx = useSpaceWeather();
  const forecast = useCmeForecast();
  const { advisories, day } = useMissionModel();
  const toast = useToast();
  const now = useNow(30_000).getTime();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [rawOpen, setRawOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<DonkiEventType, number> = { FLR: 0, SEP: 0, CME: 0, NOTIFICATION: 0 };
    for (const e of wx.events) c[e.type]++;
    return c;
  }, [wx.events]);
  const shown = useMemo(() => (filter === "ALL" ? wx.events : wx.events.filter((e) => e.type === filter)), [wx.events, filter]);
  const assessment = advisories.find((a) => a.source === "scenario") ?? advisories.find((a) => a.source === "donki");
  const throttled = now < wx.nextRefreshAt;
  const tag = MODE_TAG[wx.mode];

  return (
    <Panel
      id="weather"
      title="Space weather monitor"
      subtitle={<><p>Solar storms and radiation warnings, in plain words, with their dates.</p><p>This is about the space environment, not your personal dose. Your dosimeter gives your personal dose.</p><p>Source: NASA DONKI (CCMC DONKI API and api.nasa.gov). NOAA SWPC is the official US forecast source. Only date ranges are sent; no health data leaves this browser.</p></>}
      actions={
        <>
          <ProvenanceTag kind={tag.kind} label={tag.label} />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={wx.loading || !wx.online}
            aria-describedby="wx-refresh-hint"
            onClick={async () => {
              void forecast.refresh();
              const r = await wx.refresh();
              toast({ tone: r.ok ? "success" : "warning", title: r.ok ? "Space weather refreshed" : "Space weather not refreshed", body: r.message });
            }}
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${wx.loading ? "animate-spin" : ""}`} />
            {wx.loading ? "Refreshing…" : "Refresh"}
          </button>
        </>
      }
    >
      <p id="wx-refresh-hint" className="sr-only">
        {!wx.online ? "Refresh is unavailable while offline." : throttled ? `Next refresh allowed ${formatRelative(new Date(wx.nextRefreshAt).toISOString(), now)}.` : "Fetch the latest 30 days of DONKI events."}
      </p>

      <HazardAssessment a={assessment} day={day} />

      <CmeForecastCard />

      <p className="mt-4 flex items-center gap-1.5 text-xs text-caution">
        <Radiation aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="font-cond font-bold uppercase tracking-label">Environment only, not personal dose</span>
        <InfoTip label="Not a personal dose">
          <p>Flare class, SEP and CME records describe the space environment near Earth. Personal exposure comes only from the dosimeter or a validated mission model.</p>
          <p className="text-xs">
            The{" "}
            <a href="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp" target="_blank" rel="noopener noreferrer" className="link">
              Canadian Space Agency
            </a>{" "}
            notes neutrons are about 30% of the radiation on the ISS.
          </p>
        </InfoTip>
      </p>

      <details className="group mt-4 rounded-tile border border-line" open={rawOpen} onToggle={(e) => setRawOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-base font-semibold text-ink">Recent solar events near Earth (NASA DONKI)</span>
            <span className="block text-xs text-ink-2">
              <span className="num">{wx.events.length}</span> records: <span className="num">{counts.FLR}</span> flares, <span className="num">{counts.SEP}</span> SEP, <span className="num">{counts.CME}</span> CME, <span className="num">{counts.NOTIFICATION}</span> notices.{" "}
              {wx.lastLiveAt ? `Last live response ${formatRelative(wx.lastLiveAt, now)}.` : "No live response yet this session."}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <ProvenanceTag kind={tag.kind} label={tag.label} />
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
          </span>
        </summary>
        <div className="border-t border-line px-3 pb-3 pt-3">
          <h4 className="text-base font-semibold text-ink">Feed by event type</h4>
          <div className="mt-1.5 overflow-x-auto rounded-tile border border-line">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">Data shown and last request result for each DONKI event type</caption>
              <thead className="bg-panel">
                <tr>
                  {["Type", "Data shown", "Records", "Retrieved", "Last request this session"].map((h) => (
                    <th key={h} scope="col" className="label border-b border-line px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DONKI_TYPES.map((t) => {
                  const s = wx.types[t];
                  const st = SOURCE_TAG[s.source];
                  const la = s.lastAttempt;
                  return (
                    <tr key={t} className="border-b border-line align-top last:border-b-0">
                      <th scope="row" className="px-3 py-2 font-semibold text-ink">
                        {TYPE_LABEL[t]}
                        <span className="num block text-2xs font-normal text-ink-3">{t === "NOTIFICATION" ? "notifications" : t}</span>
                      </th>
                      <td className="px-3 py-2">
                        <ProvenanceTag kind={st.kind} label={st.label} />
                        {s.host ? <span className="block text-2xs text-ink-3">{s.source === "archived" ? "bundled from" : "from"} {s.host}</span> : null}
                      </td>
                      <td className="num px-3 py-2 text-ink">{s.events.length}</td>
                      <td className="px-3 py-2 text-xs text-ink-2">
                        {s.retrievedAt ? formatLocalDateTime(s.retrievedAt) : "—"}
                        {s.rangeStart ? <span className="num block text-2xs text-ink-3">{s.rangeStart} to {s.rangeEnd}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {la ? (
                          la.ok ? (
                            <span className="text-nominal">OK {la.attempts.map((x) => `${x.host} ${x.status ?? ""}`.trim()).join(", then ")}</span>
                          ) : (
                            <span className="text-[#ff8aa0]">UNAVAILABLE: {la.attempts.map((x) => `${x.host} ${x.status ? `HTTP ${x.status}` : (x.error ?? "failed")}`).join("; ")}</span>
                          )
                        ) : (
                          <span className="text-ink-3">{wx.online ? "No request yet this session" : "Offline, not requested"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-xs text-ink-2">
            {wx.lastLiveAt ? `Last live response this session: ${formatLocalDateTime(wx.lastLiveAt)}.` : "No live response yet this session."}{" "}
            {wx.lastAttemptAt ? `Last request ${formatRelative(wx.lastAttemptAt, now)}.` : ""} Key: {usingDemoKey() ? "DEMO_KEY, so the CCMC DONKI API is tried first." : "personal VITE_NASA_API_KEY, so api.nasa.gov is tried first."}
          </p>
          {wx.lastError ? <p className="mt-1 text-xs text-caution" role="status">{wx.lastError}</p> : null}
          {!wx.online ? <p className="mt-1 text-xs text-caution">Browser is offline. The feed is UNAVAILABLE; cached or archived events stay visible with their labels.</p> : null}

          <div className="mt-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter events by type">
            {(["ALL", "FLR", "SEP", "CME", "NOTIFICATION"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-control border px-2.5 py-1 font-cond text-sm font-semibold ${filter === f ? "border-cyan bg-raised text-ink" : "border-line text-ink-2 hover:text-ink"}`}
              >
                {f === "ALL" ? "All" : f === "NOTIFICATION" ? "Notices" : f}
                <span className="num ml-1.5 text-xs text-ink-3">{f === "ALL" ? wx.events.length : counts[f]}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="mt-3 rounded-tile border border-dashed border-line-strong px-3 py-4 text-sm text-ink-2">
              {filter === "ALL" ? "No records in the data shown." : `No ${TYPE_LABEL[filter as DonkiEventType].toLowerCase()} in the data shown (${SOURCE_TAG[wx.types[filter as DonkiEventType].source].label}). A quiet period is a valid result.`}
            </p>
          ) : (
            <ul className="mt-3 max-h-[420px] divide-y divide-line overflow-y-auto overscroll-contain rounded-tile border border-line" aria-label="Space-weather events">
              {shown.map((e) => (
                <EventRow key={`${e.type}-${e.id}`} e={e} />
              ))}
            </ul>
          )}
        </div>
      </details>
    </Panel>
  );
}
