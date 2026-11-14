import { useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { gaugeTracks } from "../engine/gauges";
import { useMissionModel } from "../hooks/useMissionModel";
import { useUiActions } from "../hooks/useUi";
import { sparkValues } from "../services/chartSeries";
import { PRIMARY_METRIC_IDS, type MetricId } from "../types/health";
import { padDay } from "../utils/dates";
import { Panel } from "./shared/Panel";
import { ProvenanceTag } from "./shared/ProvenanceTag";
import { VitalMetricCard } from "./VitalMetricCard";

const ORDER: MetricId[] = ["heartRate", "bloodPressure", "bloodGlucose", "bodyTemperature", "sleep", "mood", "aredMinutes", "radiation"];

export function VitalsGrid() {
  const { diagnostics, days, day, settings } = useMissionModel();
  const { openGuidance, openLog } = useUiActions();

  const sparks = useMemo(() => Object.fromEntries(ORDER.map((m) => [m, sparkValues(days, m, day, 14)])) as Record<MetricId, (number | null)[]>, [days, day]);
  const tracks = useMemo(
    () => Object.fromEntries(ORDER.map((m) => [m, gaugeTracks(m, settings.aredTargetMinutes, settings.hydrationTargetLiters)])),
    [settings.aredTargetMinutes, settings.hydrationTargetLiters],
  );
  const open = useCallback((id: MetricId) => openGuidance({ kind: "metric", id }), [openGuidance]);

  return (
    <Panel
      id="vitals"
      title="Crew health telemetry"
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          Latest readings on mission day <span className="num">{padDay(day)}</span>, the last 14 days, and where each value sits on its configured scale.
          <ProvenanceTag kind="SYNTHETIC" label="SYNTHETIC DEMO TELEMETRY" />
        </span>
      }
      actions={
        <button type="button" className="btn btn-primary" onClick={() => openLog({ metricId: "heartRate", day })}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Log measurement
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((m) => (
          <VitalMetricCard
            key={m}
            diagnostic={diagnostics[m]}
            spark={sparks[m]}
            tracks={tracks[m] ?? null}
            {...(m === "radiation" ? { dailyDose: days[day - 1]?.dailyRadiationMsv ?? 0 } : {})}
            onOpen={() => open(m)}
          />
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-3">
        <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 rounded-[1px] bg-nominal/40" /> Configured reference range</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 rounded-[1px] bg-caution/60" /> Caution zone</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 rounded-[1px] bg-critical/70" /> Critical zone</span>
        <span>Ranges are prototype assumptions, not NASA flight rules. {PRIMARY_METRIC_IDS.length} required indicators shown.</span>
      </p>
    </Panel>
  );
}
