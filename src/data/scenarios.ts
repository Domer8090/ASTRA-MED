import type { ScenarioDefinition, ScenarioId } from "../types/health";

/** Events shared by every scenario: small, controlled anomalies in the base mission. */
const BASE_EVENTS: ScenarioDefinition["events"] = [
  {
    id: "base-short-sleep",
    title: "Two short sleep periods",
    startDay: 27,
    endDay: 28,
    kind: "health",
    description: "Synthetic schedule shift: sleep below the configured target on two consecutive nights.",
  },
  {
    id: "base-ared-maintenance",
    title: "ARED maintenance day",
    startDay: 51,
    endDay: 51,
    kind: "operations",
    description: "Synthetic equipment maintenance shortened the resistive exercise session.",
  },
  {
    id: "base-glucose-post-meal",
    title: "Post-meal glucose reading",
    startDay: 63,
    endDay: 63,
    kind: "health",
    description: "A single synthetic glucose reading taken after a meal, above the configured range.",
  },
];

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  nominal: {
    id: "nominal",
    code: "A",
    name: "Nominal mission",
    summary:
      "Stable synthetic readings, good countermeasure adherence and quiet demo space weather. Opens on mission day 42.",
    focusDay: 42,
    events: BASE_EVENTS,
  },
  cardiovascular: {
    id: "cardiovascular",
    code: "B",
    name: "Cardiovascular caution",
    summary:
      "Resting heart rate and blood pressure drift upward from day 96 and cross the configured caution limits. Opens on mission day 118.",
    focusDay: 118,
    events: [
      ...BASE_EVENTS,
      {
        id: "cv-drift",
        title: "Cardiovascular drift",
        startDay: 96,
        endDay: 132,
        kind: "health",
        description:
          "Synthetic gradual rise in resting heart rate and blood pressure, peaking around days 110–126 and easing afterwards.",
      },
    ],
  },
  sep: {
    id: "sep",
    code: "C",
    name: "Solar particle event",
    summary:
      "A simulated solar energetic particle event on days 131–133 raises the synthetic dosimeter's daily dose and interrupts sleep. Opens on mission day 131.",
    focusDay: 131,
    events: [
      ...BASE_EVENTS,
      {
        id: "sep-event",
        title: "Simulated SEP event",
        startDay: 131,
        endDay: 133,
        kind: "environment",
        description:
          "Scenario simulation of a solar energetic particle event. Not a DONKI record. The dosimeter values for these days are synthetic.",
      },
    ],
  },
};

export const SCENARIO_ORDER: readonly ScenarioId[] = ["nominal", "cardiovascular", "sep"] as const;

export function isScenarioId(value: unknown): value is ScenarioId {
  return value === "nominal" || value === "cardiovascular" || value === "sep";
}
