/**
 * Framework-free mission store.
 *
 * Every action validates, writes to storage synchronously, then notifies
 * subscribers. Actions return whether the change was persisted so the UI only
 * reports success after the local state change has completed.
 */
import { ARED, HYDRATION, MISSION } from "../config/thresholds";
import { SCENARIOS } from "../data/scenarios";
import { getCountermeasureTasks } from "../data/countermeasureTasks";
import type { CompletionLog } from "../engine/readinessEngine";
import type { FollowUpLog } from "../engine/protocolEngine";
import { createStorageService, STORAGE_KEYS, type StorageService } from "../services/storageService";
import type {
  GlucoseContext,
  MeasurementValue,
  MetricId,
  MissionSettings,
  ScenarioId,
  TaskCompletionRecord,
  TrendTabId,
  TrendWindow,
  VitalMeasurement,
} from "../types/health";
import { clampDay } from "../utils/dates";
import { METRIC_UNITS } from "../utils/formatting";
import { sanitizeCompletions, sanitizeFollowUps, sanitizeMeasurements, sanitizeSettings } from "../utils/validation";

export const DEFAULT_SETTINGS: MissionSettings = {
  scenarioId: "nominal",
  selectedDay: MISSION.defaultDay,
  aredTargetMinutes: ARED.defaultTargetMinutes,
  hydrationTargetLiters: HYDRATION.defaultTargetLiters,
  trendWindow: 30,
  trendTab: "heartRate",
};

export interface StorageHealth {
  available: boolean;
  /** Keys that held malformed data at startup and were reset to defaults. */
  recoveredKeys: string[];
  lastWriteOk: boolean;
}

export interface MissionState {
  measurements: VitalMeasurement[];
  completions: CompletionLog;
  followUps: FollowUpLog;
  settings: MissionSettings;
  storage: StorageHealth;
}

export interface ActionResult {
  ok: boolean;
  persisted: boolean;
  message: string;
}

type Listener = () => void;

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export interface NewMeasurement {
  metricId: MetricId;
  value: MeasurementValue;
  missionDay: number;
  recordedAt: string;
  notes?: string;
  glucoseContext?: GlucoseContext;
  /** True when the linked countermeasure task already shows as complete (including seeded history). */
  linkedTaskComplete?: boolean;
}

export function createMissionStore(storage: StorageService = createStorageService()) {
  const recovered: string[] = [];
  const m = storage.read(STORAGE_KEYS.measurements, sanitizeMeasurements, []);
  const c = storage.read(STORAGE_KEYS.countermeasures, sanitizeCompletions, {});
  const f = storage.read(STORAGE_KEYS.followUps, sanitizeFollowUps, {});
  const s = storage.read(STORAGE_KEYS.settings, (raw) => sanitizeSettings(raw, DEFAULT_SETTINGS), DEFAULT_SETTINGS);
  for (const [key, r] of [
    [STORAGE_KEYS.measurements, m],
    [STORAGE_KEYS.countermeasures, c],
    [STORAGE_KEYS.followUps, f],
    [STORAGE_KEYS.settings, s],
  ] as const) {
    if (r.status === "corrupt") {
      recovered.push(key);
      storage.remove(key);
    }
  }

  let state: MissionState = {
    measurements: m.value,
    completions: c.value,
    followUps: f.value,
    settings: s.value,
    storage: { available: storage.available, recoveredKeys: recovered, lastWriteOk: true },
  };
  const listeners = new Set<Listener>();

  function commit(next: Partial<Omit<MissionState, "storage">>): boolean {
    let ok = true;
    if (next.measurements) ok = storage.write(STORAGE_KEYS.measurements, next.measurements) && ok;
    if (next.completions) ok = storage.write(STORAGE_KEYS.countermeasures, next.completions) && ok;
    if (next.followUps) ok = storage.write(STORAGE_KEYS.followUps, next.followUps) && ok;
    if (next.settings) ok = storage.write(STORAGE_KEYS.settings, next.settings) && ok;
    state = { ...state, ...next, storage: { ...state.storage, lastWriteOk: ok } };
    listeners.forEach((l) => l());
    return ok;
  }

  const saved = (persisted: boolean, message: string): ActionResult => ({
    ok: true,
    persisted,
    message: persisted ? message : `${message} Not saved to this browser: storage is unavailable, so it will be lost on reload.`,
  });

  function setTaskRecord(day: number, taskId: string, completed: boolean, via: TaskCompletionRecord["via"]): CompletionLog {
    const dayRecords = { ...(state.completions[day] ?? {}) };
    dayRecords[taskId] = {
      taskId,
      missionDay: day,
      completed,
      via,
      ...(completed ? { completedAt: new Date().toISOString() } : {}),
    };
    return { ...state.completions, [day]: dayRecords };
  }

  return {
    getState: (): MissionState => state,
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setSelectedDay(day: number): void {
      const selectedDay = clampDay(day);
      if (selectedDay === state.settings.selectedDay) return;
      commit({ settings: { ...state.settings, selectedDay } });
    },

    /** Switches scenario and jumps to its focus day. Logged measurements and task records are kept. */
    setScenario(scenarioId: ScenarioId): ActionResult {
      const focusDay = SCENARIOS[scenarioId].focusDay;
      const persisted = commit({ settings: { ...state.settings, scenarioId, selectedDay: focusDay } });
      return saved(persisted, `Scenario ${SCENARIOS[scenarioId].code} loaded: ${SCENARIOS[scenarioId].name}. Showing mission day ${focusDay}.`);
    },

    setTrendWindow(trendWindow: TrendWindow): void {
      commit({ settings: { ...state.settings, trendWindow } });
    },

    setTrendTab(trendTab: TrendTabId): void {
      commit({ settings: { ...state.settings, trendTab } });
    },

    updatePlanTargets(aredTargetMinutes: number, hydrationTargetLiters: number): ActionResult {
      const persisted = commit({ settings: { ...state.settings, aredTargetMinutes, hydrationTargetLiters } });
      return saved(persisted, "Mission plan targets saved.");
    },

    logMeasurement(input: NewMeasurement): ActionResult & { measurement?: VitalMeasurement; completedTaskTitle?: string } {
      const measurement: VitalMeasurement = {
        id: newId(),
        metricId: input.metricId,
        value: input.value,
        unit: METRIC_UNITS[input.metricId],
        missionDay: input.missionDay,
        recordedAt: input.recordedAt,
        enteredAt: new Date().toISOString(),
        source: "manual",
        ...(input.notes ? { notes: input.notes } : {}),
        ...(input.glucoseContext ? { glucoseContext: input.glucoseContext } : {}),
      };
      const measurements = [...state.measurements, measurement];
      // Logging a linked metric completes that day's task once (never twice, never un-completes).
      const task = getCountermeasureTasks(state.settings.aredTargetMinutes, state.settings.hydrationTargetLiters).find(
        (t) => t.linkedMetric === input.metricId,
      );
      let completions: CompletionLog | undefined;
      let completedTaskTitle: string | undefined;
      const meetsTarget =
        input.metricId === "aredMinutes"
          ? typeof input.value === "number" && input.value >= state.settings.aredTargetMinutes
          : input.metricId === "hydration"
            ? typeof input.value === "number" && input.value >= state.settings.hydrationTargetLiters
            : true;
      if (task && meetsTarget && !input.linkedTaskComplete && !state.completions[input.missionDay]?.[task.id]?.completed) {
        completions = setTaskRecord(input.missionDay, task.id, true, "measurement");
        completedTaskTitle = task.title;
      }
      const persisted = commit({ measurements, ...(completions ? { completions } : {}) });
      return {
        ...saved(persisted, `Measurement saved for mission day ${input.missionDay}.`),
        measurement,
        ...(completedTaskTitle ? { completedTaskTitle } : {}),
      };
    },

    deleteMeasurement(id: string): ActionResult {
      const measurements = state.measurements.filter((x) => x.id !== id);
      if (measurements.length === state.measurements.length) return { ok: false, persisted: false, message: "That entry no longer exists." };
      const persisted = commit({ measurements });
      return saved(persisted, "Entry removed. The day now uses the previous reading.");
    },

    setTaskCompletion(day: number, taskId: string, completed: boolean): ActionResult {
      const persisted = commit({ completions: setTaskRecord(day, taskId, completed, "checkbox") });
      return saved(persisted, completed ? "Task marked complete." : "Task marked not complete.");
    },

    setFollowUpCompletion(day: number, id: string, completed: boolean): ActionResult {
      const dayLog = { ...(state.followUps[day] ?? {}) };
      if (completed) dayLog[id] = new Date().toISOString();
      else delete dayLog[id];
      const persisted = commit({ followUps: { ...state.followUps, [day]: dayLog } });
      return saved(persisted, completed ? "Follow-up recorded as done." : "Follow-up reopened.");
    },

    /** Restores the bundled baseline. Removes every logged measurement, task record and setting. */
    resetDemoData(): ActionResult {
      const ok = [STORAGE_KEYS.measurements, STORAGE_KEYS.countermeasures, STORAGE_KEYS.followUps, STORAGE_KEYS.settings]
        .map((k) => storage.remove(k))
        .every(Boolean);
      state = {
        measurements: [],
        completions: {},
        followUps: {},
        settings: DEFAULT_SETTINGS,
        storage: { ...state.storage, recoveredKeys: [], lastWriteOk: ok || !storage.available },
      };
      listeners.forEach((l) => l());
      return saved(ok, "Demo data reset to the bundled baseline.");
    },

    /** Reload from storage, e.g. after another tab changed it. */
    reloadFromStorage(): void {
      state = {
        ...state,
        measurements: storage.read(STORAGE_KEYS.measurements, sanitizeMeasurements, state.measurements).value,
        completions: storage.read(STORAGE_KEYS.countermeasures, sanitizeCompletions, state.completions).value,
        followUps: storage.read(STORAGE_KEYS.followUps, sanitizeFollowUps, state.followUps).value,
        settings: storage.read(STORAGE_KEYS.settings, (raw) => sanitizeSettings(raw, DEFAULT_SETTINGS), state.settings).value,
      };
      listeners.forEach((l) => l());
    },
  };
}

export type MissionStore = ReturnType<typeof createMissionStore>;
