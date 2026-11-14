import { useCallback, useMemo } from "react";
import { prioritySystem, type SystemPriority } from "../../engine/bodySystemEngine";
import { useMissionModel } from "../../hooks/useMissionModel";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { useMissionStore } from "../../hooks/useMissionState";
import { useUiActions, useUiState } from "../../hooks/useUi";
import type { BodySystemId, MetricId } from "../../types/health";

/** Selecting a system or metric also points the trend chart at it, so telemetry, trend and guidance move together. */
export function useConsoleFocus() {
  const store = useMissionStore();
  const { selectSystem, selectMetric } = useUiActions();

  const focusSystem = useCallback(
    (id: BodySystemId) => {
      selectSystem(id);
      store.setTrendTab(BODY_SYSTEMS[id].trendTab);
    },
    [selectSystem, store],
  );

  const focusMetric = useCallback(
    (id: MetricId, system?: BodySystemId) => {
      const sys = system ?? METRIC_GUIDANCE[id].system;
      selectMetric(id, sys);
      store.setTrendTab(METRIC_GUIDANCE[id].trendTab ?? BODY_SYSTEMS[sys].trendTab);
    },
    [selectMetric, store],
  );

  return { focusSystem, focusMetric };
}

export interface SelectedSystem {
  system: BodySystemId;
  mode: "auto" | "user";
  priority: SystemPriority;
}

/** The system the console shows: the user's choice, or the highest-priority system until they choose. */
export function useSelectedSystem(): SelectedSystem {
  const { systems, advisories } = useMissionModel();
  const { selectedSystem, selectionMode } = useUiState();
  const priority = useMemo(() => prioritySystem(systems, advisories), [systems, advisories]);
  return { system: selectionMode === "auto" ? priority.id : selectedSystem, mode: selectionMode, priority };
}
