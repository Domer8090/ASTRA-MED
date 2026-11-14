import { BODY_SYSTEMS } from "../data/bodySystems";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import {
  BODY_SYSTEM_IDS,
  STATUS_RANK,
  type BodySystemId,
  type BodySystemState,
  type EnvironmentAdvisory,
  type HealthStatus,
  type MetricDiagnostic,
  type MetricId,
} from "../types/health";
import { formatWithUnit } from "../utils/formatting";
import { worst } from "./diagnosticEngine";

/** A system's status is the most severe status of its metrics. Advisories are listed, not merged into health status. */
export function evaluateBodySystems(
  diagnostics: Record<MetricId, MetricDiagnostic>,
  advisories: readonly EnvironmentAdvisory[],
): Record<BodySystemId, BodySystemState> {
  const out = {} as Record<BodySystemId, BodySystemState>;
  for (const id of BODY_SYSTEM_IDS) {
    const def = BODY_SYSTEMS[id];
    const diags = def.metrics.map((m) => diagnostics[m]);
    let status: HealthStatus = "NOMINAL";
    for (const d of diags) status = worst(status, d.status);
    const sysAdvisories = advisories.filter((a) => a.relations.some((r) => r.id === id));
    const observations = diags.map((d) => {
      const label = METRIC_GUIDANCE[d.metricId].shortName;
      const value = d.latest ? formatWithUnit(d.metricId, d.latest.value) : "no reading";
      const persist = d.status !== "NOMINAL" && d.persistenceDays > 1 ? `, ${d.persistenceDays} days` : "";
      return `${label}: ${value}, ${d.status}${persist}`;
    });
    const top = diags.filter((d) => d.status !== "NOMINAL").sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])[0];
    const hazardStep = sysAdvisories.flatMap((a) => a.actions).find((x) => x.systems.includes(id));
    // A directly affected system follows the hazard's protective sequence first.
    const directHazard = sysAdvisories.some((a) => a.level !== "ALL CLEAR" && a.relations.some((r) => r.id === id && r.relation === "Direct"));
    const recommendedNextStep =
      directHazard && hazardStep
        ? `${hazardStep.text}${top ? ` Then: ${top.recommendedNextStep}` : ""}`
        : top
          ? top.recommendedNextStep
          : hazardStep
            ? hazardStep.text
            : def.nominalNextStep;
    out[id] = { id, status, diagnostics: diags, advisories: sysAdvisories, observations, recommendedNextStep };
  }
  return out;
}

const DEFAULT_ORDER: BodySystemId[] = ["cardiovascular", "neuroOcular", "metabolicCircadian", "musculoskeletal", "immuneRadiation"];

export interface SystemPriority {
  id: BodySystemId;
  reason: string;
}

/**
 * The system that most needs attention: worst health status first; among equals,
 * a system directly linked to an active environmental hazard wins; otherwise a
 * fixed clinical order. Used only to choose what the console shows by default.
 */
export function prioritySystem(
  systems: Record<BodySystemId, BodySystemState>,
  advisories: readonly EnvironmentAdvisory[],
): SystemPriority {
  const active = advisories.filter((a) => a.level !== "ALL CLEAR");
  const direct = new Set(active.flatMap((a) => a.relations.filter((r) => r.relation === "Direct").map((r) => r.id)));
  const ranked = DEFAULT_ORDER.toSorted(
    (a, b) =>
      STATUS_RANK[systems[b].status] - STATUS_RANK[systems[a].status] ||
      Number(direct.has(b)) - Number(direct.has(a)) ||
      DEFAULT_ORDER.indexOf(a) - DEFAULT_ORDER.indexOf(b),
  );
  const id = ranked[0]!;
  const st = systems[id].status;
  const hazard = direct.has(id) ? active.find((a) => a.relations.some((r) => r.id === id && r.relation === "Direct")) : undefined;
  const reason =
    st !== "NOMINAL" && hazard
      ? `${st} and directly linked to the active ${hazard.level} hazard`
      : st !== "NOMINAL"
        ? `${st}, the most severe status`
        : hazard
          ? `directly linked to the active ${hazard.level} hazard`
          : "all systems NOMINAL; default view";
  return { id, reason };
}
