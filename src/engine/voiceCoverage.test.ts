import { describe, expect, it } from "vitest";
import { parseVoiceCommand, type VoiceIntent } from "./voiceParser";

/** Everyday things a crew member says, and what Tuesday must do with each. */
const CASES: [string, VoiceIntent, string?][] = [
  // Questions about one reading
  ["Is my heart rate normal?", "reading_query", "heartRate"],
  ["What's my blood pressure", "reading_query", "bloodPressure"],
  ["Why is my temperature critical?", "reading_query", "bodyTemperature"],
  ["Is my glucose too high?", "reading_query", "bloodGlucose"],
  ["Should I be worried about my sleep", "reading_query", "sleep"],
  ["how's my radiation dose", "reading_query", "radiation"],
  ["Tell me my pulse", "reading_query", "heartRate"],
  // Logging
  ["Heart rate 64", "log_measurement", "heartRate"],
  ["My blood pressure is 120 over 80", "log_measurement", "bloodPressure"],
  ["I slept seven hours", "log_measurement", "sleep"],
  ["Thank you. My mood is now five.", "log_measurement", "mood"],
  // History, status, measuring
  ["What has my sleep been the past week", "history_query", "sleep"],
  ["How am I doing?", "status_query"],
  ["Is anything wrong?", "status_query"],
  ["How do I measure my glucose?", "how_to_measure", "bloodGlucose"],
  // Tasks
  ["What's left on my checklist?", "tasks_query"],
  ["What should I do next?", "tasks_query"],
  ["I finished my workout", "task_done"],
  ["Mark hydration done", "task_done"],
  // Environment, comms, time, score
  ["Is there a solar storm?", "weather_query"],
  ["Is it safe today?", "weather_query"],
  ["Can I talk to the ground?", "comms_query"],
  ["What's the signal delay?", "comms_query"],
  ["What day is it?", "time_query"],
  ["How many days are left?", "time_query"],
  ["What's my plan score?", "readiness_query"],
  ["What's my streak", "readiness_query"],
  // Symptoms and emergencies
  ["I have a headache", "symptom_report"],
  ["I feel dizzy", "symptom_report"],
  ["I have chest pain", "urgent"],
  ["I can't breathe properly", "urgent"],
  ["My heart is racing", "urgent"],
  // Control
  ["Stop", "stop"],
  ["Say that again", "repeat"],
  ["Undo that", "undo"],
  ["That was wrong", "undo"],
  ["Thanks Tuesday", "thanks"],
  ["Hey Tuesday", "greeting"],
  ["Contact the medical officer", "medical_officer"],
];

describe("everyday voice coverage", () => {
  it.each(CASES)("%s -> %s", (text, intent, metric) => {
    const r = parseVoiceCommand(text, 42);
    expect(r.intent).toBe(intent);
    if (metric) expect(r.metricId).toBe(metric);
  });
});
