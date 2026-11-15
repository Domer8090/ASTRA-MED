import { describe, expect, it } from "vitest";
import { parseVoiceCommand } from "./voiceParser";

describe("voiceParser", () => {
  it("opens the Earth view for everyday phrasings", () => {
    for (const phrase of ["Open the Earth.", "show me the globe", "open the map", "earth view please"]) {
      expect(parseVoiceCommand(phrase, 42).intent).toBe("earth_view");
    }
  });

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

  it("answers the wake word on its own and casual greetings", () => {
    for (const text of ["Hey Tuesday.", "Tuesday", "Hey Tuesday, what's up?", "hi tuesday how are you"]) {
      expect(parseVoiceCommand(text, 42).intent).toBe("greeting");
    }
  });

  it("reads spoken numbers", () => {
    const sleep = parseVoiceCommand("Can you record my sleep as nine hours?", 42);
    expect(sleep.intent).toBe("log_measurement");
    expect(sleep.metricId).toBe("sleep");
    expect(sleep.value).toBe(9);
    expect(parseVoiceCommand("I slept seven and a half hours", 42).value).toBe(7.5);
    expect(parseVoiceCommand("heart rate one hundred and ten", 42).value).toBe(110);
    expect(parseVoiceCommand("temperature thirty six point nine", 42).value).toBe(36.9);
  });

  it("logs the new value when asked to change from one value to another", () => {
    const r = parseVoiceCommand("No, I'm asking Tuesday, can you change my BPM from 130 to 110?", 42);
    expect(r.metricId).toBe("heartRate");
    expect(r.value).toBe(110);
  });

  it("applies a bare correction to the last logged reading", () => {
    const r = parseVoiceCommand("No, change it to 110.", 42, "heartRate");
    expect(r.intent).toBe("log_measurement");
    expect(r.metricId).toBe("heartRate");
    expect(r.value).toBe(110);
    expect(r.rawText).toBe("No, change it to 110.");
    expect(parseVoiceCommand("No, change it to 110.", 42).intent).not.toBe("log_measurement");
  });

  it("treats history questions as questions, never as readings", () => {
    const r = parseVoiceCommand("Can you tell me the last 14 days what has been my BPM?", 42);
    expect(r.intent).toBe("history_query");
    expect(r.metricId).toBe("heartRate");
    expect(r.days).toBe(14);
    expect(parseVoiceCommand("how has my sleep been this past week", 42)).toMatchObject({ intent: "history_query", metricId: "sleep", days: 7 });
  });

  it("never answers a status question with a fixed phrase", () => {
    expect(parseVoiceCommand("how am I doing", 42).speechResponse).toBe("");
  });

  it("refuses an impossible temperature and asks for a re-measure", () => {
    for (const q of ["My temperature is 21.", "My temperature is also decreased to 21."]) {
      const r = parseVoiceCommand(q, 42);
      expect(r.intent).toBe("log_measurement");
      expect(r.metricId).toBe("bodyTemperature");
      expect(r.value).toBeUndefined();
      expect(r.speechResponse).toMatch(/measure again/);
    }
    expect(parseVoiceCommand("my temperature is 98.6", 42).value).toBe(37);
  });

  it("logs reported symptoms", () => {
    const r = parseVoiceCommand("No, I have a headache, I can't measure it.", 42);
    expect(r.intent).toBe("symptom_report");
    expect(r.value).toEqual({ headache: true, blurredVision: false, eyePressure: false, otherSymptom: false });
    expect(parseVoiceCommand("I'm also not feeling well, I have a headache.", 42).value).toMatchObject({ headache: true, otherSymptom: true });
  });

  it("explains how to measure the reading in focus", () => {
    expect(parseVoiceCommand("How can I measure it?", 42, "bodyTemperature")).toMatchObject({ intent: "how_to_measure", metricId: "bodyTemperature" });
    expect(parseVoiceCommand("how do I measure my blood pressure", 42)).toMatchObject({ intent: "how_to_measure", metricId: "bloodPressure" });
    expect(parseVoiceCommand("How can I measure it?", 42).metricId).toBeUndefined();
  });

  it("answers what is critical from the status summary", () => {
    expect(parseVoiceCommand("Okay Tuesday, can you tell me what are some critical stuff?", 42).intent).toBe("status_query");
  });
  it("logs a number said before the reading, and follow-ups that put a number on the last reading", () => {
    expect(parseVoiceCommand("No, put 36.9 as my Fahrenheit or my body temperature.", 42)).toMatchObject({ intent: "log_measurement", metricId: "bodyTemperature", value: 36.9 });
    expect(parseVoiceCommand("Okay, can you measure as 36.9?", 42, "bodyTemperature")).toMatchObject({ intent: "log_measurement", metricId: "bodyTemperature", value: 36.9 });
    expect(parseVoiceCommand("Can you put it as 72?", 42, "heartRate")).toMatchObject({ intent: "log_measurement", metricId: "heartRate", value: 72 });
    expect(parseVoiceCommand("Can you put my temperature as 46 Celsius?", 42).value).toBeUndefined();
  });
});
