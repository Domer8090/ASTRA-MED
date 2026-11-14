import { useId } from "react";
import { SCENARIOS, SCENARIO_ORDER } from "../data/scenarios";
import { useMissionState, useMissionStore } from "../hooks/useMissionState";
import { useToast } from "../hooks/useToast";
import { isScenarioId } from "../data/scenarios";
import { useUiActions } from "../hooks/useUi";

/** Switches the deterministic demo scenario. Logged entries are never erased by a switch. */
export function ScenarioSelector({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const store = useMissionStore();
  const toast = useToast();
  const scenarioId = useMissionState((s) => s.settings.scenarioId);
  const { followPriority } = useUiActions();

  return (
    <div data-tour="scenario" className="flex min-w-0 flex-col">
      <label htmlFor={id} className={`label ${compact ? "sr-only" : ""}`}>
        Scenario
      </label>
      <select
        id={id}
        name="scenario"
        value={scenarioId}
        onChange={(e) => {
          const next = e.target.value;
          if (!isScenarioId(next)) return;
          const prev = store.getState().settings;
          const result = store.setScenario(next);
          followPriority();
          toast({
            tone: result.persisted ? "success" : "warning",
            title: result.message,
            body: "Your logged measurements and task records are kept.",
            action: {
              label: "Undo",
              onClick: () => {
                store.setScenario(prev.scenarioId);
                store.setSelectedDay(prev.selectedDay);
              },
            },
          });
        }}
        className="mt-0.5 h-8 max-w-[220px] truncate rounded-control border border-line-strong bg-raised pl-2 pr-7 font-cond text-sm font-semibold text-ink hover:border-[#36597b]"
      >
        {SCENARIO_ORDER.map((sid) => (
          <option key={sid} value={sid}>
            {SCENARIOS[sid].code}: {SCENARIOS[sid].name}
          </option>
        ))}
      </select>
    </div>
  );
}
