import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Clock3, CloudSun, Ellipsis, GanttChart, RefreshCw, Stethoscope, Wifi, WifiOff } from "lucide-react";
import { MISSION } from "../config/thresholds";
import { STATUS_TEXT_CLASS } from "../config/theme";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import { useNow } from "../hooks/useNow";
import { useSpaceWeather } from "../hooks/useSpaceWeather";
import { useUiActions } from "../hooks/useUi";
import { MEDICAL_OFFICER_HASH } from "../hooks/useView";
import { formatMet, formatMetLong, formatMissionDate } from "../utils/dates";
import { BrandMark } from "./BrandMark";
import { scrollToSection } from "./navigation";
import { ScenarioSelector } from "./ScenarioSelector";
import { StatusIcon } from "./shared/StatusBadge";

export function DayStepper() {
  const store = useMissionStore();
  const { day } = useMissionModel();
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className="btn btn-ghost min-h-[40px] min-w-[40px] px-1" aria-label="Previous mission day" disabled={day <= 1} onClick={() => store.setSelectedDay(day - 1)}>
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <span className="whitespace-nowrap text-sm text-ink-2" aria-live="polite">
        Day <span className="num text-md font-semibold text-ink">{day}</span>
        <span className="hidden min-[420px]:inline"> of {MISSION.totalDays}</span>
      </span>
      <button type="button" className="btn btn-ghost min-h-[40px] min-w-[40px] px-1" aria-label="Next mission day" disabled={day >= MISSION.totalDays} onClick={() => store.setSelectedDay(day + 1)}>
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

function ShipClock({ day }: { day: number }) {
  const now = useNow(1000);
  return <span className="num text-ink">{formatMet(day, now)}</span>;
}

/**
 * Always-visible mission clock: launch date, the selected mission day's date,
 * live mission elapsed time, and progress with days remaining. The mission
 * calendar is the synthetic demo mission's (day 1 = MISSION.epochUtc).
 */
function MissionClockStrip() {
  const { day } = useMissionModel();
  const now = useNow(1000);
  const pct = Math.round((day / MISSION.totalDays) * 100);
  const left = MISSION.totalDays - day;
  const item = "flex items-baseline gap-1.5 whitespace-nowrap";
  const label = "text-xs text-ink-3";
  const value = "text-sm font-semibold text-ink";
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line-soft px-3 py-1.5 md:px-4" aria-label="Mission timeline">
      <span className={`${item} max-md:hidden`}>
        <span className={label}>Launch</span>
        <span className={value}>{formatMissionDate(1)}</span>
      </span>
      <span className={item}>
        <span className={label}>Mission date</span>
        <span className={value}>{formatMissionDate(day)}</span>
      </span>
      <span className={item}>
        <span className={label}>Elapsed (MET)</span>
        <span className={`num ${value}`}>{formatMetLong(day, now)}</span>
      </span>
      <span className="flex min-w-[180px] flex-1 items-center gap-2">
        <span
          className="relative h-2 flex-1 overflow-hidden rounded-full bg-line-soft"
          role="progressbar"
          aria-label="Mission progress"
          aria-valuemin={0}
          aria-valuemax={MISSION.totalDays}
          aria-valuenow={day}
          aria-valuetext={`Day ${day} of ${MISSION.totalDays}, ${left} days to go`}
        >
          <span className="absolute inset-y-0 left-0 rounded-full bg-cyan" style={{ width: `${pct}%` }} />
        </span>
        <span className="whitespace-nowrap text-sm text-ink-2">
          <span className="font-semibold text-ink">{pct}%</span> · {left} days to go<span className="max-md:hidden"> · ends {formatMissionDate(MISSION.totalDays)}</span>
        </span>
      </span>
    </div>
  );
}

/** Secondary controls and readouts, one click away. */
function MoreMenu({ timelineOpen, onToggleTimeline }: { timelineOpen: boolean; onToggleTimeline: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { day } = useMissionModel();
  const { online, mode } = useSpaceWeather();
  const { openSources } = useUiActions();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const item = "flex min-h-[44px] w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm text-ink hover:bg-raised";

  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-ghost min-h-[40px] gap-1.5 px-2.5" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <Ellipsis aria-hidden="true" className="h-5 w-5" />
        <span className="hidden sm:inline">More</span>
      </button>
      {open ? (
        <div className="t-fade-in absolute right-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-24px))] rounded-panel border border-line-strong bg-panel p-2">
          <div className="border-b border-line px-2.5 pb-2.5 pt-1">
            <ScenarioSelector />
          </div>
          <button type="button" className={item} aria-pressed={timelineOpen} onClick={go(onToggleTimeline)}>
            <GanttChart aria-hidden="true" className="h-4 w-4 text-ink-2" />
            {timelineOpen ? "Hide mission timeline" : "Show mission timeline"}
          </button>
          <button type="button" className={item} onClick={go(() => scrollToSection("sync"))}>
            <RefreshCw aria-hidden="true" className="h-4 w-4 text-ink-2" />
            Connect devices
          </button>
          <button type="button" className={item} onClick={go(() => scrollToSection("weather"))}>
            <CloudSun aria-hidden="true" className="h-4 w-4 text-ink-2" />
            Space weather <span className="ml-auto font-mono text-2xs text-ink-2">{mode}</span>
          </button>
          <a className={item} href={MEDICAL_OFFICER_HASH} onClick={() => setOpen(false)}>
            <Stethoscope aria-hidden="true" className="h-4 w-4 text-ink-2" />
            Medical officer view
          </a>
          <button type="button" className={item} onClick={go(() => openSources("about"))}>
            <BookOpen aria-hidden="true" className="h-4 w-4 text-ink-2" />
            About this demo and data sources
          </button>
          <dl className="mt-1 grid grid-cols-2 gap-2 border-t border-line px-2.5 pt-2.5 text-2xs">
            <div>
              <dt className="flex items-center gap-1 text-ink-3">
                <Clock3 aria-hidden="true" className="h-3 w-3" />
                Ship clock (UTC)
              </dt>
              <dd className="mt-0.5 text-xs">
                <ShipClock day={day} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-3">Network</dt>
              <dd className={`mt-0.5 flex items-center gap-1 text-xs ${online ? "text-ink" : "text-caution"}`}>
                {online ? <Wifi aria-hidden="true" className="h-3.5 w-3.5" /> : <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />}
                {online ? "Online" : "Offline"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Slim top bar: brand, day, overall status (word and icon), the SYNTHETIC data
 * label and a More menu for everything else.
 */
export function TopTelemetryBar({ timelineOpen, onToggleTimeline }: { timelineOpen: boolean; onToggleTimeline: () => void }) {
  const { overall } = useMissionModel();
  const { openSources } = useUiActions();

  return (
    <header className="border-b border-line bg-space">
      <div className="flex h-[var(--topbar-h)] items-center gap-2 px-2 md:gap-3 md:px-4">
        <div className="flex items-center gap-2 lg:hidden">
          <BrandMark className="h-7 w-7" />
        </div>
        <span className="hidden font-cond text-md font-bold tracking-label text-ink md:inline">ASTRA-MED</span>
        <DayStepper />
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <span className={`flex items-center gap-1 font-cond text-sm font-bold tracking-status ${STATUS_TEXT_CLASS[overall.status]}`}>
            <StatusIcon status={overall.status} className="h-4 w-4" />
            {overall.status}
          </span>
          <button
            type="button"
            onClick={() => openSources("about")}
            className="chip-tag whitespace-nowrap border-line-strong bg-raised text-ink-2 hover:border-cyan hover:text-ink"
            title="Health readings, task history and scores are synthetic demonstration data, not real astronaut data. Select to learn more."
          >
            SYNTHETIC
            <span className="sr-only"> demonstration data. Open About.</span>
          </button>
          <MoreMenu timelineOpen={timelineOpen} onToggleTimeline={onToggleTimeline} />
        </div>
      </div>
      <MissionClockStrip />
    </header>
  );
}
