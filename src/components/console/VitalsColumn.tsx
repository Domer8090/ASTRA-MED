import { memo, useMemo } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { STATUS_COLOR } from "../../config/theme";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { gaugeTracks, type GaugeTrack } from "../../engine/gauges";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useUiActions, useUiState } from "../../hooks/useUi";
import { sparkValues } from "../../services/chartSeries";
import { PRIMARY_METRIC_IDS, type MetricDiagnostic, type MetricId } from "../../types/health";
import { padDay } from "../../utils/dates";
import { formatDelta, formatDose, formatMetricValue, isBloodPressure, METRIC_UNITS } from "../../utils/formatting";
import { InfoTip } from "../shared/InfoTip";
import { RangeGauge } from "../shared/RangeGauge";
import { Sparkline } from "../shared/Sparkline";
import { StatusIcon } from "../shared/StatusBadge";
import { useConsoleFocus, useSelectedSystem } from "./useConsoleFocus";

interface RowProps {
  d: MetricDiagnostic;
  spark: (number | null)[];
  tracks: GaugeTrack[] | null;
  inSystem: boolean;
  focused: boolean;
  dailyDose: number | undefined;
  trending: boolean;
  onFocus: (id: MetricId) => void;
}

const VitalRow = memo(function VitalRow({ d, spark, tracks, inSystem, focused, dailyDose, trending, onFocus }: RowProps) {
  const g = METRIC_GUIDANCE[d.metricId];
  const v = d.latest?.value;
  const text = v === undefined ? "—" : formatMetricValue(d.metricId, v);
  const delta = d.metricId === "radiation" ? (dailyDose !== undefined ? `+${formatDose(dailyDose)}` : null) : v === undefined ? null : formatDelta(d.metricId, v, d.previous?.value);
  const gaugeValues = v === undefined ? [] : isBloodPressure(v) ? [v.systolic, v.diastolic] : typeof v === "number" ? [v] : [];
  const tone = d.status === "CRITICAL" ? "text-critical" : d.status === "CAUTION" ? "text-caution" : "text-nominal";

  return (
    <li>
      <button
        type="button"
        aria-pressed={focused}
        onClick={() => onFocus(d.metricId)}
        aria-label={`${g.name}: ${text} ${METRIC_UNITS[d.metricId]}, ${d.status}. Show in console.`}
        className={`group grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-tile border px-3 py-2 text-left transition-colors duration-150 ${
          focused ? "border-cyan bg-raised" : inSystem ? "border-line-strong bg-raised/60" : "border-transparent hover:border-line hover:bg-raised/40"
        } ${inSystem || focused ? "" : "opacity-80 hover:opacity-100"}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={tone}>
            <StatusIcon status={d.status} className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-cond text-sm font-semibold text-ink">{g.shortName}</span>
          {d.status !== "NOMINAL" ? <span className={`font-cond text-2xs font-bold tracking-status ${tone}`}>{d.status}</span> : <span className="sr-only">NOMINAL</span>}
          {trending ? (
            <span className="text-cyan" title="Trend watch: heading toward a caution limit">
              <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only">, trend watch</span>
            </span>
          ) : null}
        </span>
        <span className="flex items-baseline justify-end gap-1">
          <span key={text} className="t-value num text-md font-semibold text-ink">{text}</span>
          <span className="num text-2xs text-ink-3">{METRIC_UNITS[d.metricId]}</span>
        </span>
        <span className="min-w-0">{tracks ? <RangeGauge tracks={tracks} values={gaugeValues} /> : <Sparkline values={spark} color={STATUS_COLOR[d.status]} className="h-4 w-full" />}</span>
        <span className="num text-right text-2xs text-ink-2">{delta ?? ""}</span>
      </button>
    </li>
  );
});

export function VitalsColumn() {
  const { diagnostics, days, day, settings, trends } = useMissionModel();
  const { system: selectedSystem } = useSelectedSystem();
  const { selectedMetric } = useUiState();
  const { openLog } = useUiActions();
  const { focusMetric } = useConsoleFocus();
  const system = BODY_SYSTEMS[selectedSystem];

  const sparks = useMemo(() => Object.fromEntries(PRIMARY_METRIC_IDS.map((m) => [m, sparkValues(days, m, day, 14)])) as Record<MetricId, (number | null)[]>, [days, day]);
  const tracks = useMemo(
    () => Object.fromEntries([...PRIMARY_METRIC_IDS, "hydration" as const].map((m) => [m, gaugeTracks(m, settings.aredTargetMinutes, settings.hydrationTargetLiters)])) as Record<string, GaugeTrack[] | null>,
    [settings.aredTargetMinutes, settings.hydrationTargetLiters],
  );
  const extra = system.metrics.filter((m) => !(PRIMARY_METRIC_IDS as readonly MetricId[]).includes(m));
  const dailyDose = days[day - 1]?.dailyRadiationMsv;

  const row = (m: MetricId) => (
    <VitalRow
      key={m}
      d={diagnostics[m]}
      spark={sparks[m] ?? sparkValues(days, m, day, 14)}
      tracks={tracks[m] ?? null}
      inSystem={system.metrics.includes(m)}
      focused={selectedMetric === m}
      dailyDose={m === "radiation" ? dailyDose : undefined}
      trending={trends.some((t) => t.metricId === m)}
      onFocus={(id) => focusMetric(id, system.metrics.includes(id) ? selectedSystem : undefined)}
    />
  );

  return (
    <section aria-labelledby="vitals-title" id="vitals" className="panel flex min-w-0 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-1">
          <h2 id="vitals-title" className="font-cond text-md font-bold uppercase tracking-label text-ink">
            Crew vitals
          </h2>
          <InfoTip label="Crew vitals">
            <p>
              Latest reading of each indicator on day <span className="num">{padDay(day)}</span>. Highlighted rows belong to the selected system ({system.shortName.toLowerCase()}). Select a row to see its detail.
            </p>
            <p>Bar: green is the reference range, amber caution, red critical. The number under the value is the change since the last reading.</p>
            <p>Values are synthetic demo telemetry unless marked MANUAL or TUESDAY.</p>
          </InfoTip>
        </div>
        <button type="button" className="btn btn-primary min-h-[32px] px-2.5 text-xs" onClick={() => openLog({ metricId: selectedMetric ?? system.metrics[0] ?? "heartRate", day })}>
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Log
        </button>
      </header>
      <ul className="flex flex-col gap-1 p-2" aria-label="Required health indicators">
        {PRIMARY_METRIC_IDS.map(row)}
      </ul>
      {extra.length ? (
        <div className="border-t border-line p-2">
          <p className="label px-2 pb-1 pt-1">Also tracked for {system.shortName.toLowerCase()}</p>
          <ul className="flex flex-col gap-1">{extra.map(row)}</ul>
        </div>
      ) : null}
    </section>
  );
}
