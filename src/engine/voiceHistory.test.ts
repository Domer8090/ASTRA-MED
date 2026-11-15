import { describe, expect, it } from "vitest";
import { buildEffectiveDays } from "../services/telemetryService";
import { describeHistory } from "./voiceHistory";

describe("voice history answers", () => {
  const days = buildEffectiveDays("nominal", []);
  it("summarises a numeric indicator from the record", () => {
    const text = describeHistory(days, 42, "heartRate", 14, "NOMINAL");
    expect(text).toMatch(/^Over the last 14 days \(\d+ readings\), your heart rate ranged from \d+ to \d+ bpm, averaging [\d.]+\. Today it is \d+\s?bpm, which is NOMINAL\.$/);
  });
  it("summarises blood pressure as systolic/diastolic", () => {
    expect(describeHistory(days, 42, "bloodPressure", 7, "NOMINAL")).toMatch(/ranged from \d+\/\d+ to \d+\/\d+ mmHg/);
  });
  it("names a non-nominal status and points to the action queue", () => {
    expect(describeHistory(days, 42, "heartRate", 7, "CRITICAL")).toMatch(/which is CRITICAL, so follow the step in your action queue\.$/);
  });
});
