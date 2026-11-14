/**
 * Spotlight tour shown after the first Overview. Each step points at an
 * element marked with `data-tour="<target>"`. Steps whose target is hidden at
 * the current screen size are skipped.
 */
export interface TourStep {
  target: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: "status",
    title: "Start here every day",
    body: "Overall health, the body system to watch and the one next action. If you read nothing else, read this band.",
  },
  {
    target: "body",
    title: "Five body systems",
    body: "Each system shows its status with a colour, an icon and a word. Select one to see what changed and what to do.",
  },
  {
    target: "vitals",
    title: "Today's readings",
    body: "Each reading is compared with its configured range. Select a reading to open its trend. Use Log to add your own measurement.",
  },
  {
    target: "intel",
    title: "What changed, what to do",
    body: "Plain-language explanation, the recommended next step and a short self-check for the selected system.",
  },
  {
    target: "track",
    title: "Replay the mission",
    body: "Drag through 180 mission days. Orange and red ticks mark alerts. Demo start returns to the scenario's key day.",
  },
  {
    target: "scenario",
    title: "Three demo scenarios",
    body: "A is a normal mission, B a cardiovascular caution, C a simulated solar particle event. Switching keeps anything you logged.",
  },
  {
    target: "countermeasures",
    title: "Daily countermeasures",
    body: "Tick tasks as you finish them. Completion feeds the readiness score but never changes a health status.",
  },
  {
    target: "weather",
    title: "Space weather from NASA",
    body: "Live NASA DONKI records and model forecasts of solar storms reaching Earth and Mars. Environmental hazard, never a personal dose.",
  },
] as const;
