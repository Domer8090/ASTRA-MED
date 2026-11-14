import { describe, expect, it } from "vitest";
import { buildEffectiveDays } from "../services/telemetryService";
import { nextArrival, parseEnlil, sanitizeEnlilCache } from "../services/enlilForecast";
import { sanitizeOnboarding } from "../hooks/useOnboarding";
import type { ScenarioId } from "../types/health";
import { evaluateAllMetrics } from "./diagnosticEngine";
import { earthMarsDistanceAu, earthMarsLightMinutes } from "./lightTime";
import { linearFit, trendWatch } from "./trendEngine";

function at(scenario: ScenarioId, day: number) {
  const days = buildEffectiveDays(scenario, []);
  const diagnostics = evaluateAllMetrics({ days, settings: { aredTargetMinutes: 60, hydrationTargetLiters: 2 }, evaluatedAt: "2026-11-14T00:00:00Z" }, day);
  return { trends: trendWatch(days, day, diagnostics), diagnostics };
}

describe("trend watch", () => {
  it("fits a straight line exactly", () => {
    const f = linearFit([[1, 3], [2, 5], [3, 7]]);
    expect(f.b).toBeCloseTo(2);
    expect(f.a).toBeCloseTo(1);
    expect(f.r2).toBeCloseTo(1);
  });

  it("warns about Scenario B's heart-rate drift before it reaches CAUTION", () => {
    const { trends, diagnostics } = at("cardiovascular", 104);
    expect(diagnostics.heartRate.status).toBe("NOMINAL");
    const hr = trends.find((t) => t.metricId === "heartRate");
    expect(hr?.direction).toBe("rising");
    expect(hr?.daysToLimit).toBeLessThanOrEqual(7);
    expect(hr?.text).toMatch(/projection, not a diagnosis/);
  });

  it("stays silent once the indicator is already outside its range", () => {
    const { trends, diagnostics } = at("cardiovascular", 118);
    expect(diagnostics.heartRate.status).not.toBe("NOMINAL");
    expect(trends.some((t) => t.metricId === "heartRate")).toBe(false);
  });

  it("is quiet on the nominal demo day", () => {
    expect(at("nominal", 42).trends).toEqual([]);
  });
});

describe("Earth–Mars light time (JPL approximate elements)", () => {
  it("matches the January 2025 close approach (0.642 AU)", () => {
    expect(earthMarsDistanceAu(new Date("2025-01-12T00:00:00Z"))).toBeCloseTo(0.642, 2);
  });
  it("matches the November 2023 solar conjunction (about 2.52 AU)", () => {
    expect(earthMarsDistanceAu(new Date("2023-11-18T00:00:00Z"))).toBeGreaterThan(2.45);
  });
  it("stays inside the physical 3 to 23 minute range", () => {
    for (let y = 2024; y <= 2030; y++) {
      const m = earthMarsLightMinutes(new Date(`${y}-06-01T00:00:00Z`));
      expect(m).toBeGreaterThan(3);
      expect(m).toBeLessThan(23);
    }
  });
});

describe("WSA-ENLIL forecast parsing", () => {
  const run = (id: string, completed: string, mars: string | null, earth: string | null) => ({
    simulationID: id,
    modelCompletionTime: completed,
    estimatedShockArrivalTime: earth,
    isEarthGB: true,
    cmeInputs: [{ CMEID: "2026-11-13T03:24:00-CME-001", speed: 525, isMostAccurate: true }],
    impactList: mars ? [{ location: "Mars", arrivalTime: mars, isGlancingBlow: false }, { location: "Psyche", arrivalTime: mars }] : [],
    link: "https://ccmc.gsfc.nasa.gov/DONKI/view/WSA-ENLIL/1/-1",
  });

  it("keeps Earth and Mars arrivals from the latest run of each CME", () => {
    const arrivals = parseEnlil([
      run("WSA-ENLIL/1/1", "2026-11-13T10:00Z", "2026-11-16T06:00Z", null),
      run("WSA-ENLIL/2/1", "2026-11-13T16:00Z", "2026-11-16T09:00Z", "2026-11-15T12:00Z"),
      { junk: true },
    ]);
    expect(arrivals.map((a) => a.location)).toEqual(["Earth", "Mars"]);
    const mars = arrivals.find((a) => a.location === "Mars")!;
    expect(mars.arrivalTime).toBe("2026-11-16T09:00:00.000Z");
    expect(mars.simulationId).toBe("WSA-ENLIL/2/1");
    expect(arrivals.find((a) => a.location === "Earth")!.glancingBlow).toBe(true);
  });

  it("finds the next arrival and ignores long-past ones", () => {
    const arrivals = parseEnlil([run("A", "2026-11-01T00:00Z", "2026-11-02T00:00Z", null), run("B", "2026-11-13T00:00Z", "2026-11-16T00:00Z", null)].map((r, i) => ({ ...r, cmeInputs: [{ CMEID: `cme-${i}` }] })));
    expect(nextArrival(arrivals, "Mars", Date.parse("2026-11-14T00:00Z"))?.simulationId).toBe("B");
    expect(nextArrival(arrivals, "Earth", Date.parse("2026-11-14T00:00Z"))).toBeUndefined();
  });

  it("rejects malformed cache data", () => {
    expect(sanitizeEnlilCache({ version: 2 })).toBeNull();
    const c = sanitizeEnlilCache({ version: 1, arrivals: [{ location: "Venus", arrivalTime: "2026-11-16T00:00Z", simulationId: "x" }], retrievedAt: "nope" });
    expect(c?.arrivals).toEqual([]);
    expect(c?.retrievedAt).toBeNull();
  });
});

describe("onboarding record", () => {
  it("treats anything but true as not seen", () => {
    expect(sanitizeOnboarding({ overviewSeen: "yes", tourDone: true })).toEqual({ overviewSeen: false, tourDone: true });
    expect(sanitizeOnboarding(null)).toBeNull();
  });
});

describe("flight-surgeon report", () => {
  it("lists the flagged indicators with their rules and labels synthetic data", async () => {
    const { buildSurgeonReport } = await import("./reportEngine");
    const { aggregateStatus } = await import("./diagnosticEngine");
    const { evaluateBodySystems } = await import("./bodySystemEngine");
    const { SCENARIOS } = await import("../data/scenarios");
    const days = buildEffectiveDays("cardiovascular", []);
    const diagnostics = evaluateAllMetrics({ days, settings: { aredTargetMinutes: 60, hydrationTargetLiters: 2 }, evaluatedAt: "2026-11-14T00:00:00Z" }, 118);
    const text = buildSurgeonReport({
      day: 118,
      scenario: SCENARIOS.cardiovascular,
      overall: aggregateStatus(diagnostics),
      systems: evaluateBodySystems(diagnostics, []),
      diagnostics,
      trends: [],
      advisories: [],
      followUps: [],
      readiness: { score: 80, components: [], taskCompletion: 1, weeklyAdherence: 1, followUpCompletion: 1, dataFreshness: 1, completedTasks: 6, totalTasks: 6, totalXp: 0, todayXp: 0, streakDays: 0, message: "" },
      days,
      generatedAt: "2026-11-14 10:00",
      signalDelayMinutes: 11,
    });
    expect(text).toMatch(/OVERALL STATUS: CAUTION/);
    expect(text).toMatch(/Resting heart rate: CAUTION/);
    expect(text).toMatch(/Rule: .*85/);
    expect(text).toMatch(/SYNTHETIC demo telemetry/);
    expect(text).toMatch(/not NASA flight rules/);
  });
});
