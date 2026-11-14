import { describe, expect, it } from "vitest";
import { getCountermeasureTasks } from "../data/countermeasureTasks";
import { buildEffectiveDays, cumulativeDoseAt } from "../services/telemetryService";
import type { MetricId, MeasurementValue, ScenarioId, VitalMeasurement } from "../types/health";
import { missionDayToIso } from "../utils/dates";
import { scenarioAdvisories, donkiAdvisories } from "./advisoryEngine";
import { evaluateBodySystems } from "./bodySystemEngine";
import { aggregateStatus, evaluateAllMetrics, evaluateMetric, evaluateMissionDays, type EngineInput } from "./diagnosticEngine";
import { buildFollowUps, mostImportantAction } from "./protocolEngine";
import { computeReadiness, computeStreak, dayXp, tasksForDay, totalXp, type ReadinessInput } from "./readinessEngine";

const settings = { aredTargetMinutes: 60, hydrationTargetLiters: 2.0 };
let seq = 0;

function m(metricId: MetricId, missionDay: number, value: MeasurementValue, minute = 600): VitalMeasurement {
  seq++;
  return {
    id: `t-${seq}`,
    metricId,
    value,
    unit: "",
    missionDay,
    recordedAt: missionDayToIso(missionDay, minute + seq),
    source: "manual",
  };
}

function input(scenario: ScenarioId, manual: VitalMeasurement[] = []): EngineInput {
  return { days: buildEffectiveDays(scenario, manual), settings, evaluatedAt: "2026-11-13T00:00:00Z" };
}

describe("diagnostic rules", () => {
  it("nominal scenario day 42 is fully nominal", () => {
    const all = evaluateAllMetrics(input("nominal"), 42);
    const overall = aggregateStatus(all);
    expect(overall.status).toBe("NOMINAL");
    expect(overall.counts.CAUTION + overall.counts.CRITICAL).toBe(0);
  });

  it("heart rate thresholds", () => {
    expect(evaluateMetric(input("nominal", [m("heartRate", 42, 86)]), "heartRate", 42).status).toBe("CAUTION");
    expect(evaluateMetric(input("nominal", [m("heartRate", 42, 85)]), "heartRate", 42).status).toBe("NOMINAL");
    expect(evaluateMetric(input("nominal", [m("heartRate", 42, 44)]), "heartRate", 42).status).toBe("CAUTION");
    const crit = evaluateMetric(input("nominal", [m("heartRate", 42, 106)]), "heartRate", 42);
    expect(crit.status).toBe("CRITICAL");
    expect(crit.triggeredRules[0]?.ruleId).toBe("hr-critical-high");
    expect(crit.summary).toMatch(/106 bpm/);
  });

  it("blood pressure checks both components", () => {
    expect(evaluateMetric(input("nominal", [m("bloodPressure", 42, { systolic: 120, diastolic: 86 })]), "bloodPressure", 42).status).toBe("CAUTION");
    expect(evaluateMetric(input("nominal", [m("bloodPressure", 42, { systolic: 151, diastolic: 80 })]), "bloodPressure", 42).status).toBe("CRITICAL");
    expect(evaluateMetric(input("nominal", [m("bloodPressure", 42, { systolic: 84, diastolic: 60 })]), "bloodPressure", 42).status).toBe("CRITICAL");
    expect(evaluateMetric(input("nominal", [m("bloodPressure", 42, { systolic: 94, diastolic: 62 })]), "bloodPressure", 42).status).toBe("CAUTION");
  });

  it("temperature and glucose boundaries", () => {
    expect(evaluateMetric(input("nominal", [m("bodyTemperature", 42, 37.6)]), "bodyTemperature", 42).status).toBe("CAUTION");
    expect(evaluateMetric(input("nominal", [m("bodyTemperature", 42, 38.2)]), "bodyTemperature", 42).status).toBe("CRITICAL");
    expect(evaluateMetric(input("nominal", [m("bloodGlucose", 42, 110)]), "bloodGlucose", 42).status).toBe("CAUTION");
    expect(evaluateMetric(input("nominal", [m("bloodGlucose", 42, 140)]), "bloodGlucose", 42).status).toBe("CRITICAL");
    expect(evaluateMetric(input("nominal", [m("bloodGlucose", 42, 54)]), "bloodGlucose", 42).status).toBe("CRITICAL");
    expect(evaluateMetric(input("nominal", [m("bloodGlucose", 42, 67)]), "bloodGlucose", 42).status).toBe("CAUTION");
  });

  it("sleep needs two consecutive short nights for CAUTION", () => {
    const one = evaluateMetric(input("nominal", [m("sleep", 42, 5.5)]), "sleep", 42);
    expect(one.status).toBe("NOMINAL");
    expect(one.notes.join(" ")).toMatch(/consecutive/);
    const two = evaluateMetric(input("nominal", [m("sleep", 41, 5.5), m("sleep", 42, 5.8)]), "sleep", 42);
    expect(two.status).toBe("CAUTION");
    expect(two.summary).toMatch(/2 consecutive days/);
    expect(evaluateMetric(input("nominal", [m("sleep", 42, 4.4)]), "sleep", 42).status).toBe("CRITICAL");
    // Seeded anomaly: days 27–28.
    expect(evaluateMetric(input("nominal"), "sleep", 28).status).toBe("CAUTION");
    expect(evaluateMetric(input("nominal"), "sleep", 27).status).toBe("NOMINAL");
  });

  it("mood needs three consecutive low days for CAUTION", () => {
    const low = (d: number) => m("mood", d, 2.5);
    expect(evaluateMetric(input("nominal", [low(41), low(42)]), "mood", 42).status).toBe("NOMINAL");
    expect(evaluateMetric(input("nominal", [low(40), low(41), low(42)]), "mood", 42).status).toBe("CAUTION");
    expect(evaluateMetric(input("nominal", [m("mood", 42, 1.5)]), "mood", 42).status).toBe("CRITICAL");
  });

  it("ARED below plan is CAUTION and repeated missed sessions CRITICAL", () => {
    expect(evaluateMetric(input("nominal", [m("aredMinutes", 42, 45)]), "aredMinutes", 42).status).toBe("CAUTION");
    const missed = [m("aredMinutes", 40, 10), m("aredMinutes", 41, 0), m("aredMinutes", 42, 20)];
    expect(evaluateMetric(input("nominal", missed), "aredMinutes", 42).status).toBe("CRITICAL");
  });

  it("radiation: unusual daily increase is CAUTION, cumulative alone never CRITICAL", () => {
    const sep = evaluateMetric(input("sep"), "radiation", 131);
    expect(sep.status).toBe("CAUTION");
    expect(sep.triggeredRules[0]?.ruleId).toBe("rad-unusual-daily");
    expect(evaluateMetric(input("nominal"), "radiation", 180).status).toBe("NOMINAL");
  });

  it("flags stale and missing measurements", () => {
    const i = input("nominal");
    // Remove heart-rate readings for days 40-42 to simulate a device gap.
    const days = i.days.map((d) => {
      if (d.missionDay < 40 || d.missionDay > 42) return d;
      const readings = { ...d.readings };
      delete readings.heartRate;
      return { ...d, readings };
    });
    const stale = evaluateMetric({ ...i, days }, "heartRate", 42);
    expect(stale.freshness).toBe("stale");
    expect(stale.status).toBe("CAUTION");
    expect(stale.triggeredRules.some((r) => r.ruleId === "heartRate-stale")).toBe(true);
  });

  it("persistence separates a trend from a one-time reading", () => {
    const b = input("cardiovascular");
    const hr = evaluateMetric(b, "heartRate", 118);
    expect(hr.status).toBe("CAUTION");
    expect(hr.persistenceDays).toBeGreaterThan(2);
    expect(hr.summary).toMatch(/persistent trend/);
  });

  it("never changes recorded measurements", () => {
    const manual = [m("heartRate", 42, 99)];
    const snapshot = JSON.stringify(manual);
    evaluateAllMetrics(input("nominal", manual), 42);
    expect(JSON.stringify(manual)).toBe(snapshot);
  });

  it("aggregation follows CRITICAL > CAUTION > NOMINAL and status propagates to body systems", () => {
    const all = evaluateAllMetrics(input("nominal", [m("heartRate", 42, 110), m("sleep", 41, 5), m("sleep", 42, 5.2)]), 42);
    const overall = aggregateStatus(all);
    expect(overall.status).toBe("CRITICAL");
    expect(overall.drivers[0]?.metricId).toBe("heartRate");
    const systems = evaluateBodySystems(all, []);
    expect(systems.cardiovascular.status).toBe("CRITICAL");
    expect(systems.neuroOcular.status).toBe("CAUTION");
    expect(systems.musculoskeletal.status).toBe("NOMINAL");
  });

  it("scenario B and C drive the intended systems", () => {
    const b = evaluateBodySystems(evaluateAllMetrics(input("cardiovascular"), 118), []);
    expect(b.cardiovascular.status).toBe("CAUTION");
    const advisories = scenarioAdvisories("sep", 131);
    expect(advisories).toHaveLength(1);
    const c = evaluateBodySystems(evaluateAllMetrics(input("sep"), 131), advisories);
    expect(c.immuneRadiation.status).toBe("CAUTION");
    expect(c.immuneRadiation.advisories).toHaveLength(1);
    expect(scenarioAdvisories("sep", 140)).toHaveLength(0);
    expect(scenarioAdvisories("nominal", 131)).toHaveLength(0);
  });

  it("mission-day statuses cover 180 days and mark the scenario B drift", () => {
    const { overall, byMetric } = evaluateMissionDays(input("cardiovascular"));
    expect(overall).toHaveLength(180);
    expect(byMetric.heartRate[117]).toBe("CAUTION");
    expect(byMetric.heartRate[60]).toBe("NOMINAL");
  });
});

describe("radiation rebasing", () => {
  it("manual dosimeter reading rebases cumulative dose without decreasing", () => {
    const base = buildEffectiveDays("nominal", []);
    const before = cumulativeDoseAt(base, 41);
    const days = buildEffectiveDays("nominal", [m("radiation", 42, before + 5)]);
    expect(cumulativeDoseAt(days, 42)).toBeCloseTo(before + 5, 2);
    expect(days[41]!.dailyRadiationMsv).toBeCloseTo(5, 2);
    for (let d = 2; d <= 180; d++) expect(cumulativeDoseAt(days, d)).toBeGreaterThanOrEqual(cumulativeDoseAt(days, d - 1));
  });
});

describe("advisories", () => {
  it("only recent live or cached DONKI SEP events raise an advisory", () => {
    const now = Date.parse("2026-11-13T12:00:00Z");
    const ev = (dataSource: "live" | "cached" | "fallback", startTime: string) => ({
      id: "x",
      type: "SEP" as const,
      title: "SEP",
      startTime,
      description: "",
      dataSource,
      details: [],
      linkedIds: [],
    });
    expect(donkiAdvisories([ev("live", "2026-11-12T12:00Z")], now)).toHaveLength(1);
    expect(donkiAdvisories([ev("fallback", "2026-11-12T12:00Z")], now)).toHaveLength(0);
    expect(donkiAdvisories([ev("cached", "2026-11-01T12:00Z")], now)).toHaveLength(0);
  });
});

describe("countermeasures and readiness", () => {
  const tasks = getCountermeasureTasks(60, 2.0);
  const base = (completions: ReadinessInput["completions"] = {}): ReadinessInput => ({
    scenarioId: "nominal",
    tasks,
    days: buildEffectiveDays("nominal", []),
    completions,
    aredTargetMinutes: 60,
    hydrationTargetLiters: 2.0,
  });

  it("focus day starts with only morning tasks complete", () => {
    const t = tasksForDay(base(), 42);
    expect(t.filter((x) => x.completed).map((x) => x.id).sort()).toEqual(["health-check-in", "sleep-log"]);
  });

  it("PVT task appears only on scheduled days", () => {
    expect(tasksForDay(base(), 43).some((t) => t.id === "pvt-check")).toBe(true);
    expect(tasksForDay(base(), 42).some((t) => t.id === "pvt-check")).toBe(false);
  });

  it("completing a task twice awards XP once, and undo removes it", () => {
    const before = dayXp(base(), 42);
    const rec = { taskId: "ared-session", missionDay: 42, completed: true, completedAt: "2026-11-13T10:00:00Z", via: "checkbox" as const };
    const once = base({ 42: { "ared-session": rec } });
    const twice = base({ 42: { "ared-session": { ...rec, completedAt: "2026-11-13T10:05:00Z" } } });
    expect(dayXp(once, 42)).toBe(before + 40);
    expect(dayXp(twice, 42)).toBe(before + 40);
    const undone = base({ 42: { "ared-session": { ...rec, completed: false } } });
    expect(dayXp(undone, 42)).toBe(before);
    expect(totalXp(once, 42) - totalXp(base(), 42)).toBe(40);
  });

  it("streak counts history and does not break on an in-progress day", () => {
    const s = computeStreak(base(), 42);
    expect(s).toBeGreaterThan(0);
    // Mark yesterday as fully missed: streak drops to 0 because counting starts from day 41.
    const missed = Object.fromEntries(
      tasksForDay(base(), 41).map((t) => [t.id, { taskId: t.id, missionDay: 41, completed: false, via: "checkbox" as const }]),
    );
    expect(computeStreak(base({ 41: missed }), 42)).toBe(0);
  });

  it("readiness never hides a health alert and stays within 0–100", () => {
    const i = input("cardiovascular");
    const diags = evaluateAllMetrics(i, 118);
    const overall = aggregateStatus(diags);
    const all = Object.fromEntries(
      tasksForDay({ ...base(), scenarioId: "cardiovascular", days: i.days }, 118).map((t) => [
        t.id,
        { taskId: t.id, missionDay: 118, completed: true, completedAt: "2026-11-13T10:00:00Z", via: "checkbox" as const },
      ]),
    );
    const r = computeReadiness({ ...base({ 118: all }), scenarioId: "cardiovascular", days: i.days }, 118, [], diags);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.completedTasks).toBe(r.totalTasks);
    expect(overall.status).toBe("CAUTION");
  });

  it("follow-ups come from cautions, advisories and missed tasks", () => {
    const i = input("sep");
    const diags = evaluateAllMetrics(i, 131);
    const adv = scenarioAdvisories("sep", 131);
    const ri: ReadinessInput = { ...base(), scenarioId: "sep", days: i.days };
    const f = buildFollowUps({ day: 131, diagnostics: diags, advisories: adv, yesterdayTasks: tasksForDay(ri, 130), taskDefinitions: tasks, log: {} });
    expect(f.some((x) => x.id === "metric:radiation")).toBe(true);
    expect(f.some((x) => x.kind === "advisory")).toBe(true);
    const done = buildFollowUps({ day: 131, diagnostics: diags, advisories: adv, yesterdayTasks: [], taskDefinitions: tasks, log: { 131: { "metric:radiation": "2026-11-13T00:00:00Z" } } });
    expect(done.find((x) => x.id === "metric:radiation")?.completed).toBe(true);
    const action = mostImportantAction(f, tasksForDay(ri, 131), 131);
    expect(action.source).toBe("follow-up");
  });
});
