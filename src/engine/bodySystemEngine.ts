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
    const sysAdvisories = id === "immuneRadiation" ? [...advisories] : [];
    const observations = diags.map((d) => {
      const label = METRIC_GUIDANCE[d.metricId].shortName;
      const value = d.latest ? formatWithUnit(d.metricId, d.latest.value) : "no reading";
      const persist = d.status !== "NOMINAL" && d.persistenceDays > 1 ? `, ${d.persistenceDays} days` : "";
      return `${label}: ${value}, ${d.status}${persist}`;
    });
    const top = diags.filter((d) => d.status !== "NOMINAL").sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])[0];
    const recommendedNextStep = top
      ? top.recommendedNextStep
      : sysAdvisories[0]
        ? sysAdvisories[0].nextStep
        : def.nominalNextStep;
    out[id] = { id, status, diagnostics: diags, advisories: sysAdvisories, observations, recommendedNextStep };
  }
  return out;
}
