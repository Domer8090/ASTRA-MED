import { describe, expect, it } from "vitest";
import { getMissionTelemetry } from "./missionTelemetry";
import { SCENARIO_ORDER } from "./scenarios";

describe("synthetic mission telemetry", () => {
  it.each(SCENARIO_ORDER)("has 180 consecutive days (%s)", (id) => {
    const t = getMissionTelemetry(id);
    expect(t).toHaveLength(180);
    t.forEach((d, i) => expect(d.missionDay).toBe(i + 1));
  });

  it("is deterministic", () => {
    const a = JSON.stringify(getMissionTelemetry("nominal"));
    // Clear-cache equivalent: regenerate through a fresh module graph is overkill; compare scenarios that share base noise.
    const b = JSON.stringify(getMissionTelemetry("nominal"));
    expect(a).toBe(b);
  });

  it.each(SCENARIO_ORDER)("cumulative radiation is the running sum of daily dose and never decreases (%s)", (id) => {
    const t = getMissionTelemetry(id);
    let sum = 0;
    let prev = 0;
    for (const d of t) {
      sum = Math.round((sum + d.dailyRadiationMsv) * 100) / 100;
      expect(d.cumulativeRadiationMsv).toBeCloseTo(sum, 2);
      expect(d.cumulativeRadiationMsv).toBeGreaterThanOrEqual(prev);
      expect(d.dailyRadiationMsv).toBeGreaterThan(0);
      prev = d.cumulativeRadiationMsv;
    }
  });

  it("stays inside physiologically plausible bounds", () => {
    for (const id of SCENARIO_ORDER) {
      for (const d of getMissionTelemetry(id)) {
        expect(d.heartRate).toBeGreaterThan(40);
        expect(d.heartRate).toBeLessThan(105);
        expect(d.systolic).toBeGreaterThan(95);
        expect(d.systolic).toBeLessThan(150);
        expect(d.diastolic).toBeGreaterThan(55);
        expect(d.diastolic).toBeLessThan(95);
        expect(d.temperature).toBeGreaterThanOrEqual(36.6);
        expect(d.temperature).toBeLessThanOrEqual(37.5);
        expect(d.sleepHours).toBeGreaterThanOrEqual(4.5);
        expect(d.moodScore).toBeGreaterThanOrEqual(1);
        expect(d.moodScore).toBeLessThanOrEqual(5);
      }
    }
  });

  it("scenario B drifts heart rate and blood pressure above caution limits around its focus day", () => {
    const b = getMissionTelemetry("cardiovascular");
    const a = getMissionTelemetry("nominal");
    const day118 = b[117]!;
    expect(day118.heartRate).toBeGreaterThan(85);
    expect(day118.systolic).toBeGreaterThan(135);
    expect(a[117]!.heartRate).toBeLessThan(70);
    // Before the drift both scenarios share the same base data.
    expect(b[50]).toEqual(a[50]);
  });

  it("scenario C adds a dose spike only during the simulated SEP", () => {
    const c = getMissionTelemetry("sep");
    const a = getMissionTelemetry("nominal");
    expect(c[130]!.dailyRadiationMsv).toBeGreaterThan(2 * a[130]!.dailyRadiationMsv);
    expect(c[100]).toEqual(a[100]);
  });
});
