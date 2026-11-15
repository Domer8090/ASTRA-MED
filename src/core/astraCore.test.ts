import { describe, expect, it } from "vitest";
import { CRISIS_REPLY } from "../engine/tuesdayEngine";
import { aggregateStatus, evaluateAllMetrics } from "../engine/diagnosticEngine";
import { buildEffectiveDays } from "../services/telemetryService";
import { scenarioAdvisories } from "../engine/advisoryEngine";
import { createAstraCore, memoryStorage } from "./astraCore";

const fixed = () => new Date("2026-11-14T12:00:00Z");

function call<T>(core: ReturnType<typeof createAstraCore>, method: string, args: object = {}): T {
  const r = JSON.parse(core.call(method, JSON.stringify(args))) as { ok: boolean; result?: T; error?: string };
  if (!r.ok) throw new Error(r.error);
  return r.result as T;
}

describe("astra core", () => {
  it("matches the diagnostic engine for each scenario focus day", () => {
    const core = createAstraCore(memoryStorage(), { now: fixed });
    for (const scenarioId of ["nominal", "cardiovascular", "sep"] as const) {
      call(core, "setScenario", { scenarioId });
      const snap = call<{ day: number; overall: { status: string }; metrics: { id: string; status: string }[] }>(core, "snapshot");
      const days = buildEffectiveDays(scenarioId, []);
      const diagnostics = evaluateAllMetrics({ days, settings: { aredTargetMinutes: 60, hydrationTargetLiters: 2 }, evaluatedAt: fixed().toISOString() }, snap.day);
      for (const m of snap.metrics) expect(m.status).toBe(diagnostics[m.id as keyof typeof diagnostics].status);
      const overall = aggregateStatus(diagnostics, scenarioAdvisories(scenarioId, snap.day));
      expect(snap.overall.status).toBe(overall.status);
    }
  });

  it("validates entries with the same rules as the console", () => {
    const core = createAstraCore(memoryStorage(), { now: fixed });
    const bad = call<{ ok: boolean; errors?: Record<string, string> }>(core, "logMeasurement", { metricId: "heartRate", missionDay: 42, shipTime: "07:30", value: "250" });
    expect(bad.ok).toBe(false);
    const good = call<{ ok: boolean; status: string }>(core, "logMeasurement", { metricId: "heartRate", missionDay: 42, shipTime: "07:30", value: "110" });
    expect(good).toMatchObject({ ok: true, status: "CRITICAL" });
  });

  it("persists through the storage the host passes in", () => {
    const backend = memoryStorage();
    const a = createAstraCore(backend, { now: fixed });
    call(a, "logMeasurement", { metricId: "sleep", missionDay: 42, shipTime: "06:00", value: "5.5" });
    const b = createAstraCore(backend, { now: fixed });
    expect(call<unknown[]>(b, "measurements")).toHaveLength(1);
  });

  it("gives fixed replies for crisis and dangerous readings, and no model prompt", () => {
    const core = createAstraCore(memoryStorage(), { now: fixed });
    expect(call<{ message: { text: string } }>(core, "tuesdayAsk", { text: "I want to die" }).message.text).toBe(CRISIS_REPLY);
    expect(call<{ fixed: boolean }>(core, "tuesdayAsk", { text: "my heart rate is 250 bpm" }).fixed).toBe(true);
    expect(call(core, "tuesdayModelPrompt", { text: "my heart rate is 250 bpm" })).toBeNull();
    expect(call(core, "tuesdayModelPrompt", { text: "how did I sleep" })).not.toBeNull();
  });

  it("filters model answers before storing them", () => {
    const core = createAstraCore(memoryStorage(), { now: fixed });
    const msg = call<{ text: string; filtered?: number }>(core, "tuesdayRecordModelAnswer", {
      question: "should I take something for my headache",
      answer: "Take 400 mg of ibuprofen. Rest in a quiet place.",
      model: "test",
      hasPassages: false,
      sources: [],
    });
    expect(msg.text).not.toMatch(/ibuprofen/i);
    expect(msg.filtered).toBeGreaterThan(0);
  });

  it("never throws across the bridge", () => {
    const core = createAstraCore(memoryStorage(), { now: fixed });
    expect(JSON.parse(core.call("snapshot", "{not json"))).toMatchObject({ ok: false });
    expect(JSON.parse(core.call("missing"))).toMatchObject({ ok: false });
  });
});

describe("desktop import", () => {
  it("accepts valid rows and reports rejected ones by row number", async () => {
    const { importRows } = await import("../services/desktopBridge");
    const { createMissionStore } = await import("../state/missionStore");
    const { createStorageService } = await import("../services/storageService");
    const store = createMissionStore(createStorageService(memoryStorage()));
    const r = importRows(
      store,
      [
        { metricId: "heartRate", missionDay: 42, shipTime: "07:30", value: "64" },
        { metricId: "heartRate", missionDay: 42, shipTime: "07:30", value: "999" },
        { metricId: "notAMetric", missionDay: 42, shipTime: "07:30", value: "1" },
        { metricId: "bloodPressure", missionDay: 42, shipTime: "07:31", systolic: 118, diastolic: 76 },
      ],
      "test.json",
    );
    expect(r.accepted).toBe(2);
    expect(r.rejected.map((x) => x.row)).toEqual([2, 3]);
    expect(store.getState().measurements).toHaveLength(2);
  });
});
