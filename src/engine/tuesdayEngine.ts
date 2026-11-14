/**
 * Tuesday, the crew companion: intent detection, the on-device health brief
 * sent to a local model, the safety filter applied to every model answer, and
 * the offline replies used when no model is running. Pure functions.
 *
 * Tuesday follows the same medical language rules as the rest of ASTRA-MED:
 * no diagnosis, no medication, no change to exercise or treatment.
 */
import { BLOOD_GLUCOSE, BLOOD_PRESSURE, BODY_TEMPERATURE, HEART_RATE } from "../config/thresholds";
import { BODY_SYSTEMS } from "../data/bodySystems";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type { BodySystemId, BodySystemState, EnvironmentAdvisory, HealthStatus, MetricDiagnostic, MetricId } from "../types/health";
import type { BaselineDrift } from "./baselineEngine";
import type { RetrievedPassage } from "./retrieval";
import type { TrendWatch } from "./trendEngine";

export type TuesdayIntent =
  | "crisis"
  | "urgent"
  | "symptom"
  | "status"
  | "bored"
  | "tired"
  | "low"
  | "stressed"
  | "sleep"
  | "earth"
  | "game"
  | "breathe"
  | "checkin"
  | "greeting"
  | "thanks"
  | "help"
  | "other";

export type TuesdayAction =
  | { kind: "earth" }
  | { kind: "game" }
  | { kind: "breathe" }
  | { kind: "checkin" }
  | { kind: "guidance"; metricId: MetricId }
  | { kind: "log"; metricId: MetricId }
  | { kind: "contact"; priority: "urgent" | "routine" }
  | { kind: "report" };

const PATTERNS: [TuesdayIntent, RegExp][] = [
  ["crisis", /\b(kill myself|suicid|self[- ]?harm|hurt myself|end it all|want to die|no reason to live)\b/i],
  ["urgent", /\b(chest (pain|pressure|tight)|can'?t breathe|short(ness)? of breath|struggling to breathe|faint(ed|ing)?|pass(ed|ing) out|black(ed)? out|severe headache|worst headache|vision (loss|went|is going)|lost (my )?vision|numb(ness)?|slurred|seizure|bleeding (a lot|heavily|won'?t stop)|heart (is )?(racing|pounding)|palpitation)/i],
  ["checkin", /\b(check[- ]?in|log (my )?mood|rate my mood)\b/i],
  // Health comes before boredom or games: "bored, and my heart rate is up" is a health question.
  ["symptom", /\b(heart ?rate|pulse|bpm|blood pressure|temperature|fever|glucose|blood sugar|dizzy|nause|headache|pain|hurts?|sick|unwell|ill|rash|wound|swelling|eye|vision)\b/i],
  ["earth", /\b(earth|home planet|window|globe|see home|blue marble)\b/i],
  ["game", /\b(game|play|catch|fun)\b/i],
  ["breathe", /\b(breath|breathe|breathing|calm down|relax)\b/i],
  ["bored", /\b(bored|boring|monoton|nothing to do|same every day)\b/i],
  ["tired", /\b(tired|exhausted|fatigue|sleepy|drained|no energy|worn out)\b/i],
  ["low", /\b(sad|lonely|alone|miss (my|home|family)|homesick|down|depress|hopeless|cry)\b/i],
  ["stressed", /\b(stress|anxious|anxiety|panic|overwhelm|worried|nervous|angry)\b/i],
  ["sleep", /\b(sleep|insomnia|nap|rest)\b/i],
  ["status", /\b(how am i|my health|status|doing|vitals|heart|readings?|drift|trend|report)\b/i],
  ["thanks", /\b(thanks|thank you|cheers|appreciate)\b/i],
  ["greeting", /^\s*(hi|hello|hey|morning|good (morning|evening|afternoon)|yo|tuesday)\b/i],
  ["help", /\b(help|what can you do|how do you work)\b/i],
];

export function detectIntent(text: string): TuesdayIntent {
  for (const [intent, re] of PATTERNS) if (re.test(text)) return intent;
  return "other";
}

/** Answer for a crisis message. Always shown, whether or not a model is running. */
export const CRISIS_REPLY =
  "I'm really glad you told me. Please tell a crewmate right now, and contact the medical officer or behavioural-health support by the mission's urgent channel. You don't have to handle this alone. I'll stay here with you; if it helps, we can do one slow breathing round together while you reach out.";

export const URGENT_REPLY =
  "That can be serious, so please don't wait on me. Stop what you're doing and stay still, seated or restrained. Tell a crewmate now, and contact the medical officer by the mission's urgent channel. If you have a mission-approved device, take your heart rate and blood pressure and keep the numbers for the medical officer. Tuesday can't tell what is causing this and gives no treatment.";

// ---------------------------------------------------------------- Reported readings

export interface ReportedVital {
  metricId: MetricId;
  label: string;
  value: string;
  level: "NOMINAL" | "CAUTION" | "CRITICAL";
  /** The configured limit that was crossed, in words. */
  limit: string;
  /** Outside what the logging form accepts: very likely a measurement error, but treated as urgent. */
  outsideDeviceRange: boolean;
}

/**
 * Readings typed into a message ("my heart rate is 250 bpm"). Checked against
 * the same prototype thresholds as logged readings, so Tuesday never leaves a
 * dangerous number to a language model.
 */
export function readingsInText(text: string): ReportedVital[] {
  const out: ReportedVital[] = [];
  const hr = text.match(/(\d{2,3})\s*(?:bpm|beats)/i) ?? text.match(/(?:heart ?rate|pulse|hr)\D{0,24}?(\d{2,3})(?!\s*\/)/i);
  if (hr) {
    const v = Number(hr[1]);
    const level = v > HEART_RATE.criticalAbove ? "CRITICAL" : v > HEART_RATE.cautionAbove || v < HEART_RATE.cautionBelow ? "CAUTION" : "NOMINAL";
    out.push({
      metricId: "heartRate",
      label: "Resting heart rate",
      value: `${v} bpm`,
      level,
      limit: level === "CRITICAL" ? `CRITICAL above ${HEART_RATE.criticalAbove} bpm` : v < HEART_RATE.cautionBelow ? `CAUTION below ${HEART_RATE.cautionBelow} bpm` : `CAUTION above ${HEART_RATE.cautionAbove} bpm`,
      outsideDeviceRange: v > HEART_RATE.entry.max || v < HEART_RATE.entry.min,
    });
  }
  const bp = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bp) {
    const sys = Number(bp[1]);
    const dia = Number(bp[2]);
    const c = BLOOD_PRESSURE;
    const critical = sys > c.criticalAbove.systolic || dia > c.criticalAbove.diastolic || sys < c.criticalBelow.systolic || dia < c.criticalBelow.diastolic;
    const caution = sys > c.cautionAbove.systolic || dia > c.cautionAbove.diastolic || sys < c.cautionBelow.systolic || dia < c.cautionBelow.diastolic;
    out.push({
      metricId: "bloodPressure",
      label: "Blood pressure",
      value: `${sys}/${dia} mmHg`,
      level: critical ? "CRITICAL" : caution ? "CAUTION" : "NOMINAL",
      limit: critical ? `CRITICAL above ${c.criticalAbove.systolic}/${c.criticalAbove.diastolic} or below ${c.criticalBelow.systolic}/${c.criticalBelow.diastolic} mmHg` : `CAUTION above ${c.cautionAbove.systolic}/${c.cautionAbove.diastolic} or below ${c.cautionBelow.systolic}/${c.cautionBelow.diastolic} mmHg`,
      outsideDeviceRange: sys > c.entry.systolic.max || sys < c.entry.systolic.min || dia > c.entry.diastolic.max || dia < c.entry.diastolic.min,
    });
  }
  const temp = text.match(/(\d{2}(?:\.\d)?)\s*°?\s*c\b/i) ?? text.match(/(?:temperature|temp|fever)\D{0,20}?(\d{2}(?:\.\d)?)/i);
  if (temp) {
    const v = Number(temp[1]);
    const t = BODY_TEMPERATURE;
    if (v >= 30 && v <= 45) {
      const level = v >= t.criticalAtOrAbove ? "CRITICAL" : v >= t.cautionAtOrAbove || v < t.cautionBelow ? "CAUTION" : "NOMINAL";
      out.push({
        metricId: "bodyTemperature",
        label: "Body temperature",
        value: `${v} °C`,
        level,
        limit: level === "CRITICAL" ? `CRITICAL at or above ${t.criticalAtOrAbove} °C` : v < t.cautionBelow ? `CAUTION below ${t.cautionBelow} °C` : `CAUTION at or above ${t.cautionAtOrAbove} °C`,
        outsideDeviceRange: v > t.entry.max || v < t.entry.min,
      });
    }
  }
  const glu = text.match(/(\d{2,3})\s*mg\s*\/?\s*dl/i) ?? text.match(/(?:glucose|blood sugar)\D{0,20}?(\d{2,3})/i);
  if (glu) {
    const v = Number(glu[1]);
    const g = BLOOD_GLUCOSE;
    const level = v >= g.criticalAtOrAbove || v < g.criticalBelow ? "CRITICAL" : v >= g.cautionAtOrAbove || v < g.cautionBelow ? "CAUTION" : "NOMINAL";
    out.push({
      metricId: "bloodGlucose",
      label: "Blood glucose",
      value: `${v} mg/dL`,
      level,
      limit: level === "CRITICAL" ? `CRITICAL at or above ${g.criticalAtOrAbove} or below ${g.criticalBelow} mg/dL` : `CAUTION at or above ${g.cautionAtOrAbove} or below ${g.cautionBelow} mg/dL`,
      outsideDeviceRange: v > g.entry.max || v < g.entry.min,
    });
  }
  return out;
}

/** Fixed reply for typed readings outside their range, or null when all are in range. */
export function reportedVitalsReply(vitals: readonly ReportedVital[]): OfflineReply | null {
  const worst = vitals.find((v) => v.level === "CRITICAL") ?? vitals.find((v) => v.level === "CAUTION");
  if (!worst) return null;
  const actions: TuesdayAction[] = [
    { kind: "contact", priority: worst.level === "CRITICAL" ? "urgent" : "routine" },
    { kind: "log", metricId: worst.metricId },
    { kind: "guidance", metricId: worst.metricId },
  ];
  if (worst.level === "CRITICAL") {
    return {
      text: [
        `${worst.label} of ${worst.value} is CRITICAL in ASTRA-MED's prototype rules (${worst.limit}). That is not a good number; treat it as urgent until a repeat shows otherwise.`,
        "",
        "1. Stop what you're doing and stay still, seated or restrained.",
        `2. Repeat the measurement now with the mission-approved device.${worst.outsideDeviceRange ? " This value is beyond what the logging form accepts, so a loose sensor or movement is possible, but don't assume that." : " Movement or a loose sensor can give a false reading."}`,
        "3. If the repeat is still outside the range, or you feel chest pain, faintness, shortness of breath or a pounding heartbeat, tell a crewmate now and contact the medical officer by the urgent channel.",
        "",
        "Log the repeat so the console and the medical officer see it. Tuesday can't tell what's causing it and gives no treatment.",
      ].join("\n"),
      actions,
    };
  }
  return {
    text: `${worst.label} of ${worst.value} is outside the configured demonstration range (${worst.limit}). Rest for the protocol period, then repeat the measurement the same way and log it. If it stays outside the range, review the mission-approved protocol and contact the medical officer when communication is available. If you also feel unwell, tell a crewmate.`,
    actions,
  };
}

// ---------------------------------------------------------------- Safety filter

const UNSAFE: RegExp[] = [
  /\b(ibuprofen|acetaminophen|paracetamol|aspirin|naproxen|melatonin|modafinil|zolpidem|promethazine|diphenhydramine|antihistamine|antibiotic|steroid|opioid|benzodiazepine|sertraline|ssri)s?\b/i,
  /\b\d+(\.\d+)?\s?(mg|mcg|µg)\b/i,
  /\b(take|start|stop|increase|decrease|double)\s+(a |your |the )?(dose|medication|medicine|pills?|tablets?|drug)/i,
  /\bprescri(be|ption)/i,
  /\byou (have|are suffering from|are showing signs of|probably have|likely have)\s+(an? )?(infection|disease|disorder|syndrome|condition|cancer|depression|anxiety disorder|hypertension|arrhythmia|SANS)\b/i,
  /\b(stop|skip|cancel|reduce|increase|double)\s+(your |the )?(ared|exercise|workout|countermeasure|treatment)/i,
];

export const SAFETY_REPLACEMENT =
  "[Tuesday removed a sentence here: ASTRA-MED does not give diagnoses, medication or changes to exercise or treatment. Review the mission-approved protocol and contact the medical officer when communication is available.]";

/** Remove sentences that break the medical language rules. Keeps the rest of the answer. */
export function safetyFilter(text: string): { text: string; removed: number } {
  const clean = text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
  const sentences = clean.match(/[^.!?\n]+[.!?]*\s*|\n+/g) ?? [clean];
  let removed = 0;
  const out = sentences.map((s) => {
    const diagnosis = /\bdiagnos/i.test(s) && !/\b(not|no|never|cannot|can't|won't)\b[^.!?]{0,24}diagnos/i.test(s);
    if (diagnosis || UNSAFE.some((re) => re.test(s))) {
      removed++;
      return "";
    }
    return s;
  });
  let joined = out.join("").replace(/\n{3,}/g, "\n\n").trim();
  if (removed) joined = `${joined}${joined ? "\n\n" : ""}${SAFETY_REPLACEMENT}`;
  return { text: joined, removed };
}

// ---------------------------------------------------------------- Health brief

export interface TuesdayContext {
  day: number;
  overall: HealthStatus;
  diagnostics: Record<MetricId, MetricDiagnostic>;
  systems: Record<BodySystemId, BodySystemState>;
  advisories: EnvironmentAdvisory[];
  trends: TrendWatch[];
  drift: BaselineDrift;
  primaryAction: string;
  lightMinutes: number;
  /** Recent self-reported energy, 1–5, from Tuesday check-ins. */
  recentEnergy: number | null;
}

function flagged(ctx: TuesdayContext): MetricDiagnostic[] {
  return Object.values(ctx.diagnostics).filter((d) => d.status !== "NOMINAL");
}

/**
 * Compact plain-text summary of today's engine output. This is what a local
 * model sees. It goes only to a model on this device (localhost).
 */
export function buildHealthBrief(ctx: TuesdayContext): string {
  const lines = [`Mission day ${ctx.day}. Overall status: ${ctx.overall} (ASTRA-MED engine, prototype thresholds, synthetic data).`];
  const f = flagged(ctx);
  lines.push(f.length ? `Outside the configured demonstration range: ${f.map((d) => `${METRIC_GUIDANCE[d.metricId].name} ${d.status}: ${d.summary}`).join(" | ")}` : "All indicators inside their configured ranges.");
  const watch = (Object.values(ctx.systems) as BodySystemState[]).filter((s) => s.status !== "NOMINAL").map((s) => `${BODY_SYSTEMS[s.id].name} ${s.status}`);
  if (watch.length) lines.push(`Body systems to watch: ${watch.join(", ")}.`);
  if (ctx.trends.length) lines.push(`Trend watch: ${ctx.trends.map((t) => t.text).join(" ")}`);
  if (ctx.drift.state === "drift") lines.push(`Baseline drift (Isolation Forest): ${ctx.drift.text}`);
  else if (ctx.drift.state === "steady") lines.push("Baseline drift: recent days match the personal baseline.");
  const hazard = ctx.advisories.find((a) => a.level !== "ALL CLEAR");
  if (hazard) lines.push(`Environmental hazard ${hazard.level} (not a personal dose).`);
  lines.push(`Next action from the protocol engine: ${ctx.primaryAction}`);
  if (ctx.recentEnergy !== null) lines.push(`Latest self-reported energy: ${ctx.recentEnergy}/5.`);
  lines.push(`One-way Earth–Mars signal delay today: ${ctx.lightMinutes.toFixed(1)} minutes.`);
  return lines.join("\n");
}

export const TUESDAY_SYSTEM_PROMPT = `You are Tuesday, the on-board companion in ASTRA-MED, a prototype health console for astronauts on a long mission. You are part assistant, part friend: warm, calm, brief, a little playful, never fake-cheerful.

Rules you must follow:
- Use only the HEALTH BRIEF and the numbered PASSAGES below for health facts. Never invent mission events, locations, views or crew names. If they do not cover something, say you do not know and suggest the medical officer.
- Never diagnose. Never name or suggest medication or doses. Never tell the astronaut to stop, skip or change exercise or treatment.
- Use these phrases for health concerns: "outside the configured demonstration range", "repeat the measurement", "review the mission-approved protocol", "contact the medical officer when communication is available".
- Cite passages you use as [1], [2].
- Readings are synthetic demonstration data and thresholds are prototype values, not NASA flight rules.
- Space weather is an environmental hazard, not a personal dose.
- For boredom, tiredness, loneliness or stress: acknowledge the feeling in one sentence, then offer one small concrete thing (Earth view, a game, a breathing round, a check-in, or talking to a crewmate).
- If the astronaut mentions self-harm, tell them to tell a crewmate now and contact the medical officer by the urgent channel.
- Keep answers under 120 words. Plain English. No lists longer than 3 items.`;

export function buildModelMessages(brief: string, passages: readonly RetrievedPassage[], history: readonly { role: "user" | "assistant"; content: string }[], question: string) {
  const context = passages.length
    ? passages.map((p, i) => `[${i + 1}] ${p.doc.title}: ${p.doc.text}`).join("\n")
    : "(no matching passage)";
  return [
    { role: "system" as const, content: `${TUESDAY_SYSTEM_PROMPT}\n\nHEALTH BRIEF\n${brief}\n\nPASSAGES\n${context}` },
    ...history.slice(-8),
    { role: "user" as const, content: question },
  ];
}

// ---------------------------------------------------------------- Offline replies

export interface OfflineReply {
  text: string;
  actions: TuesdayAction[];
}

export function actionsFor(intent: TuesdayIntent, ctx: TuesdayContext): TuesdayAction[] {
  switch (intent) {
    case "urgent":
      return [{ kind: "contact", priority: "urgent" }, { kind: "log", metricId: "heartRate" }];
    case "symptom":
      return [{ kind: "log", metricId: "heartRate" }, { kind: "contact", priority: "routine" }];
    case "crisis":
      return [{ kind: "contact", priority: "urgent" }, { kind: "breathe" }];
    case "stressed":
      return [{ kind: "breathe" }, { kind: "checkin" }];
    case "bored":
      return [{ kind: "earth" }, { kind: "game" }];
    case "tired":
      return [{ kind: "breathe" }, { kind: "guidance", metricId: "sleep" }];
    case "low":
      return [{ kind: "earth" }, { kind: "checkin" }];
    case "sleep":
      return [{ kind: "guidance", metricId: "sleep" }, { kind: "breathe" }];
    case "earth":
      return [{ kind: "earth" }];
    case "game":
      return [{ kind: "game" }];
    case "breathe":
      return [{ kind: "breathe" }];
    case "checkin":
      return [{ kind: "checkin" }];
    case "status": {
      const first = flagged(ctx)[0];
      return first ? [{ kind: "guidance", metricId: first.metricId }, { kind: "report" }] : [{ kind: "report" }];
    }
    default:
      return [{ kind: "checkin" }, { kind: "earth" }];
  }
}

export function statusSummary(ctx: TuesdayContext): string {
  const f = flagged(ctx);
  const parts: string[] = [];
  if (f.length) {
    parts.push(`Today you're ${ctx.overall}. ${f.map((d) => METRIC_GUIDANCE[d.metricId].name).join(", ")} ${f.length === 1 ? "is" : "are"} outside the configured demonstration range.`);
  } else {
    parts.push(`Today you're ${ctx.overall}. Every indicator is inside its configured range.`);
  }
  if (ctx.drift.state === "drift" && ctx.drift.drivers[0]) parts.push(`Your pattern has drifted from your own baseline: ${ctx.drift.drivers[0].text}`);
  if (ctx.trends[0]) parts.push(`Trend watch: ${METRIC_GUIDANCE[ctx.trends[0].metricId].name.toLowerCase()} is ${ctx.trends[0].direction}, about ${ctx.trends[0].daysToLimit} days from its caution limit at this rate.`);
  parts.push(`Next: ${ctx.primaryAction}`);
  return parts.join(" ");
}

export function offlineReply(intent: TuesdayIntent, ctx: TuesdayContext, passages: readonly RetrievedPassage[]): OfflineReply {
  const actions = actionsFor(intent, ctx);
  const tip = passages[0] ? `${passages[0].doc.text} [1]` : "";
  const texts: Record<TuesdayIntent, string> = {
    crisis: CRISIS_REPLY,
    urgent: URGENT_REPLY,
    symptom: "Thanks for telling me. What's the reading, or how do you feel? Take the measurement with the mission-approved device, log it, and I'll check it against your ranges and your own baseline. If you feel chest pain, faintness or shortness of breath, tell a crewmate now and contact the medical officer by the urgent channel.",
    status: statusSummary(ctx),
    bored: "Long stretches of the same routine wear anyone down; monotony is a real stressor up here. Want five minutes over Earth, or a quick round of Orbit Catch?",
    tired: `That sounds draining. ${ctx.diagnostics.sleep.latest && typeof ctx.diagnostics.sleep.latest.value === "number" ? `Your last logged sleep was ${ctx.diagnostics.sleep.latest.value} h. ` : ""}Keep the planned sleep period tonight, and avoid starting safety-critical work while very tired. A slow breathing round might help you reset now.`,
    low: "I hear you. Being this far from home is hard, and the signal delay makes it harder. Want to look at Earth together for a few minutes? If the feeling sticks around, talk to a crewmate or the behavioural-health contact.",
    stressed: "Okay. Let's slow things down for a minute. One breathing round: in for 4, out for 6. Then, if you want, tell me what's on your mind.",
    sleep: tip || "Log your sleep the same way each day and keep the planned sleep period. If short sleep continues, note it for the medical officer.",
    earth: "Opening the Earth view. The globe uses NASA imagery of Earth from yesterday, lit for the real time of day.",
    game: "Orbit Catch is ready: pinch or click the supply pods before they drift away. One minute, no pressure.",
    breathe: "One minute of paced breathing: in for 4 seconds, out for 6. Open your hand to breathe in and close it to breathe out, or just follow the ring.",
    checkin: "Quick check-in: how's your mood and energy right now?",
    greeting: `Hey. ${ctx.overall === "NOMINAL" ? "Your readings look settled today." : `You're ${ctx.overall} today, so let's keep an eye on that.`} How are you feeling?`,
    thanks: "Anytime. I'm here.",
    help: "I can explain your readings, track your mood and energy, spot when your pattern drifts from your own baseline, and help you recharge with an Earth view, a game or a breathing round. With a local model running I can also read a photo or a lab report on this device.",
    other: tip
      ? `Here's what the onboard guidance says: ${tip}`
      : "I don't have guidance on that in my onboard library. If it's about your health, review the mission-approved protocol and contact the medical officer when communication is available.",
  };
  return { text: texts[intent], actions };
}

// ---------------------------------------------------------------- Images and lab reports

export const IMAGE_PROMPT = `You are helping an astronaut take a useful photo record for the flight surgeon. Look at the attached photo and reply in plain English, under 110 words:
1. What is visible (location on the body, size compared with nearby features, colour, edges, any swelling or discharge). Describe only; do not name a condition and do not diagnose.
2. Whether the photo is good enough for a medical officer to review (focus, lighting, scale reference) and how to retake it if not.
3. Always end with: "Show this photo to the medical officer when communication is available. If it is getting worse quickly, use the urgent channel."
Never suggest medication or treatment.`;

export const LAB_PROMPT = `Extract every test result from this lab report. Reply with JSON only, in this shape:
{"results":[{"analyte":"string","value":"string","unit":"string","referenceRange":"string","flag":"high|low|normal|unknown"}]}
Copy values exactly as printed. Use "" when a field is missing and "unknown" when no flag is printed. Do not interpret or diagnose.`;

export interface LabResult {
  analyte: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: "high" | "low" | "normal" | "unknown";
}

const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");

/** Validate model JSON for lab results. Returns null when nothing usable came back. */
export function parseLabResults(raw: string): LabResult[] | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const body: unknown = JSON.parse(raw.slice(start, end + 1));
    const list = body && typeof body === "object" ? (body as { results?: unknown }).results : null;
    if (!Array.isArray(list)) return null;
    const out = list
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
      .map<LabResult>((r) => {
        const flag = str(r.flag).toLowerCase();
        return {
          analyte: str(r.analyte),
          value: str(r.value, 24),
          unit: str(r.unit, 24),
          referenceRange: str(r.referenceRange, 40),
          flag: flag === "high" || flag === "low" || flag === "normal" ? flag : "unknown",
        };
      })
      .filter((r) => r.analyte && r.value)
      .slice(0, 60);
    return out.length ? out : null;
  } catch {
    return null;
  }
}
