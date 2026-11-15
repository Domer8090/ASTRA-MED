import { describe, expect, it } from "vitest";
import { parseVoiceCommand } from "./voiceParser";

describe("voiceParser", () => {
  it("parses heart rate when astronaut says 'my bpm is 100'", () => {
    const res = parseVoiceCommand("my bpm is 100", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("heartRate");
    expect(res.value).toBe(100);
    expect(res.unit).toBe("bpm");
    expect(res.displayText).toContain("100 BPM");
    expect(res.speechResponse).toContain("100 beats per minute");
  });

  it("parses heart rate when astronaut says 'heart rate 75'", () => {
    const res = parseVoiceCommand("heart rate 75", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("heartRate");
    expect(res.value).toBe(75);
  });

  it("parses blood pressure when astronaut says 'blood pressure 120 over 80'", () => {
    const res = parseVoiceCommand("blood pressure 120 over 80", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("bloodPressure");
    expect(res.value).toEqual({ systolic: 120, diastolic: 80 });
    expect(res.displayText).toContain("120/80 mmHg");
  });

  it("parses body temperature when astronaut says 'temperature is 37.2'", () => {
    const res = parseVoiceCommand("temperature is 37.2", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("bodyTemperature");
    expect(res.value).toBe(37.2);
    expect(res.unit).toBe("°C");
  });

  it("parses blood glucose when astronaut says 'glucose 95'", () => {
    const res = parseVoiceCommand("blood glucose 95", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("bloodGlucose");
    expect(res.value).toBe(95);
  });

  it("parses sleep duration when astronaut says 'I slept 7.5 hours'", () => {
    const res = parseVoiceCommand("I slept 7.5 hours", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("sleep");
    expect(res.value).toBe(7.5);
  });

  it("parses mood score when astronaut says 'mood 4'", () => {
    const res = parseVoiceCommand("my mood is 4", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("mood");
    expect(res.value).toBe(4);
  });

  it("parses ARED exercise when astronaut says 'exercise 45 minutes'", () => {
    const res = parseVoiceCommand("exercise 45 minutes", 42);
    expect(res.intent).toBe("log_measurement");
    expect(res.metricId).toBe("aredMinutes");
    expect(res.value).toBe(45);
  });

  it("detects Tuesday Mode activation command", () => {
    const res = parseVoiceCommand("activate tuesday mode", 42);
    expect(res.intent).toBe("toggle_tuesday_mode");
    expect(res.displayText).toContain("Tuesday mode");
  });

  it("detects status queries", () => {
    const res = parseVoiceCommand("how am I doing", 42);
    expect(res.intent).toBe("status_query");
  });
});
