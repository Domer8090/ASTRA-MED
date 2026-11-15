import { describe, expect, it } from "vitest";
import { parseVoiceCommand, wordsToDigits } from "./voiceParser";

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
    const r = parseVoiceCommand("No, change it to 110.", 42, "heartRate", { metricId: "heartRate", missionDay: 42 });
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
    expect(parseVoiceCommand("Okay, can you measure as 36.9?", 42, "bodyTemperature", { metricId: "bodyTemperature", missionDay: 42 })).toMatchObject({ intent: "log_measurement", metricId: "bodyTemperature", value: 36.9 });
    expect(parseVoiceCommand("Can you put it as 72?", 42, "heartRate", { metricId: "heartRate", missionDay: 42 })).toMatchObject({ intent: "log_measurement", metricId: "heartRate", value: 72 });
    expect(parseVoiceCommand("Can you put my temperature as 46 Celsius?", 42).value).toBeUndefined();
  });

  describe("review fixes", () => {
    const last = { metricId: "heartRate" as const, missionDay: 42 };

    it("gives every crisis phrase Tuesday knows the safety reply, before repeat or Recharge", () => {
      expect(parseVoiceCommand("Pardon, there's no reason to live", 42).intent).toBe("urgent");
      expect(parseVoiceCommand("There's no reason to live, show me the earth", 42).intent).toBe("urgent");
      expect(parseVoiceCommand("I cannot breathe", 42).intent).toBe("urgent");
    });

    it("reads spoken compounds the way people say them", () => {
      expect(wordsToDigits("heart rate one thirty")).toBe("heart rate 130");
      expect(wordsToDigits("glucose one twenty five")).toBe("glucose 125");
      expect(wordsToDigits("blood pressure one forty over ninety")).toBe("blood pressure 140 over 90");
      expect(wordsToDigits("i did a thirty minute workout")).toBe("i did a 30 minute workout");
      expect(wordsToDigits("a hundred and ten")).toBe("110");
      expect(wordsToDigits("seventy two")).toBe("72");
      expect(wordsToDigits("seven eight")).toBe("7 8");
      expect(parseVoiceCommand("heart rate one thirty", 42).value).toBe(130);
      expect(parseVoiceCommand("blood pressure one forty over ninety", 42).value).toEqual({ systolic: 140, diastolic: 90 });
    });

    it("never marks a task done from a denial, a question or small talk", () => {
      for (const q of ["I did not do my workout today", "I haven't finished my workout", "Did I drink enough water?", "What did the medical officer say?", "How did you sleep, Tuesday?", "Are we done?", "I'm done for now"]) {
        expect(parseVoiceCommand(q, 42).intent, q).not.toBe("task_done");
      }
      expect(parseVoiceCommand("I finished my workout", 42).intent).toBe("task_done");
      expect(parseVoiceCommand("mark hydration done", 42).intent).toBe("task_done");
    });

    it("applies a correction only right after a voice log, on that reading's day", () => {
      expect(parseVoiceCommand("Set a timer for 10 minutes", 42, "aredMinutes").intent).not.toBe("log_measurement");
      expect(parseVoiceCommand("It was 2 days ago", 42, "sleep").intent).not.toBe("log_measurement");
      expect(parseVoiceCommand("Set a timer for 10 minutes", 42, "aredMinutes", { metricId: "aredMinutes", missionDay: 42 }).intent).not.toBe("log_measurement");
      const fix = parseVoiceCommand("No, it was 7", 42, "sleep", { metricId: "sleep", missionDay: 41 });
      expect(fix).toMatchObject({ intent: "log_measurement", metricId: "sleep", value: 7, targetDay: 41, correction: true });
      expect(parseVoiceCommand("No, it was 7 yesterday", 42, "sleep", { metricId: "sleep", missionDay: 42 })).toMatchObject({ value: 7, targetDay: 41 });
      expect(parseVoiceCommand("No, change it to 110", 42, "heartRate", last)).toMatchObject({ value: 110, targetDay: 42 });
    });

    it("logs symptoms only from a plain statement", () => {
      for (const q of ["I'm sick of this food", "I'm not sick", "I don't feel nauseous", "Is a headache normal up here?"]) {
        expect(parseVoiceCommand(q, 42).intent, q).not.toBe("symptom_report");
      }
      expect(parseVoiceCommand("I feel dizzy", 42).intent).toBe("symptom_report");
      expect(parseVoiceCommand("I'm not feeling well", 42).value).toMatchObject({ otherSymptom: true });
    });

    it("logs a reading that also names a day or says 'has been'", () => {
      expect(parseVoiceCommand("Heart rate 64 for mission day 62", 42)).toMatchObject({ intent: "log_measurement", value: 64, targetDay: 62 });
      expect(parseVoiceCommand("My pulse has been 72 this morning", 42)).toMatchObject({ intent: "log_measurement", value: 72 });
      expect(parseVoiceCommand("What has my heart rate been over the last 14 days?", 42)).toMatchObject({ intent: "history_query", days: 14 });
      expect(parseVoiceCommand("what mission day is it", 42).intent).toBe("time_query");
    });
  });

  it("ends the conversation on a goodbye or stop, but not on a sentence that only contains one", () => {
    for (const q of ["Bye", "Okay, thanks Tuesday, that's all", "I'm done for now", "That's it for today", "Goodbye Tuesday", "Stop listening", "We're done here", "Good night"]) {
      expect(parseVoiceCommand(q, 42).intent, q).toBe("goodbye");
    }
    for (const q of ["Stop", "Stop talking", "Be quiet"]) expect(parseVoiceCommand(q, 42).intent, q).toBe("stop");
    for (const q of ["I'm done with my workout", "I finished my workout", "Is that all my readings?"]) {
      expect(parseVoiceCommand(q, 42).intent, q).not.toBe("goodbye");
    }
  });
});
