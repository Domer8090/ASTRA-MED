import type { ScenarioId } from "../types/health";

/**
 * Pitch mode steps (see components/PitchMode.tsx), told as the story of Joe
 * Davidson, an astronaut on the way to Mars. Each step sets the scenario, day
 * and view, then frames one element: `target` matches data-pitch, data-tour or
 * an id. Edit the wording here; the presenter speaks over it.
 */
export interface PitchStep {
  scenario: ScenarioId;
  day: number;
  view: "summary" | "details" | "weather" | "tuesday" | "recharge";
  /** One element, or several framed together. */
  target?: string | readonly string[];
  title: string;
  body: string;
  /** false keeps the screen undimmed (used for Recharge). */
  dim?: boolean;
  /** Docks the caption bottom-left or bottom-right instead of under the target. */
  dock?: "left" | "right";
  /** true shows the app untouched: no dimming, no frame, no caption. */
  bare?: boolean;
  /** Pictures shown side by side over the dimmed app (files in public/). */
  images?: readonly { src: string; label: string }[];
}

export const PITCH_STEPS: readonly PitchStep[] = [
  {
    scenario: "nominal",
    day: 42,
    view: "summary",
    title: "Astra-Med",
    body: "The whole console, before the walkthrough starts.",
    bare: true,
  },
  {
    scenario: "nominal",
    day: 42,
    view: "summary",
    target: "summary-status",
    title: "Day 42: Joe Davidson checks in",
    body: "Joe is an astronaut on the way to Mars. One word tells Joe how today looks: NOMINAL.",
  },
  {
    scenario: "nominal",
    day: 42,
    view: "summary",
    target: "summary-next",
    title: "One thing for Joe to do",
    body: "Even on a good day: Joe skipped yesterday's radiation review, so check the dosimeter.",
  },
  {
    scenario: "cardiovascular",
    day: 104,
    view: "summary",
    target: ["summary-status", "trend"],
    dock: "right",
    title: "Day 104: Joe feels fine",
    body: "Every reading is in range, so an alarm stays silent. But Joe's heart rate is rising about 2.3 bpm a day: caution limit in about 7 days.",
  },
  {
    scenario: "cardiovascular",
    day: 112,
    view: "summary",
    target: "summary-status",
    title: "Day 112: CAUTION, as predicted",
    body: "Joe's heart rate crosses the limit, 8 days after trend watch warned.",
  },
  {
    scenario: "cardiovascular",
    day: 112,
    view: "summary",
    title: "Joe's console, on any screen",
    body: "The same Astra-Med runs on iPad and on Windows and Linux laptops. It works offline, with no account.",
    images: [
      { src: "pitch/ipad.jpg", label: "iPadOS" },
      { src: "pitch/desktop.jpg", label: "Windows and Linux" },
    ],
  },
  {
    scenario: "sep",
    day: 131,
    view: "summary",
    target: "summary-next",
    title: "Day 131: a solar storm hits",
    body: "A simulated solar particle event. Joe's first step: move to the shelter.",
  },
  {
    scenario: "nominal",
    day: 42,
    view: "tuesday",
    target: "tuesday-mode",
    title: "Joe's hands are full",
    body: "So Joe just says “Record heart rate 120”, or asks Tuesday “How am I doing?”",
  },
  {
    scenario: "nominal",
    day: 42,
    view: "recharge",
    title: "Joe misses home",
    body: "Recharge shows Earth from NASA imagery. Joe turns on hand control and spins the planet.",
    dim: false,
    dock: "left",
  },
];
