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
  | "history_query"
  | "how_to_measure"
  | "symptom_report"
  | "reading_query"
  | "tasks_query"
  | "task_done"
  | "weather_query"
  | "comms_query"
  | "time_query"
  | "readiness_query"
  | "urgent"
  | "undo"
  | "stop"
  | "repeat"
  | "thanks"
  | "unknown";

export interface ParsedVoiceResult {
  intent: VoiceIntent;
  metricId?: MetricId;
  value?: MeasurementValue;
  unit?: string;
  targetDay?: number;
  /** history_query: how many days back to summarise. */
  days?: number;
  displayText: string;
  speechResponse: string;
  confidence: number;
  rawText: string;
  warning?: string;
}

/**
 * Parses spoken text into an actionable medical command or Tuesday response.
 */
export function parseVoiceCommand(raw: string, currentDay: number, lastMetric?: MetricId): ParsedVoiceResult {
  const text = normaliseSpeech(raw);

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

  const ask = (intent: VoiceIntent, displayText: string, extra: Partial<ParsedVoiceResult> = {}): ParsedVoiceResult => ({
    intent,
    displayText,
    speechResponse: "",
    confidence: 0.9,
    rawText: raw,
    ...extra,
  });

  // Emergencies and crisis words always go to Tuesday's fixed safety replies first.
  if (URGENT_WORDS.test(clean)) return ask("urgent", "Urgent symptom: safety reply");

  // Control words.
  if (/^(?:please\s+)?(?:stop|quiet|be quiet|shut up|silence|never ?mind|cancel|enough|that'?s enough)[.!]?$/i.test(clean)) return ask("stop", "Stopped speaking");
  if (/\b(repeat that|say (?:that|it) again|what did you (?:just )?say|come again|pardon|didn'?t (?:catch|hear) (?:that|you))\b/i.test(clean)) return ask("repeat", "Repeat last reply");
  if (/\b(undo|scratch that|delete (?:that|the last|my last)|remove (?:that|the last|my last)|that was (?:wrong|a mistake)|wrong (?:reading|number))\b/i.test(clean)) return ask("undo", "Undo last reading");

  // History question ("what has my heart rate been over the last 14 days?") is answered
  // from the record, never logged. Checked before any logging rule.
  const historyMetric = metricNamed(clean);
  const historyDays = clean.match(/\b(?:last|past|previous)\s+(\d{1,3})\s+days?\b/i);
  const asksHistory =
    historyMetric &&
    (historyDays ||
      /\b(last|past|previous)\s+(week|fortnight|month)\b/i.test(clean) ||
      /\b(history|trend|average|been)\b/i.test(clean)) &&
    /\b(what|how|show|tell|has|have|was|were|give)\b/i.test(clean);
  if (asksHistory && historyMetric) {
    const days = historyDays?.[1] ? Math.min(180, Math.max(1, parseInt(historyDays[1], 10))) : /month/.test(clean) ? 30 : /fortnight/.test(clean) ? 14 : 7;
    return {
      intent: "history_query",
      metricId: historyMetric,
      days,
      displayText: `History: ${METRIC_WORD[historyMetric] ?? historyMetric}, last ${days} days`,
      speechResponse: "",
      confidence: 0.9,
      rawText: raw,
    };
  }

  if (/\b(contact|call|message|alert|talk to|speak to|get)\s+(?:the\s+|my\s+)?(medical officer|flight surgeon|surgeon|doctor)\b/i.test(clean)) {
    return { intent: "medical_officer", displayText: "Contact the medical officer", speechResponse: "Opening the message to the medical officer.", confidence: 0.95, rawText: raw };
  }

  // Space weather, comms, time and score questions.
  if (/\b(space weather|solar (?:storm|flare|wind|activity|event)|flares?|cme|radiation (?:storm|alert|warning|risk|event)|is it safe|shelter|proton|geomagnetic)\b/i.test(clean)) return ask("weather_query", "Space weather");
  if (/\b(communication|comms|signal|ground link|mission control|houston|talk to (?:the )?(?:ground|earth|doctor|surgeon)|delay|link (?:up|down)|contact with earth)\b/i.test(clean) && !/\b(contact|call|message)\s+(?:the\s+)?medical officer\b/i.test(clean)) return ask("comms_query", "Ground link and delay");
  if (/\b(what day|which day|mission day|what time|ship time|days (?:are )?(?:left|remaining|to go)|how many days|how long (?:have we|until|is left))\b/i.test(clean)) return ask("time_query", "Mission day and time");
  if (/\b(readiness|plan score|my score|streak|xp|points)\b/i.test(clean)) return ask("readiness_query", "Plan score");
  if (/\b(tasks?|checklist|to-?do|what(?:'s| is) next|what should i do(?: today| now| next)?|what do i (?:need|have) to do|left to do|remaining today)\b/i.test(clean) && !metricNamed(clean) && !/\b(headache|dizzy|sick|pain|unwell|nause\w*|hurt)/i.test(clean)) return ask("tasks_query", "Today's tasks");

  // "How can I measure it?" -> the steps for the named reading, or the one we were just talking about.
  if (/\bhow\s+(?:can|do|should|would|to)\s+(?:i\s+)?(?:measure|check|take|record|test)\b/i.test(clean)) {
    const metricId = metricNamed(clean) ?? lastMetric;
    return {
      intent: "how_to_measure",
      ...(metricId ? { metricId } : {}),
      displayText: metricId ? `How to measure: ${METRIC_WORD[metricId] ?? metricId}` : "How to measure (which reading?)",
      speechResponse: metricId ? "" : "Which reading? For example, say: how do I measure my temperature.",
      confidence: 0.9,
      rawText: raw,
    };
  }

  // A question about one reading, with no number in it: "is my heart rate normal?", "what's my blood pressure?"
  const readingMetric = metricNamed(clean);
  if (
    readingMetric &&
    !/\d/.test(clean) &&
    (/\?$/.test(raw.trim()) ||
      /^(?:is|are|was|what|what'?s|how|how'?s|why|tell me|give me|check|should|can you (?:tell|check|give))\b/i.test(clean) ||
      /\b(normal|okay|ok|fine|good|bad|high|low|safe|worried|worry|concern(?:ed|ing)?|too)\b/i.test(clean))
  ) {
    return ask("reading_query", `Question: ${METRIC_WORD[readingMetric] ?? readingMetric}`, { metricId: readingMetric });
  }

  // Symptoms ("I have a headache") are logged as a symptom check, not left unanswered.
  const symptoms = {
    headache: /\b(headache|head\s+(?:hurts|aches|pain))\b/i.test(clean),
    blurredVision: /\b(blurr?(?:ed|y)?\s+vision|vision\s+is\s+blurr?(?:ed|y)|can'?t\s+see\s+(?:clearly|well))\b/i.test(clean),
    eyePressure: /\b(eye\s+pressure|pressure\s+(?:in|behind)\s+(?:my\s+)?eyes?)\b/i.test(clean),
    otherSymptom: /\b(dizzy|dizziness|nause\w*|sick|unwell|not\s+feeling\s+well|vomit\w*)\b/i.test(clean),
  };
  if ((symptoms.headache || symptoms.blurredVision || symptoms.eyePressure || symptoms.otherSymptom) && !/\d/.test(clean)) {
    const named = [symptoms.headache && "a headache", symptoms.blurredVision && "blurred vision", symptoms.eyePressure && "eye pressure", symptoms.otherSymptom && "feeling unwell"].filter(Boolean).join(" and ");
    return {
      intent: "symptom_report",
      metricId: "symptoms",
      value: symptoms,
      targetDay,
      displayText: `Logged symptoms: ${named}`,
      speechResponse: `I've logged ${named} for today. If you can, take your temperature and heart rate and tell me the numbers. If it came on suddenly or is severe, or you notice vision changes or confusion, contact the medical officer by the urgent channel.`,
      confidence: 0.9,
      rawText: raw,
    };
  }

  // A correction with no reading named ("no, change it to 110") applies to the last reading logged.
  // Also "okay, can you put it as 36.9", "log 72", "make that 110".
  const correction =
    clean.match(/^(?:no[,.!]?\s*)?(?:(?:please\s+)?(?:change|make|set|correct|update|fix)\s+(?:it|that)\s+(?:to\s+)?|it'?s\s+|it\s+was\s+|i\s+said\s+)(\d+(?:\.\d+)?(?:\s*(?:over|\/)\s*\d+)?)\b/i) ??
    clean.match(/^(?:(?:no|okay|ok|yes|yeah|actually|sorry|wait)[,.!]?\s*)*(?:(?:can|could|would)\s+you\s+|please\s+)*(?:put|log|record|enter|save|use|measure|set|make|change|correct|update|fix)\b[^\d]{0,24}?(\d+(?:\.\d+)?(?:\s*(?:over|\/)\s*\d+)?)\b/i);
  const lastWord = lastMetric ? METRIC_WORD[lastMetric] : undefined;
  if (correction?.[1] && lastWord && !metricNamed(clean)) {
    return { ...parseVoiceCommand(`${lastWord} ${correction[1]}`, currentDay), rawText: raw };
  }

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
    clean.match(/(?:temperature|temp|fever)\D{0,40}?(\d{2,3}(?:[.,]\d)?)\s*(?:degrees|c|celsius|f|fahrenheit)?\b/i) ??
    clean.match(/\b(\d{2}(?:[.,]\d)?)\s*(?:degrees\s*c|celsius|°c)\b/i) ??
    // Number first: "put 36.9 as my body temperature".
    clean.match(/\b(\d{2,3}(?:[.,]\d)?)\b[^\d]{0,40}?\b(?:temperature|temp)\b/i);

  if (tempMatch && tempMatch[1]) {
    const said = parseFloat(tempMatch[1].replace(",", "."));
    // A body temperature between 93 and 108 is Fahrenheit; store Celsius.
    const val = said >= 93 && said <= 108 ? Math.round((((said - 32) * 5) / 9) * 10) / 10 : said;
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
        speechResponse: `Core temperature ${val.toFixed(1)} Celsius logged${dayLabel}.`,
        confidence: 0.95,
        rawText: raw,
      };
    }
    return {
      intent: "log_measurement",
      metricId: "bodyTemperature",
      targetDay,
      displayText: `Temperature ${said} is outside what a thermometer accepts (${spec?.min ?? 34}–${spec?.max ?? 42} °C). Not logged.`,
      speechResponse: `${said} degrees can't be a body temperature, so I didn't log it. Please measure again with the thermometer and tell me the number, for example 36.8.`,
      confidence: 0.8,
      rawText: raw,
      warning: "Value outside the device range.",
    };
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
  if (/\b(how am i|what'?s my status|system status|health status|report vitals|status report|critical|caution|what'?s wrong|anything wrong|problems?|concerns?|issues?|warnings?|alerts?)\b/i.test(clean)) {
    return {
      intent: "status_query",
      displayText: `Status check for Day ${currentDay}`,
      // Answered by Tuesday from the engines' status summary, never a fixed phrase.
      speechResponse: "",
      confidence: 0.92,
      rawText: raw,
    };
  }

  // 11. Earth view
  if (/\b(show|open|view|see)\s+(?:me\s+)?(?:the\s+)?(earth|planet|home|blue marble|map|globe)\b/i.test(clean) || /\bearth view\b/i.test(clean)) {
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
  if (/\b(contact|call|message|alert|talk to|speak to|get)\s+(?:the\s+|my\s+)?(medical officer|flight surgeon|surgeon|doctor)\b/i.test(clean)) {
    return {
      intent: "medical_officer",
      displayText: "Opening Medical Officer Dispatch",
      speechResponse: "Preparing medical officer consultation packet.",
      confidence: 0.92,
      rawText: raw,
    };
  }

  // "I finished my workout", "mark hydration done"
  if (/\b(done|finished|completed|complete|did|mark)\b/i.test(clean) && !/\d/.test(clean)) {
    return ask("task_done", "Mark a task done");
  }

  if (/\b(thanks|thank you|cheers|appreciate it)\b/i.test(clean) && clean.split(/\s+/).length <= 6) return ask("thanks", "Thanks");

  // 15. Greetings, including the wake word on its own ("Hey Tuesday")
  if (clean.replace(/[^\w\s']/g, "").trim() === "" || /\b(hello|hi|hey|good morning|good evening|greetings|what'?s up|how are you)\b/i.test(clean)) {
    return {
      intent: "greeting",
      displayText: "Greeting Tuesday",
      speechResponse: "I'm here. Tell me a reading, like heart rate 64, or ask me how you're doing.",
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

/* ---------------------------------------------------------------- Speech clean-up */

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** "one hundred and ten" -> "110", "nine and a half" -> "9.5", "seven point five" -> "7.5". */
export function wordsToDigits(text: string): string {
  const word = "(?:" + [...Object.keys(UNITS), ...Object.keys(TENS), "hundred", "a"].join("|") + ")";
  const run = new RegExp(`\\b${word}(?:[\\s-]+(?:and\\s+)?${word})*\\b`, "gi");
  let out = text.replace(/\s+and\s+a\s+half\b/gi, " point five").replace(run, (m) => {
    const parts = m.toLowerCase().split(/[\s-]+/).filter((w) => w !== "and");
    if (parts.length === 1 && parts[0] === "a") return m;
    let total = 0;
    let current = 0;
    let any = false;
    for (const p of parts) {
      if (p === "a") {
        current = current || 1;
        continue;
      }
      if (p in UNITS) {
        current += UNITS[p]!;
        any = true;
      } else if (p in TENS) {
        current += TENS[p]!;
        any = true;
      } else if (p === "hundred") {
        current = (current || 1) * 100;
        any = true;
      }
    }
    total += current;
    return any ? String(total) : m;
  });
  out = out.replace(/\b(\d+)\s+point\s+(\d+)\b/gi, "$1.$2");
  out = out.replace(/\b(\d+)\s+and\s+a\s+half\b/gi, (_m, n: string) => `${n}.5`);
  return out;
}

/**
 * Lower-case, spoken numbers as digits, and corrections reduced to the new value:
 * "change my BPM from 130 to 110" -> "change my bpm 110".
 */
export function normaliseSpeech(raw: string): string {
  return wordsToDigits(raw.trim().toLowerCase())
    .replace(/\bfrom\s+(\d+(?:\.\d+)?(?:\s*(?:over|\/)\s*\d+)?)\s+(?:to|into)\s+(\d+(?:\.\d+)?(?:\s*(?:over|\/)\s*\d+)?)/g, "$2")
    .replace(/\s+/g, " ");
}

/** Word the parser recognises for each indicator, used to rebuild a correction. */
const METRIC_WORD: Partial<Record<MetricId, string>> & Record<"heartRate", string> = {
  heartRate: "heart rate",
  bloodPressure: "blood pressure",
  bloodGlucose: "glucose",
  bodyTemperature: "temperature",
  sleep: "slept",
  mood: "mood",
  aredMinutes: "workout",
  radiation: "dose",
  hydration: "drank",
};

/** The indicator a sentence talks about, if any. */
export function metricNamed(text: string): MetricId | undefined {
  const pairs: [MetricId, RegExp][] = [
    ["bloodPressure", /\b(blood\s*pressure|bp)\b/i],
    ["heartRate", /\b(bpm|heart\s*rate|pulse)\b/i],
    ["bloodGlucose", /\b(glucose|blood\s*sugar|sugar)\b/i],
    ["bodyTemperature", /\b(temperature|temp|fever)\b/i],
    ["sleep", /\b(sleep|slept)\b/i],
    ["mood", /\bmood\b/i],
    ["aredMinutes", /\b(ared|exercise|workout|training)\b/i],
    ["radiation", /\b(radiation|dose|dosimeter)\b/i],
    ["hydration", /\b(hydration|water|fluid)\b/i],
  ];
  return pairs.find(([, re]) => re.test(text))?.[0];
}

/** Emergency and crisis words. These always get Tuesday's fixed safety reply. */
const URGENT_WORDS =
  /\b(chest (?:pain|pressure|tight\w*)|can'?t breathe|cannot breathe|short(?:ness)? of breath|struggling to breathe|faint(?:ed|ing)?|pass(?:ed|ing) out|black(?:ed)? out|severe headache|worst headache|vision (?:loss|went|is going)|lost (?:my )?vision|numb(?:ness)?|slurred|seizure|bleeding (?:a lot|heavily|won'?t stop)|heart (?:is )?(?:racing|pounding)|palpitations?|kill myself|suicid\w*|self[- ]?harm|hurt myself|end it all|want to die)\b/i;
