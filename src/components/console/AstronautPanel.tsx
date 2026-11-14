import { useEffect, useMemo, useRef, useState } from "react";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { useMissionModel } from "../../hooks/useMissionModel";
import { BODY_SYSTEM_IDS, type BodySystemId, type MetricId } from "../../types/health";
import { formatWithUnit } from "../../utils/formatting";
import { BodyPlate } from "../bodymap/BodyPlate";
import { StatusIcon } from "../shared/StatusBadge";
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
      <header className="flex items-baseline justify-between gap-2 px-4 pt-3">
        <h2 id="body-title" className="font-cond text-md font-bold uppercase tracking-label text-ink">
          Select a body system
        </h2>
        <span className="hidden text-2xs text-ink-3 md:inline">Click a hotspot or label. Keyboard: Tab, then Enter.</span>
      </header>
      {hz ? (
        <p className={`mx-4 mt-2 rounded-tile border px-3 py-1.5 text-xs ${hz.level === "ALL CLEAR" ? "border-nominal/40 text-ink-2" : "border-caution/50 text-ink"}`}>
          <span className={`font-cond font-bold tracking-label ${hz.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}`}>ENVIRONMENT {hz.level}</span> {hz.phase}. Dashed envelope marks the environmental hazard; affected systems: {hz.relations.map((r) => `${BODY_SYSTEMS[r.id].shortName} (${r.relation.toLowerCase()})`).join(", ")}. Not a dose.
          {hazardElsewhere ? (
            <button type="button" className="btn btn-secondary ml-2 mt-1 min-h-[28px] px-2 text-xs" onClick={() => focusSystem(hazardElsewhere)}>
              Show {BODY_SYSTEMS[hazardElsewhere].shortName.toLowerCase()} (hazard priority)
            </button>
          ) : null}
        </p>
      ) : null}
      <div ref={ref} className="flex min-w-0 flex-1 items-center px-2 pb-2">
        <div className={compact ? "mx-auto w-full max-w-[320px]" : "w-full"}>
          <BodyPlate systems={systems} selected={selectedSystem} onSelect={focusSystem} compact={compact} keyReadings={keyReadings} hazard={hazard} hazardSystems={directSystems} />
        </div>
      </div>
      {compact ? (
        <ul className="grid grid-cols-1 gap-1.5 border-t border-line p-2 min-[420px]:grid-cols-2" aria-label="Body systems">
          {BODY_SYSTEM_IDS.map((id) => {
            const st = systems[id].status;
            const tone = st === "CRITICAL" ? "text-critical" : st === "CAUTION" ? "text-caution" : "text-nominal";
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={selectedSystem === id}
                  onClick={() => focusSystem(id)}
                  className={`flex min-h-[44px] w-full items-center gap-2 rounded-tile border px-2.5 py-1.5 text-left ${selectedSystem === id ? "border-cyan bg-raised" : "border-line"}`}
                >
                  <span className={tone}>
                    <StatusIcon status={st} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-cond text-sm font-semibold text-ink">{BODY_SYSTEMS[id].shortName}</span>
                    <span className={`block font-cond text-2xs font-bold tracking-status ${tone}`}>{st}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
