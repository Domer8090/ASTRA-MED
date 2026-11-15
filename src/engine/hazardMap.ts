/**
 * The five hazards of human spaceflight (NASA HRP), each mapped to what
 * ASTRA-MED measures and does about it, with today's state. Statuses come only
 * from the diagnostic and body-system engines; this file adds no thresholds.
 * Distance from Earth has no health status: it shows the ground link instead.
 */
import { SPACEFLIGHT_HAZARDS, type HazardId } from "../data/spaceflightHazards";
import type { BodySystemId, BodySystemState, EnvironmentAdvisory, HazardLevel, HealthStatus, MetricDiagnostic, MetricId } from "../types/health";
import { formatWithUnit } from "../utils/formatting";
import type { BaselineDrift } from "./baselineEngine";
import { worst } from "./diagnosticEngine";

export type HazardAction =
  | { kind: "weather" }
  | { kind: "tuesday" }
  | { kind: "contact" }
  | { kind: "system"; id: BodySystemId }
  | { kind: "guidance"; metricId: MetricId };

export interface HazardCard {
  id: HazardId;
  name: string;
  /** Worst engine status among the mapped indicators, or null when the hazard has no health status. */
  status: HealthStatus | null;
  /** Short state shown instead of a status (distance) or beside it (radiation). */
  chip: string | null;
  facts: string[];
  note: string;
  action: HazardAction;
  actionLabel: string;
}

export interface HazardMapInput {
  systems: Record<BodySystemId, BodySystemState>;
  diagnostics: Record<MetricId, MetricDiagnostic>;
  advisories: readonly EnvironmentAdvisory[];
  drift: BaselineDrift;
  linkUp: boolean;
  signalDelayMinutes: number;
  queuedMessages: number;
  checkInsThisWeek: number;
  rechargeMinutesThisWeek: number;
}

function value(d: MetricDiagnostic, label: string): string {
  return d.latest ? `${label} ${formatWithUnit(d.metricId, d.latest.value)}` : `${label}: no reading`;
}

function worstOf(list: HealthStatus[]): HealthStatus {
  return list.reduce<HealthStatus>((a, b) => worst(a, b), "NOMINAL");
}

const name = (id: HazardId) => SPACEFLIGHT_HAZARDS.find((h) => h.id === id)!.name;

const delayText = (m: number) => (m < 1 ? `${Math.max(1, Math.round(m * 60))} s` : `${m.toFixed(1)} min`);

export function hazardMap(i: HazardMapInput): HazardCard[] {
  const d = i.diagnostics;
  const hazard = i.advisories.find((a) => a.level !== "ALL CLEAR");
  const level: HazardLevel | null = hazard?.level ?? null;
  const moodDrift = i.drift.state === "drift" ? i.drift.drivers.find((x) => x.feature === "mood" || x.feature === "sleep") : undefined;

  return [
    {
      id: "radiation",
      name: name("radiation"),
      status: i.systems.immuneRadiation.status,
      chip: level ? `HAZARD ${level}` : null,
      facts: [value(d.radiation, "Dosimeter total"), hazard ? `Space weather: ${hazard.level}, ${hazard.phase}` : "No active space-weather hazard"],
      note: "Space weather is an environmental hazard; only the dosimeter measures personal dose.",
      action: { kind: "weather" },
      actionLabel: "Open space weather",
    },
    {
      id: "isolation",
      name: name("isolation"),
      status: worstOf([d.mood.status, d.sleep.status, d.pvt.status]),
      chip: null,
      facts: [
        `${value(d.mood, "Mood")}, ${value(d.sleep, "sleep").toLowerCase()}`,
        `Last 7 days: ${i.checkInsThisWeek} check-in${i.checkInsThisWeek === 1 ? "" : "s"}, ${i.rechargeMinutesThisWeek} min of recharge`,
      ],
      note: moodDrift ? `Pattern check: ${moodDrift.text}` : "Tuesday checks in, watches mood and sleep against your own baseline, and opens the Earth view and games.",
      action: { kind: "tuesday" },
      actionLabel: "Talk to Tuesday",
    },
    {
      id: "distance",
      name: name("distance"),
      status: null,
      chip: i.linkUp ? "GROUND LINK UP" : "NO GROUND LINK",
      facts: [
        `Signal to Earth ${delayText(i.signalDelayMinutes)} one way, ${delayText(i.signalDelayMinutes * 2)} for a reply`,
        i.queuedMessages ? `${i.queuedMessages} message${i.queuedMessages === 1 ? "" : "s"} queued for the medical officer` : "Every health function works on board without a link",
      ],
      note: "A question and its answer take at least twice the delay, so the crew acts first and reports after.",
      action: { kind: "contact" },
      actionLabel: "Contact medical officer",
    },
    {
      id: "gravity",
      name: name("gravity"),
      status: worstOf([i.systems.cardiovascular.status, i.systems.musculoskeletal.status, i.systems.neuroOcular.status]),
      chip: null,
      facts: [`${value(d.heartRate, "Heart rate")}, ${value(d.bloodPressure, "BP")}`, value(d.aredMinutes, "Resistive exercise")],
      note: "Fluid shifts toward the head, bone and muscle loss, and vision changes (SANS) in weightlessness.",
      action: { kind: "system", id: "cardiovascular" },
      actionLabel: "Show on body map",
    },
    {
      id: "environment",
      name: name("environment"),
      status: worstOf([d.bodyTemperature.status, d.hydration.status, d.symptoms.status, d.bloodGlucose.status]),
      chip: null,
      facts: [`${value(d.bodyTemperature, "Temperature")}, ${value(d.hydration, "fluids").toLowerCase()}`, value(d.bloodGlucose, "Glucose")],
      note: "Cabin air, CO₂, noise and microbe sensors are not connected in this prototype; body temperature and symptoms are the crew-side signals.",
      action: { kind: "guidance", metricId: "bodyTemperature" },
      actionLabel: "Temperature guide",
    },
  ];
}
