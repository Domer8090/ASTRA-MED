import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Radiation, RefreshCw } from "lucide-react";
import { FALLBACK_PROVENANCE } from "../data/fallbackDonki";
import { useMissionModel } from "../hooks/useMissionModel";
import { useNow } from "../hooks/useNow";
import { useSpaceWeather } from "../hooks/useSpaceWeather";
import { useToast } from "../hooks/useToast";
import { usingDemoKey } from "../services/nasaDonkiApi";
import type { DonkiEvent, DonkiEventType, SpaceWeatherMode } from "../types/health";
import { formatLocalDateTime, formatRelative, padDay } from "../utils/dates";
import { Panel } from "./shared/Panel";
import { ProvenanceTag, type Provenance } from "./shared/ProvenanceTag";

const TYPE_LABEL: Record<DonkiEventType, string> = {
  FLR: "Solar flare",
  SEP: "Solar energetic particle event",
  CME: "Coronal mass ejection",
  NOTIFICATION: "DONKI notification",
};

const MODE_TAG: Record<SpaceWeatherMode, { kind: Provenance; label: string }> = {
  LIVE: { kind: "LIVE", label: "LIVE" },
  PARTIAL: { kind: "PARTIAL", label: "LIVE, PARTIAL" },
  CACHED: { kind: "CACHED", label: "CACHED" },
  DEMO: { kind: "FALLBACK", label: "DEMO / OFFLINE FALLBACK" },
};

const SOURCE_TAG: Record<DonkiEvent["dataSource"], { kind: Provenance; label: string }> = {
  live: { kind: "LIVE", label: "LIVE" },
  cached: { kind: "CACHED", label: "CACHED" },
  fallback: { kind: "FALLBACK", label: "DEMO / OFFLINE FALLBACK" },
};

type Filter = "ALL" | DonkiEventType;

function EventRow({ e }: { e: DonkiEvent }) {
  const [open, setOpen] = useState(false);
  const id = `ev-${e.id.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_64px]">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-raised/60">
        <span className={`mt-0.5 w-12 shrink-0 font-cond text-xs font-bold tracking-label ${e.type === "SEP" ? "text-caution" : e.type === "FLR" ? "text-[#f8c36b]" : e.type === "CME" ? "text-blue" : "text-ink-2"}`}>{e.type === "NOTIFICATION" ? "NOTICE" : e.type}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base text-ink">{e.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-2">
            <span className="num">{formatLocalDateTime(e.startTime)}</span>
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

export function SpaceWeatherPanel() {
  const wx = useSpaceWeather();
  const { advisories, day, scenario } = useMissionModel();
  const toast = useToast();
  const now = useNow(30_000).getTime();
  const [filter, setFilter] = useState<Filter>("ALL");

  const counts = useMemo(() => {
    const c: Record<DonkiEventType, number> = { FLR: 0, SEP: 0, CME: 0, NOTIFICATION: 0 };
    for (const e of wx.events) c[e.type]++;
    return c;
  }, [wx.events]);
  const shown = useMemo(() => (filter === "ALL" ? wx.events : wx.events.filter((e) => e.type === filter)), [wx.events, filter]);
  const scenarioAdvisory = advisories.find((a) => a.source === "scenario");
  const donkiAdvisory = advisories.find((a) => a.source === "donki");
  const throttled = now < wx.nextRefreshAt;
  const tag = MODE_TAG[wx.mode];

  const statusText =
    wx.mode === "DEMO"
      ? `Showing archived DONKI records from ${FALLBACK_PROVENANCE.window.start} to ${FALLBACK_PROVENANCE.window.end}. These are not current conditions.`
      : counts.SEP > 0
        ? `${counts.SEP} SEP event${counts.SEP === 1 ? "" : "s"} and ${counts.FLR} flare${counts.FLR === 1 ? "" : "s"} recorded in the last 30 days.`
        : `${counts.FLR} flare${counts.FLR === 1 ? "" : "s"} and ${counts.CME} CME${counts.CME === 1 ? "" : "s"} recorded in the last 30 days. No SEP event recorded.`;

  return (
    <Panel
      id="weather"
      title="Space weather monitor"
      subtitle="Environmental hazard context from NASA DONKI and the mission scenario. Never a personal dose."
      actions={
        <>
          <ProvenanceTag kind={tag.kind} label={tag.label} />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={wx.loading || !wx.online}
            aria-describedby="wx-refresh-hint"
            onClick={async () => {
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

      <div className="flex items-start gap-3 rounded-tile border border-caution/40 bg-caution/[0.06] px-3 py-2.5">
        <Radiation aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
        <p className="text-sm text-ink">
          <span className="font-cond font-bold uppercase tracking-label text-caution">Environmental hazard, not personal dose. </span>
          Flare class, SEP and CME records describe the space environment. Your exposure comes only from your dosimeter or a validated mission model.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-tile border border-line p-3">
          <p className="label">Mission environment, day {padDay(day)}</p>
          {scenarioAdvisory ? (
            <div className="mt-1.5">
              <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-caution">
                {scenarioAdvisory.title}
                <ProvenanceTag kind="SCENARIO" label="SCENARIO SIMULATION" />
              </p>
              <p className="mt-1 text-sm text-ink-2">{scenarioAdvisory.summary}</p>
              <p className="mt-1.5 text-sm text-ink">
                <span className="font-semibold text-cyan">Next: </span>
                {scenarioAdvisory.nextStep}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-ink-2">
              No simulated space-weather event on this day in scenario {scenario.code}. {scenario.id === "sep" ? "The simulated SEP runs on days 131–133." : "Scenario C simulates a solar particle event."}
            </p>
          )}
        </div>
        <div className="rounded-tile border border-line p-3">
          <p className="label">NASA DONKI feed</p>
          <p className="mt-1.5 text-sm text-ink">{statusText}</p>
          {donkiAdvisory ? <p className="mt-1 text-sm font-semibold text-caution">{donkiAdvisory.title}. {donkiAdvisory.nextStep}</p> : null}
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-ink-3">Data shown</dt>
            <dd className="text-ink-2">
              {wx.mode === "DEMO" ? `Bundled fallback, retrieved ${formatLocalDateTime(FALLBACK_PROVENANCE.retrievedAt)}` : `Fetched ${formatLocalDateTime(wx.dataFetchedAt ?? undefined)} (${formatRelative(wx.dataFetchedAt ?? undefined, now)})`}
            </dd>
            <dt className="text-ink-3">Last live fetch</dt>
            <dd className="text-ink-2">{wx.dataFetchedAt ? formatLocalDateTime(wx.dataFetchedAt) : "Never on this device"}</dd>
            <dt className="text-ink-3">Events</dt>
            <dd className="num text-ink-2">{wx.events.length}</dd>
            <dt className="text-ink-3">API key</dt>
            <dd className="text-ink-2">{usingDemoKey() ? "DEMO_KEY (rate-limited)" : "Personal key from VITE_NASA_API_KEY"}</dd>
          </dl>
          {wx.endpoints.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Endpoint results">
              {wx.endpoints.map((r) => (
                <li key={r.type} className={`chip-tag ${r.ok ? "border-nominal/40 text-nominal" : "border-critical/50 text-[#ff8aa0]"}`} title={r.ok ? `Loaded from ${r.host}` : r.error}>
                  {r.type === "NOTIFICATION" ? "NOTICES" : r.type} {r.ok ? `OK ${r.host === "ccmc.gsfc.nasa.gov" ? "(CCMC)" : ""}` : "FAILED"}
                </li>
              ))}
            </ul>
          ) : null}
          {wx.lastError ? <p className="mt-2 text-xs text-caution" role="status">{wx.lastError}</p> : null}
          {!wx.online ? <p className="mt-2 text-xs text-caution">Browser is offline. Cached or bundled events stay available; nothing is shown as live.</p> : null}
        </div>
      </div>

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
          No {filter === "ALL" ? "" : `${TYPE_LABEL[filter as DonkiEventType].toLowerCase()} `}records in this data set. Choose another type or refresh when online.
        </p>
      ) : (
        <ul className="mt-3 max-h-[420px] divide-y divide-line overflow-y-auto overscroll-contain rounded-tile border border-line" aria-label="Space-weather events">
          {shown.map((e) => (
            <EventRow key={`${e.type}-${e.id}`} e={e} />
          ))}
        </ul>
      )}
      <p className="mt-2 text-2xs text-ink-3">
        Source: NASA DONKI via api.nasa.gov, with the CCMC host as a per-endpoint fallback. DONKI notes that NOAA's Space Weather Prediction Center is the official US source for space-weather forecasts. Only environment data is requested; no health data leaves this browser.
      </p>
    </Panel>
  );
}
