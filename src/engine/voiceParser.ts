/**
 * Intelligent voice command parser for Tuesday.
 * Extracts vital signs, astronaut telemetry, commands, and questions
 * from natural speech (e.g. "my bpm is 100", "blood pressure 120 over 80").
 */
import { BLOOD_PRESSURE } from "../config/thresholds";
import type { MeasurementValue, MetricId } from "../types/health";
import { entrySpec } from "../utils/validation";

export type VoiceIntent =
  | "log_measurement"
  | "toggle_tuesday_mode"
  | "status_query"
  | "earth_view"
  | "breathe"
  | "game"
  | "medical_officer"
  | "help"
  | "greeting"
  | "unknown";

export interface ParsedVoiceResult {
  intent: VoiceIntent;
  metricId?: MetricId;
  value?: MeasurementValue;
  unit?: string;
  targetDay?: number;
  displayText: string;
  speechResponse: string;
  confidence: number;
  rawText: string;
  warning?: string;
}

/**
 * Parses spoken text into an actionable medical command or Tuesday response.
 */
export function parseVoiceCommand(raw: string, currentDay: number): ParsedVoiceResult {
  const text = raw.trim().toLowerCase();

  // Determine target mission day (e.g. "yesterday my heart rate was 215", "for day 62")
  let targetDay = currentDay;
  if (/\byesterday\b/i.test(text)) {
    targetDay = Math.max(1, currentDay - 1);
  } else {
    const dayMatch = text.match(/\b(?:for|on|mission)?\s*day\s*(\d{1,3})\b/i);
    if (dayMatch && dayMatch[1]) {
      const parsedDay = parseInt(dayMatch[1], 10);
      if (parsedDay >= 1 && parsedDay <= 180) {
        targetDay = parsedDay;
      }
    }
  }

  // Strip conversational wake words or prefixes
  const clean = text
    .replace(/^(hey\s+|ok\s+|hello\s+)?tuesday\s*[,:]?\s*/i, "")
    .replace(/^(hey\s+|ok\s+)?jarvis\s*[,:]?\s*/i, "")
    .trim();

  // 1. Commands that open or close Tuesday mode
  if (
    /\b(activate|open|launch|switch to|enter|start|show)\s+(tuesday\s+mode|jarvis\s+mode|hud|command\s+center)\b/i.test(text) ||
    /^(tuesday\s+mode|jarvis\s+mode|command\s+center)$/i.test(clean)
  ) {
    return {
      intent: "toggle_tuesday_mode",
      displayText: "Opening Tuesday mode",
      speechResponse: "Tuesday mode open.",
      confidence: 0.98,
      rawText: raw,
    };
  }

  if (/\b(exit|close|leave|disable|stop)\s+(tuesday\s+mode|jarvis\s+mode|hud|command\s+center)\b/i.test(text)) {
    return {
      intent: "toggle_tuesday_mode",
      displayText: "Closing Tuesday mode",
      speechResponse: "Standard console restored.",
      confidence: 0.98,
      rawText: raw,
    };
  }

  // 2. Heart Rate / BPM (e.g. "my bpm is 100", "heart rate around 215", "pulse 85", "bpm 110")
  const hrMatch =
    clean.match(/(?:bpm|heart\s*rate|pulse)\D{0,35}?(\d{2,3})\b/i) ??
    clean.match(/\b(\d{2,3})\s*(?:bpm|beats\s*(?:per\s*minute)?)\b/i) ??
    clean.match(/(?:log|record|set|add)\s+(?:my\s+)?(?:bpm|heart\s*rate|pulse)\D{0,20}?(\d{2,3})\b/i);

  if (hrMatch && hrMatch[1]) {
    const val = parseInt(hrMatch[1], 10);
    const spec = entrySpec("heartRate");
    const valid = spec ? val >= spec.min && val <= spec.max : val >= 30 && val <= 240;

    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "heartRate",
        value: val,
        unit: "bpm",
        targetDay,
        displayText: `Logged resting heart rate: ${val} BPM${dayLabel}`,
        speechResponse: `Heart rate ${val} beats per minute logged${dayLabel}.`,
        confidence: 0.95,
        rawText: raw,
      };
    } else {
      return {
        intent: "log_measurement",
        metricId: "heartRate",
        targetDay,
        displayText: `Heart rate ${val} BPM is outside accepted range (30-240 BPM)`,
        speechResponse: `Heart rate ${val} is outside sensor bounds. Please verify.`,
        confidence: 0.8,
        rawText: raw,
        warning: "Sensor value out of device range.",
      };
    }
  }

  // 3. Blood Pressure (e.g. "blood pressure 120 over 80", "bp is 125 by 82", "118 over 76")
  const bpMatch =
    clean.match(/(?:blood\s*pressure|bp)\D{0,25}?(\d{2,3})\s*(?:over|\/|by|\s)\s*(\d{2,3})\b/i) ??
    clean.match(/\b(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})\s*(?:mmhg|blood\s*pressure)?\b/i);

  if (bpMatch && bpMatch[1] && bpMatch[2]) {
    const sys = parseInt(bpMatch[1], 10);
    const dia = parseInt(bpMatch[2], 10);
    const bpSpec = BLOOD_PRESSURE.entry;
    const valid =
      sys >= bpSpec.systolic.min &&
      sys <= bpSpec.systolic.max &&
      dia >= bpSpec.diastolic.min &&
      dia <= bpSpec.diastolic.max;

    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "bloodPressure",
        value: { systolic: sys, diastolic: dia },
        unit: "mmHg",
        targetDay,
        displayText: `Logged blood pressure: ${sys}/${dia} mmHg${dayLabel}`,
        speechResponse: `Blood pressure ${sys} over ${dia} recorded${dayLabel}, Commander.`,
        confidence: 0.95,
        rawText: raw,
      };
    } else {
      return {
        intent: "log_measurement",
        metricId: "bloodPressure",
        targetDay,
        displayText: `Blood pressure ${sys}/${dia} mmHg is outside expected physiological bounds`,
        speechResponse: `Blood pressure ${sys} over ${dia} is out of range. Please re-check.`,
        confidence: 0.8,
        rawText: raw,
        warning: "Reading out of range.",
      };
    }
  }

  // 4. Body Temperature (e.g. "temperature is 37.1", "my temp is 36.8", "temp 37")
  const tempMatch =
    clean.match(/(?:temperature|temp|fever)\D{0,20}?(\d{2}(?:[.,]\d)?)\s*(?:degrees|c|celsius)?\b/i) ??
    clean.match(/\b(\d{2}(?:[.,]\d)?)\s*(?:degrees\s*c|celsius|°c)\b/i);

  if (tempMatch && tempMatch[1]) {
    const val = parseFloat(tempMatch[1].replace(",", "."));
    const spec = entrySpec("bodyTemperature");
    const valid = spec ? val >= spec.min && val <= spec.max : val >= 34 && val <= 42;
    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "bodyTemperature",
        value: Math.round(val * 10) / 10,
        unit: "°C",
        targetDay,
        displayText: `Logged core body temperature: ${val.toFixed(1)} °C${dayLabel}`,
        speechResponse: `Core temperature ${val.toFixed(1)} Celsius logged${dayLabel}, Commander.`,
        confidence: 0.95,
        rawText: raw,
      };
    }
  }

  // 5. Blood Glucose (e.g. "blood glucose 95", "glucose is 105", "blood sugar 90")
  const gluMatch =
    clean.match(/(?:blood\s*glucose|glucose(?:\s+level)?|blood\s*sugar(?:\s+level)?)\D{0,16}?(\d{2,3})\b/i) ??
    clean.match(/(?:blood\s*glucose|glucose(?:\s+level)?|blood\s*sugar(?:\s+level)?).{0,100}?\b(?:about|around|at|near|is|was|of)\s*(\d{2,3})\b/i) ??
    clean.match(/\b(\d{2,3})\s*(?:mg\s*\/?\s*dl|milligrams)\b/i);

  if (gluMatch && gluMatch[1]) {
    const val = parseInt(gluMatch[1], 10);
    const spec = entrySpec("bloodGlucose");
    const valid = spec ? val >= spec.min && val <= spec.max : val >= 40 && val <= 300;
    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "bloodGlucose",
        value: val,
        unit: "mg/dL",
        targetDay,
        displayText: `Logged blood glucose: ${val} mg/dL${dayLabel}`,
        speechResponse: `Blood glucose ${val} recorded${dayLabel}, Commander.`,
        confidence: 0.95,
        rawText: raw,
      };
    }
  }

  // 6. Sleep duration (e.g. "I slept 7 hours", "sleep was 6.5 hours", "sleep 8")
  const sleepMatch =
    clean.match(/(?:sleep|slept)\D{0,20}?(\d{1,2}(?:[.,]\d)?)\s*(?:hours?|hrs?)?\b/i) ??
    clean.match(/\b(\d{1,2}(?:[.,]\d)?)\s*(?:hours?|hrs?)\s*(?:of\s*)?sleep\b/i);

  if (sleepMatch && sleepMatch[1]) {
    const val = parseFloat(sleepMatch[1].replace(",", "."));
    const spec = entrySpec("sleep");
    const valid = spec ? val >= spec.min && val <= spec.max : val >= 0 && val <= 16;
    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "sleep",
        value: Math.round(val * 10) / 10,
        unit: "h",
        targetDay,
        displayText: `Logged sleep duration: ${val.toFixed(1)} hours${dayLabel}`,
        speechResponse: `Sleep duration ${val.toFixed(1)} hours logged${dayLabel}.`,
        confidence: 0.95,
        rawText: raw,
      };
    }
  }

  // 7. Mood Score (e.g. "my mood is 4", "mood score 5", "mood 3")
  const moodMatch =
    clean.match(/mood\D{0,15}?(\d(?:[.,]\d)?)\b/i) ??
    clean.match(/(?:rate|set)\s+(?:my\s+)?mood\D{0,10}?(\d(?:[.,]\d)?)\b/i);

  if (moodMatch && moodMatch[1]) {
    const val = parseFloat(moodMatch[1].replace(",", "."));
    const spec = entrySpec("mood");
    const valid = spec ? val >= spec.min && val <= spec.max : val >= 1 && val <= 5;
    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "mood",
        value: Math.round(val * 10) / 10,
        unit: "/5",
        targetDay,
        displayText: `Logged mood self-rating: ${val.toFixed(1)}/5${dayLabel}`,
        speechResponse: `Mood score ${val.toFixed(1)} logged${dayLabel}.`,
        confidence: 0.95,
        rawText: raw,
      };
    }
  }

  // 8. Workout / ARED log (e.g. "I exercised for 45 minutes", "workout 30 mins")
  const workoutTerm = "(?:ared|exercis(?:e|ed|ing)|workout|training|weights|strength training|resistance training)";
  const aredMatch =
    clean.match(new RegExp(`${workoutTerm}\\D{0,35}?(\\d{1,3})\\s*(?:minutes?|mins?)?\\b`, "i")) ??
    clean.match(new RegExp(`\\b(\\d{1,3})\\s*(?:minutes?|mins?)\\s*(?:of\\s*)?${workoutTerm}\\b`, "i"));

  if (aredMatch && aredMatch[1]) {
    const val = parseInt(aredMatch[1], 10);
    const spec = entrySpec("aredMinutes");
    const valid = spec ? val >= spec.min && val <= spec.max : val >= 0 && val <= 180;
    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "aredMinutes",
        value: val,
        unit: "min",
        targetDay,
        displayText: `Workout logged: ${val} minutes${dayLabel}`,
        speechResponse: `Workout log saved. ${val} minutes of exercise${dayLabel}.`,
        confidence: 0.95,
        rawText: raw,
      };
    }
  }

  // 9. Hydration (e.g. "hydration 2.5 liters", "fluid intake 2 liters", "water 3 liters")
  const hydMatch =
    clean.match(/(?:hydration|fluid\s*intake|water|fluids)\D{0,15}?(\d{1,2}(?:[.,]\d)?)\s*(?:liters?|litres?|l)\b/i);

  if (hydMatch && hydMatch[1]) {
    const val = parseFloat(hydMatch[1].replace(",", "."));
    const spec = entrySpec("hydration");
    const valid = spec ? val >= spec.min && val <= spec.max : val >= 0.5 && val <= 5;
    const dayLabel = targetDay !== currentDay ? ` for Day ${targetDay}` : "";

    if (valid) {
      return {
        intent: "log_measurement",
        metricId: "hydration",
        value: Math.round(val * 10) / 10,
        unit: "L",
        targetDay,
        displayText: `Logged fluid intake: ${val.toFixed(1)} L${dayLabel}`,
        speechResponse: `Hydration ${val.toFixed(1)} liters logged${dayLabel}.`,
        confidence: 0.95,
        rawText: raw,
      };
    }
  }

  // 10. Status / Health query
  if (/\b(how am i|what'?s my status|system status|health status|report vitals|status report)\b/i.test(clean)) {
    return {
      intent: "status_query",
      displayText: `Status check for Day ${currentDay}`,
      speechResponse: `All systems nominal for day ${currentDay}, Commander. Standing by for telemetry.`,
      confidence: 0.92,
      rawText: raw,
    };
  }

  // 11. Earth view
  if (/\b(show|open|view)\s+(earth|planet|home|blue marble)\b/i.test(clean)) {
    return {
      intent: "earth_view",
      displayText: "Opening Earth View",
      speechResponse: "Earth imagery loaded, Commander.",
      confidence: 0.92,
      rawText: raw,
    };
  }

  // 12. Breathing exercise
  if (/\b(breathe|breathing|relax|slow down|paced breathing)\b/i.test(clean)) {
    return {
      intent: "breathe",
      displayText: "Initiating paced breathing",
      speechResponse: "Paced breathing initiated. Follow the ring.",
      confidence: 0.92,
      rawText: raw,
    };
  }

  // 13. Game
  if (/\b(play|game|orbit catch)\b/i.test(clean)) {
    return {
      intent: "game",
      displayText: "Starting Orbit Catch game",
      speechResponse: "Orbit Catch ready.",
      confidence: 0.92,
      rawText: raw,
    };
  }

  // 14. Contact medical officer
  if (/\b(contact|call|message|alert)\s+(medical officer|flight surgeon|doctor|ground)\b/i.test(clean)) {
    return {
      intent: "medical_officer",
      displayText: "Opening Medical Officer Dispatch",
      speechResponse: "Preparing medical officer consultation packet.",
      confidence: 0.92,
      rawText: raw,
    };
  }

  // 15. Greetings
  if (/\b(hello|hi|hey|good morning|good evening|greetings)\b/i.test(clean)) {
    return {
      intent: "greeting",
      displayText: "Greeting Tuesday",
      speechResponse: "At your service, Commander. State your vitals or query.",
      confidence: 0.92,
      rawText: raw,
    };
  }

  // 16. Help / Capabilities
  if (/\b(help|what can you do|commands|instructions)\b/i.test(clean)) {
    return {
      intent: "help",
      displayText: "Voice commands help",
      speechResponse: "You can speak: BPM 100, Blood pressure 120 over 80, Temp 37.1, or Sleep 7 hours.",
      confidence: 0.88,
      rawText: raw,
    };
  }

  return {
    intent: "unknown",
    displayText: `Recognised: "${raw}"`,
    speechResponse: "Command received. State your BPM, blood pressure, or say 'status'.",
    confidence: 0.4,
    rawText: raw,
  };
}
