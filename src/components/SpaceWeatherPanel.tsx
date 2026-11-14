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
import { formatLocalDateTime, formatRelative, padDay } from "../utils/dates";
import { FollowUpCard } from "./shared/FollowUpCard";
import { Panel } from "./shared/Panel";
import { ProvenanceTag, type Provenance } from "./shared/ProvenanceTag";

const TYPE_LABEL: Record<DonkiEventType, string> = {
  FLR: "Solar flares",
  SEP: "Solar energetic particles",
  CME: "Coronal mass ejections",
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

function EventRow({ e }: { e: DonkiEvent }) {
  const [open, setOpen] = useState(false);
  const id = `ev-${e.type}-${e.id.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_64px]">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-raised/60">
        <span className={`mt-0.5 w-12 shrink-0 font-cond text-xs font-bold tracking-label ${e.type === "SEP" ? "text-caution" : e.type === "FLR" ? "text-[#f8c36b]" : e.type === "CME" ? "text-blue" : "text-ink-2"}`}>{e.type === "NOTIFICATION" ? "NOTICE" : e.type}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base text-ink">{e.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-2">
            <span className="num" title={e.startTime ?? "No start time supplied"}>{e.startTime ? formatLocalDateTime(e.startTime) : "No start time in record"}</span>
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
          <p className="label">Environmental hazard assessment, day {padDay(day)}</p>
          <p className="mt-1 text-sm text-ink">No environmental hazard is active for this mission day.</p>
          <p className="mt-0.5 text-xs text-ink-2">Scenario C simulates a solar particle event: precursor day 130, event days 131–133, all clear day 134.</p>
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
          <p className="label">Environmental hazard assessment, day {padDay(day)}</p>
          <p className={`mt-1 flex items-center gap-2 font-cond text-xl font-bold tracking-status ${a.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}`}>
            <ShieldAlert aria-hidden="true" className="h-5 w-5" />
            {a.level}
            <span className="font-sans text-md font-semibold normal-case tracking-normal text-ink">{a.phase}</span>
          </p>
        </div>
        <ProvenanceTag kind={a.source === "scenario" ? "SCENARIO" : "LIVE"} label={a.provenanceLabel} />
      </div>
      <p className="mt-2 text-sm text-ink">{a.summary}</p>
      <p className="mt-1 text-sm text-ink-2">{a.whyItMatters}</p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <h4 className="label">Relationship to body systems</h4>
          <ul className="mt-1.5 space-y-1.5">
            {a.relations.map((r) => (
              <li key={r.id} className="rounded-tile border border-line px-3 py-2">
                <p className="flex items-center gap-2 text-sm">
                  <span className="chip-tag border-line-strong text-ink-2">{r.relation}</span>
                  <button type="button" className="link text-sm" onClick={() => openGuidance({ kind: "system", id: r.id })}>
                    {BODY_SYSTEMS[r.id].shortName}
                  </button>
                </p>
                <p className="mt-1 text-xs text-ink-2">{r.text}</p>
                <p className="mt-0.5 text-2xs text-ink-3">Watch: {r.indicators.map((m) => METRIC_GUIDANCE[m].shortName).join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="label">Protective action sequence (in priority order)</h4>
          {sequence ? (
            <ul className="mt-1.5">
              <FollowUpCard f={sequence} day={day} />
            </ul>
          ) : null}
        </div>
      </div>
      {a.source === "scenario" ? (
        <p className="mt-3 rounded-tile border border-line px-3 py-2 text-xs text-ink-2">
          <span className="font-semibold text-ink">Dosimeter model: </span>
          {SEP_DOSE_MODEL_SUMMARY} The hazard level itself never sets a dose.
        </p>
      ) : null}
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
          </h3>
          <p className="mt-0.5 max-w-[80ch] text-xs text-ink-2">
            When the next coronal mass ejection is predicted to arrive, from NASA&apos;s WSA-ENLIL model runs in DONKI. A forecast, not an observation; arrival times are often off by half a day or more.
          </p>
        </div>
        <ProvenanceTag kind={tag.kind} label={tag.label} />
      </div>
      <div className="mt-3 grid gap-px border-t border-line bg-line sm:grid-cols-2">
        <ArrivalCell location="Mars" a={nextArrival(fc.arrivals, "Mars", now)} last={lastArrival(fc.arrivals, "Mars", now)} now={now} />
        <ArrivalCell location="Earth" a={nextArrival(fc.arrivals, "Earth", now)} last={lastArrival(fc.arrivals, "Earth", now)} now={now} />
      </div>
      <p className="border-t border-line px-3 py-2 text-2xs text-ink-3">
        {fc.retrievedAt ? `Retrieved ${formatRelative(fc.retrievedAt, now)}${fc.host ? ` from ${fc.host}` : ""}.` : fc.loading ? "Loading the model forecast…" : "No forecast loaded yet. It loads automatically when online."}{" "}
        {fc.error ?? ""} The model reports planets and spacecraft, not the Ares ship, so Mars stands in for a Mars transit. Environmental context only; it never sets a dose or a health status.
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
      subtitle="What the space environment means for the mission now, then the NASA DONKI records behind it. Environmental hazard, never a personal dose."
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

      <div className="mt-4 flex items-start gap-3 rounded-tile border border-caution/35 px-3 py-2.5">
        <Radiation aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
        <p className="text-sm text-ink">
          <span className="font-cond font-bold uppercase tracking-label text-caution">Environmental hazard, not personal dose. </span>
          Flare class, SEP and CME records describe the space environment near Earth. Personal exposure comes only from the dosimeter or a validated mission model.
        </p>
      </div>

      <details className="group mt-4 rounded-tile border border-line" open={rawOpen} onToggle={(e) => setRawOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block font-cond text-sm font-bold text-ink">NASA DONKI event records</span>
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
          <h4 className="label">Feed by event type</h4>
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
      <p className="mt-2 text-2xs text-ink-3">
        Source: NASA DONKI via the CCMC DONKI API (ccmc.gsfc.nasa.gov/DONKI-API) and api.nasa.gov. DONKI notes that NOAA's Space Weather Prediction Center is the official US source for space-weather forecasts. Only date ranges are sent; no health data leaves this browser.
      </p>
    </Panel>
  );
}
