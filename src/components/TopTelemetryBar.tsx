import { ChevronLeft, ChevronRight, CloudOff, Globe, Satellite, Wifi, WifiOff } from "lucide-react";
import { MISSION } from "../config/thresholds";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import { useNow } from "../hooks/useNow";
import { useSpaceWeather } from "../hooks/useSpaceWeather";
import { useUiActions } from "../hooks/useUi";
import { useTuesday } from "../hooks/useTuesday";
import { formatLocalDate, formatLocalTime, formatMet, padDay } from "../utils/dates";
import { BrandMark } from "./BrandMark";
import { ReadinessIndicator } from "./ReadinessIndicator";
import { ScenarioSelector } from "./ScenarioSelector";
import { StatusIcon } from "./shared/StatusBadge";
import { STATUS_TEXT_CLASS } from "../config/theme";
import { TuesdayMark } from "./tuesday/TuesdayMark";
import type { SpaceWeatherMode } from "../types/health";

function Cell({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col justify-center border-l border-line px-3 first:border-l-0 ${className}`}>
      <span className="label">{label}</span>
      <div className="mt-0.5 min-w-0">{children}</div>
    </div>
  );
}

function MetClock({ day }: { day: number }) {
  const now = useNow(1000);
  return (
    <span className="num text-md font-medium text-ink" aria-label={`Mission elapsed time ${formatMet(day, now)}`}>
      {formatMet(day, now)}
    </span>
  );
}

function LocalClock() {
  const now = useNow(1000);
  return (
    <span className="flex flex-col leading-tight">
      <span className="num text-md font-medium text-ink">{formatLocalTime(now)}</span>
      <span className="text-2xs text-ink-3">{formatLocalDate(now)}</span>
    </span>
  );
}

const WX_STYLE: Record<SpaceWeatherMode, string> = {
  LIVE: "text-nominal",
  PARTIAL: "text-caution",
  CACHED: "text-[#8cb4ff]",
  ARCHIVED: "text-ink-2",
  UNAVAILABLE: "text-[#ff8aa0]",
};

/** Persistent reminder that health readings, adherence history, XP and targets are demo data. */
function DemoDataChip({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="chip-tag whitespace-nowrap border-line-strong bg-raised text-ink hover:border-cyan"
      title="Health telemetry, adherence history, XP, streaks and countermeasure targets are synthetic demo data. NASA DONKI space weather is real. Select for the Overview."
    >
      DEMO DATA
      <span className="sr-only">: synthetic health telemetry and adherence history. Open the Overview.</span>
    </button>
  );
}

export function DayStepper() {
  const store = useMissionStore();
  const { day } = useMissionModel();
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-ghost min-h-[32px] min-w-[32px] px-1" aria-label="Previous mission day" disabled={day <= 1} onClick={() => store.setSelectedDay(day - 1)}>
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <span className="num whitespace-nowrap text-md font-semibold text-ink" aria-live="polite">
        <span className="sr-only">Mission day </span>
        {padDay(day)}
        <span className="text-ink-3"> / {MISSION.totalDays}</span>
      </span>
      <button type="button" className="btn btn-ghost min-h-[32px] min-w-[32px] px-1" aria-label="Next mission day" disabled={day >= MISSION.totalDays} onClick={() => store.setSelectedDay(day + 1)}>
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TopTelemetryBar() {
  const { day, overall } = useMissionModel();
  const { mode, online, types } = useSpaceWeather();
  const liveHosts = new Set(Object.values(types).filter((t) => t.source === "live").map((t) => t.host));
  const shownSources = new Set(Object.values(types).map((t) => t.source));
  const wxSource =
    mode === "UNAVAILABLE"
      ? `showing ${[...shownSources].join(" + ")}`
      : mode === "ARCHIVED"
        ? "May 2024 archive"
        : mode === "CACHED"
          ? "saved earlier"
          : liveHosts.size > 1
            ? "mixed NASA hosts"
            : liveHosts.has("ccmc.gsfc.nasa.gov")
              ? "via CCMC DONKI API"
              : "via api.nasa.gov";
  const { openSources } = useUiActions();
  const tuesday = useTuesday();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-space">
      <div className="flex h-[var(--topbar-h)] items-stretch">
        <div className="flex items-center gap-2 px-3 lg:hidden">
          <BrandMark className="h-7 w-7" />
          <span className="hidden whitespace-nowrap font-cond text-md font-bold tracking-label min-[400px]:inline">ASTRA-MED</span>
        </div>
        <Cell label="Mission" className="hidden md:flex">
          <span className="flex min-w-0 items-center gap-2">
            <span className="block min-w-0 truncate font-cond text-md font-semibold text-ink" title={`${MISSION.name}. Crew ${MISSION.crewLabel}.`}>
              {MISSION.name}
            </span>
            <DemoDataChip onOpen={() => openSources("about")} />
          </span>
        </Cell>
        <Cell label="Crew" className="hidden 2xl:flex">
          <span className="whitespace-nowrap text-sm text-ink" title={MISSION.crewLabel}>
            <span className="num font-medium">{MISSION.crewId}</span> <span className="text-ink-3">demo identity</span>
          </span>
        </Cell>
        <Cell label="Mission day" className="ml-auto md:ml-0">
          <DayStepper />
        </Cell>
        <Cell label="MET (replay)" className="hidden lg:flex">
          <span title={`Mission elapsed time, DDD/HH:MM:SS. Day ${day} runs from MET ${String(day - 1).padStart(3, "0")}/00:00:00 to ${String(day - 1).padStart(3, "0")}/23:59:59. Replay: day from the track, time of day from your clock in UTC (ship time).`}>
            <MetClock day={day} />
          </span>
        </Cell>
        <div className="hidden items-center border-l border-line px-3 md:flex">
          <ScenarioSelector />
        </div>
        <div className="hidden items-center border-l border-line px-3 lg:flex">
          <button
            type="button"
            onClick={() => tuesday.setTuesdayMode(!tuesday.tuesdayMode)}
            className={`flex items-center gap-1.5 rounded-tile border px-2.5 py-1 font-cond text-xs font-semibold transition-colors ${
              tuesday.tuesdayMode
                ? "border-tue bg-tue/20 text-tue"
                : "border-line bg-raised text-tue hover:border-tue hover:bg-tue/10"
            }`}
            title="Switch to Tuesday mode"
          >
            <TuesdayMark className="h-4 w-4" />
            <span>TUESDAY MODE</span>
          </button>
        </div>
        <Cell label="Network" className="hidden xl:flex">
          <span className={`flex items-center gap-1.5 font-cond text-sm font-bold tracking-status ${online ? "text-ink" : "text-caution"}`}>
            {online ? <Wifi aria-hidden="true" className="h-4 w-4" /> : <WifiOff aria-hidden="true" className="h-4 w-4" />}
            {online ? "ONLINE" : "OFFLINE"}
          </span>
        </Cell>
        <Cell label="Space weather" className="hidden sm:flex">
          <button type="button" onClick={() => document.getElementById("weather")?.scrollIntoView({ block: "start" })} className={`flex items-center gap-1.5 font-cond text-sm font-bold tracking-status ${WX_STYLE[mode]}`} title="NASA DONKI data state">
            {mode === "LIVE" || mode === "PARTIAL" ? <Satellite aria-hidden="true" className="h-4 w-4" /> : mode === "CACHED" || mode === "ARCHIVED" ? <Globe aria-hidden="true" className="h-4 w-4" /> : <CloudOff aria-hidden="true" className="h-4 w-4" />}
            {mode === "PARTIAL" ? "PARTIAL LIVE" : mode}
            <span className="hidden font-sans text-2xs font-normal normal-case tracking-normal text-ink-3 xl:inline">{wxSource}</span>
          </button>
        </Cell>
        <Cell label="Local time" className="hidden 2xl:flex">
          <LocalClock />
        </Cell>
        <Cell label="Status" className="flex">
          <span className={`flex items-center gap-1 font-cond text-sm font-bold tracking-status ${STATUS_TEXT_CLASS[overall.status]}`}>
            <StatusIcon status={overall.status} className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">{overall.status}</span>
          </span>
        </Cell>
        <Cell label="Readiness" className="hidden sm:flex">
          <ReadinessIndicator />
        </Cell>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-1.5 md:hidden">
        <ScenarioSelector compact />
        <button
          type="button"
          onClick={() => tuesday.setTuesdayMode(!tuesday.tuesdayMode)}
          className={`flex items-center gap-1 rounded-tile border px-2 py-0.5 font-cond text-xs font-semibold ${
            tuesday.tuesdayMode ? "border-tue bg-tue/20 text-tue" : "border-line bg-raised text-tue"
          }`}
        >
          <TuesdayMark className="h-3.5 w-3.5" />
          <span>Tuesday</span>
        </button>
        <DemoDataChip onOpen={() => openSources("about")} />
        <span className={`flex items-center gap-1 font-cond text-xs font-bold ${online ? "text-ink-2" : "text-caution"}`}>
          {online ? <Wifi aria-hidden="true" className="h-3.5 w-3.5" /> : <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />}
          {online ? "ONLINE" : "OFFLINE"}
        </span>
        <span className={`font-cond text-xs font-bold sm:hidden ${WX_STYLE[mode]}`}>WX {mode === "PARTIAL" ? "PARTIAL" : mode}</span>
      </div>
    </header>
  );
}
