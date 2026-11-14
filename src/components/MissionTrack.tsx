import { memo, useId, useMemo } from "react";
import { MISSION } from "../config/thresholds";
import { COLORS } from "../config/theme";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import type { HealthStatus } from "../types/health";
import { padDay } from "../utils/dates";

const TOTAL = MISSION.totalDays;
const TICK_COLOR: Record<HealthStatus, string> = {
  NOMINAL: "#2A4A68",
  CAUTION: COLORS.caution,
  CRITICAL: COLORS.critical,
};

/** 180 status ticks. Memoised: only redraws when statuses or the selected day change. */
const Ticks = memo(function Ticks({ statuses, day, manualDays }: { statuses: HealthStatus[]; day: number; manualDays: Set<number> }) {
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
    <div className="border-b border-line bg-space px-3 pb-2 pt-2 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <label htmlFor={inputId} className="label flex items-center gap-2">
          Mission day track
          <span className="hidden font-sans text-xs font-normal normal-case tracking-normal text-ink-3 sm:inline">
            One tick per day, tall ticks mark CAUTION or CRITICAL. {counts.c} caution and {counts.k} critical days in this scenario.
          </span>
        </label>
        <div className="relative -mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1">
          <button type="button" className="btn btn-ghost min-h-[28px] shrink-0 px-2 text-xs" onClick={() => store.setSelectedDay(1)}>
            Day 1
          </button>
          <button type="button" className="btn btn-ghost min-h-[28px] shrink-0 px-2 text-xs" disabled={prevAlert === undefined} onClick={() => prevAlert && store.setSelectedDay(prevAlert)}>
            Previous alert
          </button>
          <button type="button" className="btn btn-ghost min-h-[28px] shrink-0 px-2 text-xs" disabled={nextAlert === undefined} onClick={() => nextAlert && store.setSelectedDay(nextAlert)}>
            Next alert
          </button>
          <button type="button" className="btn btn-ghost min-h-[28px] shrink-0 px-2 text-xs" onClick={() => store.setSelectedDay(scenario.focusDay)}>
            Scenario day {scenario.focusDay}
          </button>
          <button type="button" className="btn btn-ghost min-h-[28px] shrink-0 px-2 text-xs" onClick={() => store.setSelectedDay(TOTAL)}>
            Day {TOTAL}
          </button>
        </div>
      </div>

      <div className="track-wrap relative mt-1.5 h-9 select-none">
        <Ticks statuses={dayStatus} day={day} manualDays={manualDays} />
        <div className="track-cursor pointer-events-none absolute -top-0.5 bottom-0 w-[2px] -translate-x-1/2 rounded bg-cyan" style={{ left: `${pct}%` }}>
          <span className="num absolute -top-[1px] left-1.5 whitespace-nowrap rounded-badge bg-cyan px-1 text-2xs font-semibold leading-[14px] text-space">
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

      <div className="relative mt-0.5 hidden h-8 md:block" aria-hidden="true">
        {scenario.events.map((e, i, all) => {
          const left = ((e.startDay - 1) / TOTAL) * 100;
          const width = ((e.endDay - e.startDay + 1) / TOTAL) * 100;
          const color = e.kind === "environment" ? "bg-blue" : e.kind === "operations" ? "bg-ink-3" : "bg-caution/80";
          // Stagger labels onto a second line when the previous event starts too close.
          const prev = all[i - 1];
          const lower = prev !== undefined && e.startDay - prev.startDay < 26 && i % 2 === 1;
          return (
            <div key={e.id} className="absolute top-0 h-8" style={{ left: `${left}%`, width: `max(4px, ${width}%)` }} title={`${e.title}: days ${e.startDay}–${e.endDay}`}>
              <span className={`block h-[3px] w-full rounded-full ${color}`} />
              <span className={`absolute left-0 whitespace-nowrap text-2xs text-ink-3 ${lower ? "top-[17px]" : "top-[5px]"}`}>
                <span className="text-ink-2">D{e.startDay}</span> {e.title}
              </span>
            </div>
          );
        })}
      </div>
      <p className="sr-only">
        Scenario events: {scenario.events.map((e) => `${e.title}, days ${e.startDay} to ${e.endDay}`).join("; ")}.
      </p>
    </div>
  );
}
