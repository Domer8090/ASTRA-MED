import { memo, useId, useMemo } from "react";
import { MISSION } from "../config/thresholds";
import { COLORS } from "../config/theme";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import type { HealthStatus, ScenarioEvent } from "../types/health";
import { SkipBack, SkipForward } from "lucide-react";
import { padDay } from "../utils/dates";

const TOTAL = MISSION.totalDays;
const TICK_COLOR: Record<HealthStatus, string> = {
  NOMINAL: "#2A4A68",
  CAUTION: COLORS.caution,
  CRITICAL: COLORS.critical,
};

/** 180 status ticks. Memoised: only redraws when statuses or the selected day change. */
const EVENT_COLOR = { health: COLORS.caution, environment: COLORS.blue, operations: COLORS.ink3 } as const;

const Ticks = memo(function Ticks({ statuses, day, manualDays, events }: { statuses: HealthStatus[]; day: number; manualDays: Set<number>; events: ScenarioEvent[] }) {
  return (
    <svg viewBox={`0 0 ${TOTAL} 30`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {statuses.map((s, i) => {
        const d = i + 1;
        const future = d > day;
        const h = s === "NOMINAL" ? 14 : s === "CAUTION" ? 20 : 24;
        return <rect key={d} x={i + 0.18} y={26 - h} width={0.64} height={h} fill={TICK_COLOR[s]} opacity={future ? 0.32 : 1} />;
      })}
      {[...manualDays].map((d) => (
        <rect key={`m${d}`} x={d - 1 + 0.18} y={0} width={0.64} height={3} fill={COLORS.cyan} />
      ))}
      <rect x={0} y={27.5} width={TOTAL} height={0.6} fill="#1D344B" />
      {events.map((e) => (
        <rect key={e.id} x={e.startDay - 1} y={28.6} width={e.endDay - e.startDay + 1} height={1.4} fill={EVENT_COLOR[e.kind]}>
          <title>{`${e.title}: days ${e.startDay}–${e.endDay}`}</title>
        </rect>
      ))}
    </svg>
  );
});

export function MissionTrack() {
  const { day, dayStatus, scenario, measurements } = useMissionModel();
  const store = useMissionStore();
  const inputId = useId();
  const manualDays = useMemo(() => new Set(measurements.map((m) => m.missionDay)), [measurements]);

  const alertDays = useMemo(() => dayStatus.map((s, i) => (s === "NOMINAL" ? 0 : i + 1)).filter(Boolean), [dayStatus]);
  const prevAlert = [...alertDays].reverse().find((d) => d < day);
  const nextAlert = alertDays.find((d) => d > day);
  const status = dayStatus[day - 1] ?? "NOMINAL";
  const pct = ((day - 0.5) / TOTAL) * 100;

  const counts = useMemo(() => {
    let c = 0;
    let k = 0;
    for (const s of dayStatus) {
      if (s === "CAUTION") c++;
      if (s === "CRITICAL") k++;
    }
    return { c, k };
  }, [dayStatus]);

  return (
    <div className="flex items-center gap-2 border-b border-line bg-space px-3 py-1.5 md:px-5">
      <label htmlFor={inputId} className="label hidden shrink-0 sm:block">
        Day track
        <span className="sr-only">
          . One tick per mission day; tall ticks mark CAUTION or CRITICAL. {counts.c} caution and {counts.k} critical days in this scenario.
        </span>
      </label>
      <button type="button" className="btn btn-ghost min-h-[28px] min-w-[28px] shrink-0 px-1" aria-label="Previous alert day" title="Previous alert day" disabled={prevAlert === undefined} onClick={() => prevAlert && store.setSelectedDay(prevAlert)}>
        <SkipBack aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <div className="track-wrap relative h-7 min-w-0 flex-1 select-none">
        <Ticks statuses={dayStatus} day={day} manualDays={manualDays} events={scenario.events} />
        <div className="track-cursor pointer-events-none absolute -top-0.5 bottom-0 w-[2px] -translate-x-1/2 rounded bg-cyan" style={{ left: `${pct}%` }}>
          <span className={`num absolute top-0 whitespace-nowrap rounded-badge bg-cyan px-1 text-2xs font-semibold leading-[14px] text-space ${pct > 90 ? "right-1.5" : "left-1.5"}`}>
            D{padDay(day)}
          </span>
        </div>
        <input
          id={inputId}
          type="range"
          min={1}
          max={TOTAL}
          step={1}
          value={day}
          onChange={(e) => store.setSelectedDay(Number(e.target.value))}
          aria-valuetext={`Mission day ${day} of ${TOTAL}, ${status}`}
          className="track-range absolute inset-0 h-full w-full"
        />
      </div>
      <button type="button" className="btn btn-ghost min-h-[28px] min-w-[28px] shrink-0 px-1" aria-label="Next alert day" title="Next alert day" disabled={nextAlert === undefined} onClick={() => nextAlert && store.setSelectedDay(nextAlert)}>
        <SkipForward aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Go to scenario ${scenario.code} demo start, day ${scenario.focusDay}`}
        title={`Scenario ${scenario.code} demo starts on day ${scenario.focusDay}`}
        className={`btn btn-ghost min-h-[28px] shrink-0 px-2 text-xs ${day === scenario.focusDay ? "text-cyan" : ""}`}
        onClick={() => store.setSelectedDay(scenario.focusDay)}
      >
        <span className="hidden md:inline">Demo start&nbsp;</span>D{scenario.focusDay}
      </button>
      <p className="sr-only">
        Scenario events: {scenario.events.map((e) => `${e.title}, days ${e.startDay} to ${e.endDay}`).join("; ")}.
      </p>
    </div>
  );
}
