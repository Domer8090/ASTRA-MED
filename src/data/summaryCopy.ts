/**
 * Plain-language copy for the Summary dashboard. Kept out of components
 * (CLAUDE.md rule 4). These lines restate engine output; they never decide a status.
 */
import type { HealthStatus } from "../types/health";

export const SUMMARY_HEADLINE: Record<HealthStatus, { title: string; body: string }> = {
  NOMINAL: { title: "You're on track today", body: "Every reading is inside the configured demonstration range." },
  CAUTION: { title: "One thing needs a look", body: "A reading is outside the configured demonstration range. Repeat the measurement and follow the step below." },
  CRITICAL: { title: "Something needs attention now", body: "A reading is well outside the configured demonstration range. Follow the step below and contact the medical officer when communication is available." },
};

export const SUMMARY_RINGS = {
  readiness: { label: "Plan score", hint: "Out of 100. How well today's routine is going: tasks, the past week, follow-ups and fresh readings. It is not a medical clearance." },
  checklist: { label: "Tasks done", hint: "Today's health tasks completed." },
  exercise: { label: "Exercise", hint: "Today's strength exercise minutes against the mission-plan target." },
} as const;

export const SUMMARY_COPY = {
  welcomeTitle: "New here?",
  welcomeBody: "This is a demo health console for astronauts far from Earth. All health numbers are synthetic demonstration data.",
  readingsTitle: "Your readings",
  needsLook: "Needs a look",
  allNormal: "In range",
  tasksTitle: "Today's tasks",
  weatherTitle: "Space weather",
  weatherNote: "Environmental hazard only, not your personal dose.",
  weatherNone: "No space-weather advisory today.",
  topTitle: "Top four today",
  topHint: "The most important things right now, most urgent first.",
  allClearTitle: "All readings in range",
  allClearBody: "Every reading is inside its configured demonstration range today.",
  trendTag: "Trend watch",
  trendDays: "days to the caution limit at this rate",
  driftTag: "Pattern change",
  driftTitle: "Different from your usual",
  tasksLeftTitle: "Tasks left today",
  tasksNext: "Next",
  weatherWhen: "When",
  weatherClearLong: "No solar storm or radiation warning for this mission day. Nothing to do.",
  readingDate: "Measured",
  details: "Show all details",
  detailsHint: "Body map, trends, alerts, hazards, devices and the full space-weather feed.",
} as const;
