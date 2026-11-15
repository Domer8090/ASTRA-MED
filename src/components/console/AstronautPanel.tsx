import { useEffect, useMemo, useRef, useState } from "react";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { useMissionModel } from "../../hooks/useMissionModel";
import { BODY_SYSTEM_IDS, type BodySystemId, type MetricId } from "../../types/health";
import { formatWithUnit } from "../../utils/formatting";
import { BodyPlate } from "../bodymap/BodyPlate";
import { StatusIcon } from "../shared/StatusBadge";
import { InfoTip } from "../shared/InfoTip";
import { useConsoleFocus, useSelectedSystem } from "./useConsoleFocus";

const KEY_METRIC: Record<BodySystemId, MetricId> = {
  neuroOcular: "sleep",
  cardiovascular: "heartRate",
  musculoskeletal: "aredMinutes",
  immuneRadiation: "radiation",
  metabolicCircadian: "bloodGlucose",
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** The centrepiece: the body plate with five selectable systems. */
export function AstronautPanel() {
  const { systems, diagnostics, advisories } = useMissionModel();
  const hz = advisories.find((a) => a.source === "scenario") ?? advisories.find((a) => a.source === "donki");
  const hazard = hz ? { level: hz.level, label: `SEP ${hz.level}${hz.source === "scenario" ? " (SIM)" : " (DONKI)"}` } : null;
  const directSystems = useMemo(
    () => (hz && hz.level !== "ALL CLEAR" ? hz.relations.filter((r) => r.relation === "Direct").map((r) => r.id) : []),
    [hz],
  );
  const { system: selectedSystem } = useSelectedSystem();
  const hazardElsewhere = directSystems.find((id) => id !== selectedSystem);
  const { focusSystem } = useConsoleFocus();
  const [ref, width] = useWidth<HTMLDivElement>();
  const compact = width > 0 && width < 500;

  const keyReadings = useMemo(() => {
    const out = {} as Record<BodySystemId, string>;
    for (const id of BODY_SYSTEM_IDS) {
      const d = diagnostics[KEY_METRIC[id]];
      out[id] = d.latest ? `${METRIC_GUIDANCE[d.metricId].shortName} ${formatWithUnit(d.metricId, d.latest.value)}` : "No reading";
    }
    return out;
  }, [diagnostics]);

  return (
    <section id="body" aria-labelledby="body-title" className="panel relative flex min-w-0 flex-col">
      <header className="flex items-center gap-1 px-4 pt-3">
        <h2 id="body-title" className="font-cond text-md font-bold uppercase tracking-label text-ink">
          Crew anatomy
        </h2>
        <InfoTip label="Crew anatomy">
          <p>Each body system is coloured by its status: green NOMINAL, amber CAUTION, red CRITICAL.</p>
          <p>Drag to rotate. Use + and − to zoom. Select a marker or a system below to see its detail.</p>
        </InfoTip>
      </header>
      {hz ? (
        <p className={`mx-4 mt-2 flex flex-wrap items-center gap-1 rounded-tile border px-3 py-1 text-xs ${hz.level === "ALL CLEAR" ? "border-nominal/40 text-ink-2" : "border-caution/50 text-ink"}`}>
          <span className={`font-cond font-bold tracking-label ${hz.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}`}>ENVIRONMENT {hz.level}</span>
          <InfoTip label="Environmental hazard">
            {hz.phase}. The dashed outline marks the hazard. Affected systems: {hz.relations.map((r) => `${BODY_SYSTEMS[r.id].shortName} (${r.relation.toLowerCase()})`).join(", ")}. This is the space environment, not a personal dose.
          </InfoTip>
          {hazardElsewhere ? (
            <button type="button" className="btn btn-secondary ml-2 mt-1 min-h-[28px] px-2 text-xs" onClick={() => focusSystem(hazardElsewhere)}>
              Show {BODY_SYSTEMS[hazardElsewhere].shortName.toLowerCase()} (hazard priority)
            </button>
          ) : null}
        </p>
      ) : null}
      <div ref={ref} className="flex min-w-0 flex-1 items-center px-2 pb-2">
        <div className={compact ? "mx-auto w-full max-w-[320px]" : "w-full"}>
          <BodyPlate systems={systems} selected={selectedSystem} onSelect={focusSystem} compact={compact} hazard={hazard} />
        </div>
      </div>
      {
        <ul className="grid grid-cols-2 gap-1.5 border-t border-line p-2 min-[540px]:grid-cols-3" aria-label="Select a body system">
          {BODY_SYSTEM_IDS.map((id) => {
            const st = systems[id].status;
            const tone = st === "CRITICAL" ? "text-critical" : st === "CAUTION" ? "text-caution" : "text-nominal";
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={selectedSystem === id}
                  onClick={() => focusSystem(id)}
                  className={`flex min-h-[50px] w-full min-w-0 items-center gap-2 rounded-tile border px-2 py-1.5 text-left ${selectedSystem === id ? "border-cyan bg-raised" : "border-line hover:border-line-strong"}`}
                >
                  <span className={tone}>
                    <StatusIcon status={st} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-cond text-sm font-semibold text-ink">{BODY_SYSTEMS[id].shortName}</span>
                    <span className="block truncate font-mono text-[10px] text-ink-3">{keyReadings[id]}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      }
    </section>
  );
}
