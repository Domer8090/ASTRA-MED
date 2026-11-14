/**
 * Environmental hazard advisories.
 *
 * Advisories describe the space-weather environment. They are never a personal
 * dose and never change a dosimeter value. Health status comes from the
 * diagnostic engine; advisories are shown beside it.
 */
import { SCENARIOS } from "../data/scenarios";
import type { DonkiEvent, EnvironmentAdvisory, ScenarioId } from "../types/health";

/** DONKI SEP events newer than this raise a real-world awareness advisory. */
export const DONKI_SEP_ADVISORY_HOURS = 72;

export function scenarioAdvisories(scenarioId: ScenarioId, day: number): EnvironmentAdvisory[] {
  return SCENARIOS[scenarioId].events
    .filter((e) => e.kind === "environment" && day >= e.startDay && day <= e.endDay)
    .map((e) => ({
      id: `scenario:${e.id}`,
      source: "scenario" as const,
      severity: "CAUTION" as const,
      title: `${e.title} (days ${e.startDay}–${e.endDay})`,
      summary:
        "Scenario simulation: elevated solar energetic particle flux is affecting the vehicle environment. This is an environmental hazard indicator, not a personal dose.",
      whyItMatters:
        "Solar particle events can add radiation exposure over hours to days. Protective actions depend on the mission's approved radiation procedures and shelter locations.",
      nextStep:
        "Review the mission-approved radiation procedure. Move to the designated shelter location when directed, check your dosimeter, and record the event and actions taken.",
      provenanceLabel: "SCENARIO SIMULATION",
      missionDayRange: [e.startDay, e.endDay] as [number, number],
    }));
}

export function donkiAdvisories(events: readonly DonkiEvent[], now: number): EnvironmentAdvisory[] {
  const windowMs = DONKI_SEP_ADVISORY_HOURS * 3_600_000;
  return events
    .filter((e) => e.type === "SEP" && e.dataSource !== "fallback" && e.startTime)
    .filter((e) => {
      const t = Date.parse(e.startTime ?? "");
      return !Number.isNaN(t) && now - t >= 0 && now - t <= windowMs;
    })
    .slice(0, 1)
    .map((e) => ({
      id: `donki:${e.id}`,
      source: "donki" as const,
      severity: "CAUTION" as const,
      title: "NASA DONKI reports a recent SEP event",
      summary: `DONKI recorded a solar energetic particle event starting ${e.startTime}. This is real-world space-weather context near Earth, not a reading from this vehicle and not a personal dose.`,
      whyItMatters: "SEP events are a radiation hazard indicator. The crew's actual exposure comes from dosimeters and the mission's validated models.",
      nextStep: "Review the space-weather monitor and the mission-approved radiation procedure. Follow shelter instructions only when directed.",
      provenanceLabel: e.dataSource === "live" ? "NASA DONKI LIVE" : "NASA DONKI CACHED",
      ...(e.startTime ? { startTime: e.startTime } : {}),
    }));
}
