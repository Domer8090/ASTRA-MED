import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getCountermeasureTasks } from "../data/countermeasureTasks";
import { SCENARIOS } from "../data/scenarios";
import { donkiAdvisories, scenarioAdvisories } from "../engine/advisoryEngine";
import { evaluateBodySystems } from "../engine/bodySystemEngine";
import { aggregateStatus, evaluateAllMetrics, evaluateMissionDays, type EngineInput } from "../engine/diagnosticEngine";
import { buildFollowUps, mostImportantAction, type PrimaryAction } from "../engine/protocolEngine";
import { computeReadiness, tasksForDay, type ReadinessInput } from "../engine/readinessEngine";
import { trendWatch, type TrendWatch } from "../engine/trendEngine";
import { buildEffectiveDays } from "../services/telemetryService";
import type {
  BodySystemId,
  BodySystemState,
  CountermeasureTask,
  CountermeasureTaskDefinition,
  EffectiveDay,
  EnvironmentAdvisory,
  FollowUpAction,
  HealthStatus,
  MetricDiagnostic,
  MetricId,
  MetricReading,
  MissionSettings,
  OverallStatus,
  ReadinessSummary,
  ScenarioDefinition,
  VitalMeasurement,
} from "../types/health";
import { useMissionState } from "./useMissionState";
import { useSpaceWeather } from "./useSpaceWeather";

export interface MissionModel {
  settings: MissionSettings;
  day: number;
  scenario: ScenarioDefinition;
  measurements: VitalMeasurement[];
  days: EffectiveDay[];
  engineInput: EngineInput;
  dayStatus: HealthStatus[];
  metricDayStatus: Record<MetricId, HealthStatus[]>;
  diagnostics: Record<MetricId, MetricDiagnostic>;
  overall: OverallStatus;
  advisories: EnvironmentAdvisory[];
  systems: Record<BodySystemId, BodySystemState>;
  taskDefinitions: CountermeasureTaskDefinition[];
  tasks: CountermeasureTask[];
  followUps: FollowUpAction[];
  readiness: ReadinessSummary;
  primaryAction: PrimaryAction;
  lastReading: MetricReading | null;
  readinessInput: ReadinessInput;
  /** Early-warning projections for NOMINAL indicators. Never a status. */
  trends: TrendWatch[];
}

const MissionModelContext = createContext<MissionModel | null>(null);

export function MissionModelProvider({ children }: { children: ReactNode }) {
  const settings = useMissionState((s) => s.settings);
  const measurements = useMissionState((s) => s.measurements);
  const completions = useMissionState((s) => s.completions);
  const followUpLog = useMissionState((s) => s.followUps);
  const { events: donkiEvents } = useSpaceWeather();
  const { scenarioId, selectedDay: day, aredTargetMinutes, hydrationTargetLiters } = settings;

  const days = useMemo(() => buildEffectiveDays(scenarioId, measurements), [scenarioId, measurements]);
  const engineInput = useMemo<EngineInput>(
    () => ({ days, settings: { aredTargetMinutes, hydrationTargetLiters }, evaluatedAt: new Date().toISOString() }),
    [days, aredTargetMinutes, hydrationTargetLiters],
  );
  const missionDays = useMemo(() => evaluateMissionDays(engineInput), [engineInput]);
  const diagnostics = useMemo(() => evaluateAllMetrics(engineInput, day), [engineInput, day]);

  const advisories = useMemo(
    () => [...scenarioAdvisories(scenarioId, day), ...donkiAdvisories(donkiEvents, Date.now())],
    [scenarioId, day, donkiEvents],
  );
  const overall = useMemo(() => aggregateStatus(diagnostics, advisories), [diagnostics, advisories]);
  const systems = useMemo(() => evaluateBodySystems(diagnostics, advisories), [diagnostics, advisories]);

  const taskDefinitions = useMemo(
    () => getCountermeasureTasks(aredTargetMinutes, hydrationTargetLiters),
    [aredTargetMinutes, hydrationTargetLiters],
  );
  const readinessInput = useMemo<ReadinessInput>(
    () => ({ scenarioId, tasks: taskDefinitions, days, completions, aredTargetMinutes, hydrationTargetLiters }),
    [scenarioId, taskDefinitions, days, completions, aredTargetMinutes, hydrationTargetLiters],
  );
  const tasks = useMemo(() => tasksForDay(readinessInput, day), [readinessInput, day]);
  const followUps = useMemo(
    () =>
      buildFollowUps({
        day,
        diagnostics,
        advisories,
        yesterdayTasks: day > 1 ? tasksForDay(readinessInput, day - 1) : [],
        taskDefinitions,
        log: followUpLog,
      }),
    [day, diagnostics, advisories, readinessInput, taskDefinitions, followUpLog],
  );
  const readiness = useMemo(
    () => computeReadiness(readinessInput, day, followUps, diagnostics),
    [readinessInput, day, followUps, diagnostics],
  );
  const trends = useMemo(() => trendWatch(days, day, diagnostics), [days, day, diagnostics]);
  const primaryAction = useMemo(() => mostImportantAction(followUps, tasks, day), [followUps, tasks, day]);

  const lastReading = useMemo(() => {
    let best: MetricReading | null = null;
    // Last health check: crew-taken readings. The dosimeter logs automatically at end of day.
    for (const d of Object.values(diagnostics)) {
      if (d.metricId === "radiation") continue;
      if (d.latest && (!best || Date.parse(d.latest.recordedAt) > Date.parse(best.recordedAt))) best = d.latest;
    }
    return best;
  }, [diagnostics]);

  const value = useMemo<MissionModel>(
    () => ({
      settings,
      day,
      scenario: SCENARIOS[scenarioId],
      measurements,
      days,
      engineInput,
      dayStatus: missionDays.overall,
      metricDayStatus: missionDays.byMetric,
      diagnostics,
      overall,
      advisories,
      systems,
      taskDefinitions,
      tasks,
      followUps,
      readiness,
      primaryAction,
      lastReading,
      readinessInput,
      trends,
    }),
    [settings, day, scenarioId, measurements, days, engineInput, missionDays, diagnostics, overall, advisories, systems, taskDefinitions, tasks, followUps, readiness, primaryAction, lastReading, readinessInput, trends],
  );

  return <MissionModelContext.Provider value={value}>{children}</MissionModelContext.Provider>;
}

export function useMissionModel(): MissionModel {
  const v = useContext(MissionModelContext);
  if (!v) throw new Error("MissionModelProvider is missing");
  return v;
}
