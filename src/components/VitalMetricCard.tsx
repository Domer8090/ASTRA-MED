import { memo } from "react";
import { BookOpen } from "lucide-react";
import { STATUS_COLOR } from "../config/theme";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type { GaugeTrack } from "../engine/gauges";
import type { MetricDiagnostic } from "../types/health";
import { formatLocalDateTime, formatUtcClock, padDay } from "../utils/dates";
import { formatDelta, formatDose, formatMetricValue, isBloodPressure, METRIC_UNITS } from "../utils/formatting";
import { RangeGauge } from "./shared/RangeGauge";
import { ProvenanceTag } from "./shared/ProvenanceTag";
import { Sparkline } from "./shared/Sparkline";
import { StatusBadge } from "./shared/StatusBadge";

interface Props {
  diagnostic: MetricDiagnostic;
  spark: (number | null)[];
  tracks: GaugeTrack[] | null;
  dailyDose?: number;
  onOpen: () => void;
}

const BORDER = { NOMINAL: "border-line hover:border-line-strong", CAUTION: "border-caution/55 hover:border-caution", CRITICAL: "border-critical/60 hover:border-critical" } as const;

export const VitalMetricCard = memo(function VitalMetricCard({ diagnostic: d, spark, tracks, dailyDose, onOpen }: Props) {
  const g = METRIC_GUIDANCE[d.metricId];
  const latest = d.latest;
  const unit = METRIC_UNITS[d.metricId];
  const valueText = latest ? formatMetricValue(d.metricId, latest.value) : "—";
  const delta = latest ? formatDelta(d.metricId, latest.value, d.previous?.value) : null;
  const gaugeValues = latest
    ? isBloodPressure(latest.value)
      ? [latest.value.systolic, latest.value.diastolic]
      : typeof latest.value === "number"
        ? [latest.value]
        : []
    : [];
  const stamp = latest
    ? latest.source === "synthetic"
      ? `D${padDay(latest.missionDay)} ${formatUtcClock(latest.recordedAt)}`
      : `D${padDay(latest.missionDay)} ${formatLocalDateTime(latest.recordedAt)}`
    : "No reading";
  const isRadiation = d.metricId === "radiation";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${g.name}: ${latest ? `${valueText} ${unit}` : "no reading"}, ${d.status}. ${d.summary} Open guidance.`}
      className={`group flex min-w-0 flex-col gap-2 rounded-tile border bg-panel p-3.5 text-left transition-colors duration-150 ${BORDER[d.status]}`}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="font-cond text-md font-semibold leading-tight text-ink">{g.name}</span>
        <StatusBadge status={d.status} />
      </div>

      <div className="flex w-full items-end justify-between gap-2">
        <p className="flex min-w-0 items-baseline gap-1.5">
          <span key={valueText} className="t-value num text-xl font-semibold text-ink">
            {valueText}
          </span>
          <span className="num text-sm text-ink-2">{unit}</span>
        </p>
        <p className="num shrink-0 text-right text-xs text-ink-2">
          {isRadiation && dailyDose !== undefined ? (
            <>
              <span className="text-ink">+{formatDose(dailyDose)}</span>
              <span className="block text-2xs text-ink-3">today</span>
            </>
          ) : delta ? (
            <>
              <span className="text-ink">{delta}</span>
              <span className="block text-2xs text-ink-3">vs D{padDay(d.previous?.missionDay ?? 0)}</span>
            </>
          ) : null}
        </p>
      </div>

      <Sparkline values={spark} color={STATUS_COLOR[d.status]} />

      {tracks ? (
        <RangeGauge tracks={tracks} values={gaugeValues} />
      ) : (
        <p className="text-2xs leading-4 text-ink-3">{isRadiation ? "Personal dosimeter. No configured cumulative limit; mission-dependent." : " "}</p>
      )}

      <div className="mt-auto flex w-full items-center justify-between gap-2 border-t border-line pt-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="num truncate text-2xs text-ink-2">{stamp}</span>
          {latest ? <ProvenanceTag kind={latest.source === "synthetic" ? "SYNTHETIC" : "MANUAL"} /> : null}
          {d.freshness === "stale" ? <ProvenanceTag kind="PARTIAL" label="STALE" /> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-cond text-xs font-semibold text-ink-2 group-hover:text-cyan">
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
          Guide
        </span>
      </div>
    </button>
  );
});
