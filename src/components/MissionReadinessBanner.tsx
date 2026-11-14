import { BookOpenCheck, Clock3, Radiation } from "lucide-react";
import { STATUS_TEXT_CLASS } from "../config/theme";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import { useMissionModel } from "../hooks/useMissionModel";
import { useUiActions } from "../hooks/useUi";
import type { HealthStatus } from "../types/health";
import { formatLocalDateTime, formatUtcClock, padDay } from "../utils/dates";
import { StatusIcon } from "./shared/StatusBadge";
import { ProvenanceTag } from "./shared/ProvenanceTag";

const FRAME: Record<HealthStatus, string> = {
  NOMINAL: "border-nominal/35",
  CAUTION: "border-caution/50",
  CRITICAL: "border-critical/60",
};

const CELL: Record<HealthStatus, string> = {
  NOMINAL: "text-nominal",
  CAUTION: "text-caution",
  CRITICAL: "text-critical",
};

export function MissionReadinessBanner() {
  const { overall, readiness, primaryAction, lastReading, day, advisories } = useMissionModel();
  const { openGuidance } = useUiActions();
  const total = overall.counts.NOMINAL + overall.counts.CAUTION + overall.counts.CRITICAL;
  const activeAlerts = overall.counts.CAUTION + overall.counts.CRITICAL;

  return (
    <section id="overview" aria-labelledby="overview-title" className={`panel scroll-mt-[var(--sticky-offset)] overflow-hidden border ${FRAME[overall.status]}`}>
      <h2 id="overview-title" className="sr-only">
        Mission overview
      </h2>
      <div className="grid gap-px bg-line lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.6fr)_auto_minmax(200px,0.8fr)]">
        <div className="bg-panel px-5 py-4">
          <p className="label">Mission health status</p>
          <p className={`mt-1 flex items-center gap-2 font-cond text-2xl font-bold tracking-status ${STATUS_TEXT_CLASS[overall.status]}`}>
            <StatusIcon status={overall.status} className="h-8 w-8" />
            {overall.status}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Derived from {total} indicators on mission day <span className="num">{padDay(day)}</span>.
          </p>
        </div>

        <div className="flex flex-col gap-3 bg-panel px-5 py-4">
          <div>
            <p className="label">Most important action</p>
            <p className="mt-1 max-w-[68ch] text-md text-ink">{primaryAction.text}</p>
            {overall.drivers[0] ? (
              <p className="mt-1 text-sm text-ink-2">
                Driver: {METRIC_GUIDANCE[overall.drivers[0].metricId].name}, {overall.drivers[0].status}
                {overall.drivers.length > 1 ? `, plus ${overall.drivers.length - 1} more` : ""}.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {primaryAction.guidance ? (
              <button type="button" className="btn btn-secondary" onClick={() => primaryAction.guidance && openGuidance(primaryAction.guidance)}>
                <BookOpenCheck aria-hidden="true" className="h-4 w-4" />
                Open guidance
              </button>
            ) : null}
            {advisories.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-badge border border-caution/50 bg-caution/10 px-2 py-1 font-cond text-xs font-bold uppercase tracking-label text-caution">
                <Radiation aria-hidden="true" className="h-3.5 w-3.5" />
                Environmental hazard advisory, not personal dose
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-line">
          {(["NOMINAL", "CAUTION", "CRITICAL"] as const).map((s) => (
            <div key={s} className="flex min-w-[92px] flex-col justify-center bg-panel px-4 py-3">
              <span className={`flex items-center gap-1 font-cond text-xs font-bold tracking-status ${CELL[s]}`}>
                <StatusIcon status={s} className="h-3.5 w-3.5" />
                {s}
              </span>
              <span className={`num mt-1 text-xl font-semibold ${overall.counts[s] > 0 && s !== "NOMINAL" ? CELL[s] : "text-ink"}`}>{overall.counts[s]}</span>
              <span className="text-2xs text-ink-3">indicators</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-1">
          <div className="bg-panel px-5 py-3">
            <p className="label">Crew readiness</p>
            <p className="mt-0.5 flex items-baseline gap-1">
              <span className="num text-xl font-semibold text-ink">{readiness.score}</span>
              <span className="num text-sm text-ink-3">/100</span>
            </p>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${readiness.score}%` }} />
            </div>
            <p className="mt-1 text-2xs text-ink-3">Prototype engagement score, not a medical clearance.</p>
          </div>
          <div className="bg-panel px-5 py-3">
            <p className="label">Active alerts</p>
            <p className={`num mt-0.5 text-lg font-semibold ${activeAlerts ? "text-caution" : "text-ink"}`}>
              {activeAlerts}
              {advisories.length ? <span className="text-sm text-ink-2"> + {advisories.length} advisory</span> : null}
            </p>
            <p className="label mt-2 flex items-center gap-1">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              Last health check
            </p>
            {lastReading ? (
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-ink">
                <span className="num">
                  D{padDay(lastReading.missionDay)} {lastReading.source === "synthetic" ? formatUtcClock(lastReading.recordedAt) : formatLocalDateTime(lastReading.recordedAt)}
                </span>
                <ProvenanceTag kind={lastReading.source === "synthetic" ? "SYNTHETIC" : "MANUAL"} />
              </p>
            ) : (
              <p className="text-sm text-ink-2">No readings yet</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
