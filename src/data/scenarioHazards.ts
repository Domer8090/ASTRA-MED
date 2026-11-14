/**
 * Scenario C: simulated solar particle event (SEP).
 *
 * Everything here is SIMULATION, not observation. It drives:
 *  1. the environmental hazard assessment (level and phase per mission day), and
 *  2. a documented synthetic dosimeter overlay, used ONLY in scenario C.
 *
 * Dosimeter overlay model (explicit, illustrative):
 *  - Total event dose inside the vehicle with shelter in use: 10.1 mSv,
 *    split 63% / 28% / 9% across days 131 / 132 / 133 (onset-peak, decline, tail).
 *  - Added to the synthetic baseline dose for those days. Not derived from DONKI,
 *    from any flare class, or from a radiation transport model.
 *  - The size was chosen so the day-131 dose clearly exceeds the configured
 *    "unusual daily increase" rule (> 2x the trailing 14-day median), to
 *    demonstrate the pipeline. Real SEP doses vary by orders of magnitude with
 *    event spectrum, shielding and location in the vehicle.
 *  - Sleep on days 131-132 is set to 5.2 h and 5.6 h to represent shelter time.
 */
import type { BodySystemId, MetricId } from "../types/health";

export type HazardLevel = "WATCH" | "WARNING" | "ALL CLEAR";

export interface HazardPhase {
  level: HazardLevel;
  phase: string;
  description: string;
}

export const SEP_SCENARIO = {
  id: "sep-sim",
  title: "Simulated solar particle event",
  eventDays: [131, 133] as [number, number],
  phases: {
    130: { level: "WATCH", phase: "Precursor", description: "Simulated large solar flare reported by the mission's space-weather support. Energetic particles may arrive within hours." },
    131: { level: "WARNING", phase: "Onset and peak", description: "Simulated particle flux rises sharply and peaks. Shelter procedure in effect." },
    132: { level: "WARNING", phase: "Elevated, declining", description: "Simulated flux remains elevated but is falling. Shelter use continues as directed." },
    133: { level: "WATCH", phase: "Tail", description: "Simulated flux approaches background. Shelter may be released when the procedure allows." },
    134: { level: "ALL CLEAR", phase: "Post-event review", description: "Simulated event over. Record readings and actions for the flight surgeon." },
  } as Record<number, HazardPhase>,
  dosimeterOverlayMsv: { 131: 6.4, 132: 2.8, 133: 0.9 } as Record<number, number>,
  sleepOverrideHours: { 131: 5.2, 132: 5.6 } as Record<number, number>,
} as const;

export const SEP_DOSE_MODEL_SUMMARY =
  "Scenario C adds a synthetic SEP dose to the synthetic dosimeter: 6.4, 2.8 and 0.9 mSv on days 131–133 (10.1 mSv total, 63/28/9% profile). This is an illustrative simulation, not a measurement or a transport-model result, and is never derived from DONKI.";

/** How an SEP relates to each physiological system. */
export const SEP_SYSTEM_RELATIONS: { id: BodySystemId; relation: "Direct" | "Indirect" | "Operational"; text: string; indicators: MetricId[] }[] = [
  {
    id: "immuneRadiation",
    relation: "Direct",
    text: "Added radiation exposure risk. Only the dosimeter measures personal dose; the hazard level is not a dose.",
    indicators: ["radiation"],
  },
  {
    id: "neuroOcular",
    relation: "Indirect",
    text: "Alarms and time in shelter cut sleep, which can slow reaction time and attention.",
    indicators: ["sleep", "pvt"],
  },
  {
    id: "metabolicCircadian",
    relation: "Indirect",
    text: "Meals, fluids and the light-dark schedule shift while sheltering.",
    indicators: ["hydration", "sleep", "mood"],
  },
  {
    id: "musculoskeletal",
    relation: "Operational",
    text: "Exercise sessions may be deferred while sheltering. Log them; do not make them up later.",
    indicators: ["aredMinutes"],
  },
];

export const SHELTER_REFERENCE = {
  label: "NASA: Scientists and Engineers Evaluate Orion Radiation Protection Plan",
  url: "https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/",
} as const;

export const ARTEMIS_SPACE_WEATHER_REFERENCE = {
  label: "NASA Science: To Protect Artemis II Astronauts, NASA Experts Keep Eyes on Sun",
  url: "https://science.nasa.gov/missions/artemis/artemis-2/to-protect-artemis-ii-astronauts-nasa-experts-keep-eyes-on-sun/",
} as const;
