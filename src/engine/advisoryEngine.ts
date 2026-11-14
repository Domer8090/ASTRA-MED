/**
 * Environmental hazard assessment.
 *
 * Sources:
 *  - Scenario C (simulation): level and phase per mission day from src/data/scenarioHazards.ts.
 *  - NASA DONKI (real world, near Earth): an SEP that started within the last 72 h
 *    in live or cached data raises a WATCH for awareness. Archived data never does.
 *
 * An assessment is a hazard indicator. It never creates or changes a dose and is
 * never merged into health status. Protective actions are prototype steps that
 * point to the mission-approved procedure; they are not a procedure themselves.
 */
import { SEP_SCENARIO, SEP_SYSTEM_RELATIONS, SHELTER_REFERENCE, ARTEMIS_SPACE_WEATHER_REFERENCE, type HazardPhase } from "../data/scenarioHazards";
import type { DonkiEvent, EnvironmentAdvisory, HazardLevel, ProtectiveAction, ScenarioId } from "../types/health";
import { basisFor } from "./basis";

/** DONKI SEP events newer than this raise a real-world awareness WATCH. */
export const DONKI_SEP_ADVISORY_HOURS = 72;

const SHELTER_NOTE =
  "Context: NASA describes sheltering behind stowage mass during SEP events for Orion crews. ASTRA-MED's wording is a prototype assumption, not a mission procedure.";

function scenarioActions(level: HazardLevel, day: number, phase: string): ProtectiveAction[] {
  const b = (ref: typeof SHELTER_REFERENCE | typeof ARTEMIS_SPACE_WEATHER_REFERENCE | null, note?: string) =>
    basisFor(
      "Environmental hazard assessment (scenario simulation)",
      `Level ${level} on mission day ${day} (${phase})`,
      "scenario-simulation",
      ref ? { ...ref } : null,
      note ?? "No scientific source cited. Prototype protective step defined in src/data/scenarioHazards.ts and src/engine/advisoryEngine.ts; follow the mission-approved procedure.",
    );
  if (level === "WATCH") {
    return [
      { id: "watch-procedure", text: "Review the mission-approved radiation procedure and confirm your designated shelter location.", systems: ["immuneRadiation"], basis: b(ARTEMIS_SPACE_WEATHER_REFERENCE, "Context: NASA monitors the Sun for Artemis crews and sets shelter triggers. ASTRA-MED's wording is a prototype assumption.") },
      { id: "watch-dosimeter", text: "Check that your personal dosimeter is worn, current and logging.", systems: ["immuneRadiation"], basis: b(null) },
      { id: "watch-monitor", text: "Keep monitoring space-weather alerts until the event is cleared.", systems: ["immuneRadiation"], basis: b(null) },
    ];
  }
  if (level === "WARNING") {
    return [
      { id: "warn-shelter", text: "Move to the designated shelter location when the procedure directs, and arrange stowage mass as the procedure describes.", systems: ["immuneRadiation"], basis: b(SHELTER_REFERENCE, SHELTER_NOTE) },
      { id: "warn-dosimeter", text: "Check and record your dosimeter reading at shelter entry and exit.", systems: ["immuneRadiation"], basis: b(null) },
      { id: "warn-defer", text: "Defer non-essential work outside the shelter, including the ARED session, unless the procedure says otherwise. Log deferred sessions; do not make them up later.", systems: ["musculoskeletal"], basis: b(null) },
      { id: "warn-rest", text: "Log sleep and fluids during the shelter period; expect disrupted rest.", systems: ["neuroOcular", "metabolicCircadian"], basis: b(null) },
    ];
  }
  return [
    { id: "clear-record", text: "Record event start and end, shelter time and dosimeter readings for the flight surgeon.", systems: ["immuneRadiation"], basis: b(null) },
    { id: "clear-resume", text: "Resume the normal schedule, including the next assigned ARED session at its normal duration.", systems: ["musculoskeletal"], basis: b(null) },
  ];
}

export function scenarioAdvisories(scenarioId: ScenarioId, day: number): EnvironmentAdvisory[] {
  if (scenarioId !== "sep") return [];
  const p: HazardPhase | undefined = SEP_SCENARIO.phases[day];
  if (!p) return [];
  const [start, end] = SEP_SCENARIO.eventDays;
  return [
    {
      id: `scenario:${SEP_SCENARIO.id}:${day}`,
      source: "scenario",
      severity: p.level === "ALL CLEAR" ? "NOMINAL" : "CAUTION",
      level: p.level,
      phase: p.phase,
      title: `${SEP_SCENARIO.title}: ${p.level}`,
      summary: `${p.description} Environmental hazard indicator, not a personal dose.`,
      whyItMatters:
        "Solar particle events can add radiation exposure over hours to days. Protection depends on shelter location, shielding mass and the mission's approved procedure.",
      nextStep: scenarioActions(p.level, day, p.phase)[0]!.text,
      provenanceLabel: "SCENARIO SIMULATION",
      missionDayRange: [start, end],
      relations: p.level === "ALL CLEAR" ? SEP_SYSTEM_RELATIONS.filter((r) => r.id === "immuneRadiation") : [...SEP_SYSTEM_RELATIONS],
      actions: scenarioActions(p.level, day, p.phase),
      basis: basisFor("Environmental hazard assessment (scenario simulation)", `Simulated SEP phase "${p.phase}" on mission day ${day}`, "scenario-simulation", { ...SHELTER_REFERENCE }, SHELTER_NOTE),
    },
  ];
}

export function donkiAdvisories(events: readonly DonkiEvent[], now: number): EnvironmentAdvisory[] {
  const windowMs = DONKI_SEP_ADVISORY_HOURS * 3_600_000;
  const recent = events
    .filter((e) => e.type === "SEP" && e.dataSource !== "archived" && e.startTime)
    .filter((e) => {
      const t = Date.parse(e.startTime ?? "");
      return !Number.isNaN(t) && now - t >= 0 && now - t <= windowMs;
    })[0];
  if (!recent) return [];
  const basis = basisFor(
    "NASA DONKI solar energetic particle record",
    `SEP start within the last ${DONKI_SEP_ADVISORY_HOURS} h in ${recent.dataSource} data`,
    "astra-assumption",
    { ...ARTEMIS_SPACE_WEATHER_REFERENCE },
    "Context only. The 72-hour awareness window is an ASTRA-MED assumption. DONKI describes near-Earth conditions, not this vehicle.",
  );
  return [
    {
      id: `donki:${recent.id}`,
      source: "donki",
      severity: "CAUTION",
      level: "WATCH",
      phase: "Real-world awareness",
      title: "NASA DONKI reports a recent SEP event",
      summary: `DONKI recorded a solar energetic particle event starting ${recent.startTime}. This is real-world space weather near Earth, not a reading from this vehicle and not a personal dose.`,
      whyItMatters: "SEP events are a radiation hazard indicator. The crew's exposure comes from dosimeters and the mission's validated models.",
      nextStep: "Review the space-weather monitor and the mission-approved radiation procedure. Follow shelter instructions only when directed.",
      provenanceLabel: recent.dataSource === "live" ? "NASA DONKI LIVE" : "NASA DONKI CACHED",
      ...(recent.startTime ? { startTime: recent.startTime } : {}),
      relations: SEP_SYSTEM_RELATIONS.filter((r) => r.id === "immuneRadiation"),
      actions: [
        { id: "donki-review", text: "Review the space-weather monitor and the mission-approved radiation procedure. Follow shelter instructions only when directed.", systems: ["immuneRadiation"], basis },
      ],
      basis,
    },
  ];
}
