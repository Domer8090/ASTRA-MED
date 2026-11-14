import { describe, expect, it } from "vitest";
import { createStorageService, memoryBackend, STORAGE_KEYS, type StorageLike } from "../services/storageService";
import { createMissionStore } from "./missionStore";
import { validateMeasurement, type MeasurementDraft } from "../utils/validation";
import { formatMetStamp, missionDayOf } from "../utils/dates";

const draft = (over: Partial<MeasurementDraft>): MeasurementDraft => ({
  metricId: "heartRate",
  missionDay: "42",
  shipTime: "07:30",
  value: "",
  systolic: "",
  diastolic: "",
  symptoms: { blurredVision: false, headache: false, eyePressure: false, otherSymptom: false },
  glucoseContext: "fasting",
  notes: "",
  ...over,
});
const ctx = { previousCumulativeDose: 75, nextManualDose: null };

describe("measurement validation", () => {
  it("accepts a valid heart rate and rejects impossible values", () => {
    expect(validateMeasurement(draft({ value: "64" }), ctx).ok).toBe(true);
    const bad = validateMeasurement(draft({ value: "400" }), ctx);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.value).toMatch(/between 25 and 220/);
    expect(validateMeasurement(draft({ value: "abc" }), ctx).ok).toBe(false);
    expect(validateMeasurement(draft({ value: "" }), ctx).ok).toBe(false);
  });

  it("requires systolic above diastolic", () => {
    const r = validateMeasurement(draft({ metricId: "bloodPressure", systolic: "80", diastolic: "90" }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.systolic).toMatch(/higher than diastolic/);
    expect(validateMeasurement(draft({ metricId: "bloodPressure", systolic: "122", diastolic: "78" }), ctx).ok).toBe(true);
  });

  it("rejects mission day out of range and invalid ship time; stores MET-consistent timestamps", () => {
    expect(validateMeasurement(draft({ value: "60", missionDay: "181" }), ctx).ok).toBe(false);
    expect(validateMeasurement(draft({ value: "60", shipTime: "25:10" }), ctx).ok).toBe(false);
    const ok = validateMeasurement(draft({ value: "60", missionDay: "42", shipTime: "06:41" }), ctx);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(missionDayOf(ok.recordedAt)).toBe(42);
      expect(formatMetStamp(ok.recordedAt)).toBe("041/06:41");
    }
  });

  it("rejects a cumulative dose lower than the previous day", () => {
    const r = validateMeasurement(draft({ metricId: "radiation", value: "70" }), ctx);
    expect(r.ok).toBe(false);
    expect(validateMeasurement(draft({ metricId: "radiation", value: "77.5" }), ctx).ok).toBe(true);
  });
});

describe("mission store persistence", () => {
  it("persists measurements and task records across store instances", () => {
    const backend = memoryBackend();
    const a = createMissionStore(createStorageService(backend));
    const r = a.logMeasurement({ metricId: "sleep", value: 6.8, missionDay: 42, recordedAt: "2026-06-14T07:00:00.000Z" });
    expect(r.persisted).toBe(true);
    expect(r.completedTaskTitle).toBe("Sleep log");
    expect(r.measurement?.enteredAt).toBeTruthy();
    a.setTaskCompletion(42, "ared-session", true);
    a.setScenario("sep");
    const b = createMissionStore(createStorageService(backend));
    expect(b.getState().measurements).toHaveLength(1);
    expect(b.getState().completions[42]?.["ared-session"]?.completed).toBe(true);
    expect(b.getState().settings.scenarioId).toBe("sep");
    expect(b.getState().settings.selectedDay).toBe(131);
  });

  it("logging a new measurement never overwrites history", () => {
    const s = createMissionStore(createStorageService(memoryBackend()));
    s.logMeasurement({ metricId: "heartRate", value: 60, missionDay: 42, recordedAt: "2026-06-14T07:00:00.000Z" });
    s.logMeasurement({ metricId: "heartRate", value: 62, missionDay: 42, recordedAt: "2026-06-14T07:10:00.000Z" });
    expect(s.getState().measurements).toHaveLength(2);
  });

  it("recovers from corrupt JSON and invalid shapes without throwing", () => {
    const backend = memoryBackend({
      [STORAGE_KEYS.measurements]: "{not json",
      [STORAGE_KEYS.settings]: JSON.stringify({ scenarioId: "mars", selectedDay: 999, trendWindow: 3 }),
      [STORAGE_KEYS.countermeasures]: JSON.stringify([1, 2, 3]),
    });
    const s = createMissionStore(createStorageService(backend));
    expect(s.getState().measurements).toEqual([]);
    expect(s.getState().settings.scenarioId).toBe("nominal");
    expect(s.getState().settings.selectedDay).toBe(42);
    expect(s.getState().settings.trendWindow).toBe(30);
    expect(s.getState().storage.recoveredKeys).toContain(STORAGE_KEYS.measurements);
    expect(s.getState().storage.recoveredKeys).toContain(STORAGE_KEYS.countermeasures);
  });

  it("drops individual invalid measurements but keeps valid ones", () => {
    const backend = memoryBackend({
      [STORAGE_KEYS.measurements]: JSON.stringify([
        { id: "a", metricId: "heartRate", value: 61, unit: "bpm", missionDay: 10, recordedAt: "2026-05-13T07:00:00Z", source: "manual" },
        { id: "b", metricId: "heartRate", value: "61", missionDay: 10, recordedAt: "x", source: "manual" },
        { id: "c", metricId: "bloodPressure", value: { systolic: 120 }, missionDay: 10, recordedAt: "2026-05-13T07:00:00Z", source: "manual" },
      ]),
    });
    const s = createMissionStore(createStorageService(backend));
    expect(s.getState().measurements.map((m) => m.id)).toEqual(["a"]);
  });

  it("keeps working in memory when storage is unavailable", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    const s = createMissionStore(createStorageService(broken));
    expect(s.getState().storage.available).toBe(false);
    const r = s.logMeasurement({ metricId: "heartRate", value: 60, missionDay: 42, recordedAt: "2026-06-14T07:00:00.000Z" });
    expect(r.ok).toBe(true);
    expect(r.persisted).toBe(false);
    expect(r.message).toMatch(/Not saved/);
    expect(s.getState().measurements).toHaveLength(1);
  });

  it("reset restores the bundled baseline", () => {
    const backend = memoryBackend();
    const s = createMissionStore(createStorageService(backend));
    s.logMeasurement({ metricId: "heartRate", value: 60, missionDay: 42, recordedAt: "2026-06-14T07:00:00.000Z" });
    s.setScenario("cardiovascular");
    s.resetDemoData();
    expect(s.getState().measurements).toEqual([]);
    expect(s.getState().settings.scenarioId).toBe("nominal");
    expect(backend.data[STORAGE_KEYS.measurements]).toBeUndefined();
  });
});
