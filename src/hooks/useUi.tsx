import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { BodySystemId, GuidanceRef, MetricId } from "../types/health";

export type SourcesTab = "about" | "sources" | "thresholds" | "labels" | "storage";

export interface LogRequest {
  metricId: MetricId;
  day?: number;
}

interface UiState {
  guidance: GuidanceRef | null;
  log: LogRequest | null;
  sourcesTab: SourcesTab | null;
  selectedSystem: BodySystemId;
  /** Metric in focus inside the selected system; null shows the system's leading driver. */
  selectedMetric: MetricId | null;
  /** "auto" follows the highest-priority system; "user" keeps the crew member's choice. */
  selectionMode: "auto" | "user";
}

interface UiActions {
  openGuidance: (ref: GuidanceRef) => void;
  closeGuidance: () => void;
  openLog: (req?: Partial<LogRequest>) => void;
  closeLog: () => void;
  openSources: (tab?: SourcesTab) => void;
  closeSources: () => void;
  selectSystem: (id: BodySystemId) => void;
  selectMetric: (id: MetricId, system: BodySystemId) => void;
  followPriority: () => void;
}

const UiStateContext = createContext<UiState | null>(null);
const UiActionsContext = createContext<UiActions | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UiState>({ guidance: null, log: null, sourcesTab: null, selectedSystem: "cardiovascular", selectedMetric: null, selectionMode: "auto" });

  const openGuidance = useCallback((ref: GuidanceRef) => setState((s) => ({ ...s, guidance: ref })), []);
  const closeGuidance = useCallback(() => setState((s) => ({ ...s, guidance: null })), []);
  const openLog = useCallback(
    (req: Partial<LogRequest> = {}) => setState((s) => ({ ...s, log: { metricId: req.metricId ?? "heartRate", ...(req.day ? { day: req.day } : {}) } })),
    [],
  );
  const closeLog = useCallback(() => setState((s) => ({ ...s, log: null })), []);
  const openSources = useCallback((tab: SourcesTab = "about") => setState((s) => ({ ...s, sourcesTab: tab })), []);
  const closeSources = useCallback(() => setState((s) => ({ ...s, sourcesTab: null })), []);
  const selectSystem = useCallback((id: BodySystemId) => setState((s) => ({ ...s, selectedSystem: id, selectedMetric: null, selectionMode: "user" })), []);
  const followPriority = useCallback(() => setState((s) => ({ ...s, selectedMetric: null, selectionMode: "auto" })), []);
  const selectMetric = useCallback(
    (id: MetricId, system: BodySystemId) => setState((s) => ({ ...s, selectedSystem: system, selectedMetric: id, selectionMode: "user" })),
    [],
  );

  const actions = useMemo<UiActions>(
    () => ({ openGuidance, closeGuidance, openLog, closeLog, openSources, closeSources, selectSystem, selectMetric, followPriority }),
    [openGuidance, closeGuidance, openLog, closeLog, openSources, closeSources, selectSystem, selectMetric, followPriority],
  );

  return (
    <UiActionsContext.Provider value={actions}>
      <UiStateContext.Provider value={state}>{children}</UiStateContext.Provider>
    </UiActionsContext.Provider>
  );
}

export function useUiState(): UiState {
  const v = useContext(UiStateContext);
  if (!v) throw new Error("UiProvider is missing");
  return v;
}

export function useUiActions(): UiActions {
  const v = useContext(UiActionsContext);
  if (!v) throw new Error("UiProvider is missing");
  return v;
}
