/**
 * NASA Human Research Program: the five hazards of human spaceflight, and how
 * ASTRA-MED's body systems and features relate to each. Hazard descriptions
 * paraphrase https://www.nasa.gov/hrp/hazards/ (checked 2026-11-14). The
 * mapping to body systems is ASTRA-MED's own reading, not a NASA table.
 */
import type { BodySystemId } from "../types/health";

export type HazardId = "radiation" | "isolation" | "distance" | "gravity" | "environment";

export interface SpaceflightHazard {
  id: HazardId;
  name: string;
  summary: string;
  systems: readonly BodySystemId[];
  /** What ASTRA-MED watches or does for this hazard. */
  inApp: string;
}

export const HRP_HAZARDS_URL = "https://www.nasa.gov/hrp/hazards/";
export const HRP_RISKS_URL = "https://www.nasa.gov/hrp/risks/";

export const SPACEFLIGHT_HAZARDS: readonly SpaceflightHazard[] = [
  {
    id: "radiation",
    name: "Space radiation",
    summary: "Invisible and considered one of the most hazardous parts of spaceflight, especially beyond Earth's magnetic field.",
    systems: ["immuneRadiation"],
    inApp: "Dosimeter dose, NASA DONKI space weather, solar storm forecasts for Earth and Mars, and a shelter sequence for particle events.",
  },
  {
    id: "isolation",
    name: "Isolation and confinement",
    summary: "Small groups living far from Earth in a small space for a long time show behavioural responses.",
    systems: ["metabolicCircadian", "neuroOcular"],
    inApp: "Daily mood, sleep and a reaction-time check, with trend watch for gradual decline.",
  },
  {
    id: "distance",
    name: "Distance from Earth",
    summary: "Instructions, supplies and medical care become harder to receive as crews travel deeper into space.",
    systems: ["cardiovascular", "musculoskeletal", "neuroOcular", "immuneRadiation", "metabolicCircadian"],
    inApp: "Works fully offline, shows the ship-to-Earth signal delay for the mission day, and gives on-board guidance and a report for the flight surgeon.",
  },
  {
    id: "gravity",
    name: "Gravity fields",
    summary: "Muscles, bones, the inner ear and organs must adjust to weightlessness and to each new gravity field.",
    systems: ["cardiovascular", "musculoskeletal", "neuroOcular"],
    inApp: "Heart rate, blood pressure, vision symptoms and resistive exercise (ARED) with daily countermeasures.",
  },
  {
    id: "environment",
    name: "Hostile and closed environments",
    summary: "Keeping a safe ecosystem on board means controlling temperature, pressure, lighting and noise, watching microbes and tracking immune responses.",
    systems: ["metabolicCircadian", "immuneRadiation"],
    inApp: "Body temperature, blood glucose, hydration and a light-and-sleep routine.",
  },
] as const;

export function hazardsForSystem(id: BodySystemId): SpaceflightHazard[] {
  return SPACEFLIGHT_HAZARDS.filter((h) => h.systems.includes(id));
}
