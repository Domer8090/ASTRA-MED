import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type { BasisProvenance, MetricId, RecommendationBasis, RuleTrace, SourceRef } from "../types/health";

export const NO_SOURCE_NOTE = "No scientific source cited. Prototype assumption; configurable in src/config/thresholds.ts.";
export const CONTEXT_NOTE = "Scientific context only. It explains why the indicator matters; it does not validate this threshold.";

export function basisFor(indicator: string, rule: string, provenance: BasisProvenance, reference: SourceRef | null, note?: string): RecommendationBasis {
  return {
    indicator,
    rule,
    provenance,
    reference,
    referenceNote: note ?? (reference ? CONTEXT_NOTE : NO_SOURCE_NOTE),
  };
}

/** Basis for a metric recommendation: the first triggered rule, or routine monitoring when nominal. */
export function metricBasis(metricId: MetricId, rules: readonly RuleTrace[], notes: readonly string[] = []): RecommendationBasis {
  const g = METRIC_GUIDANCE[metricId];
  const r = rules[0];
  if (r) return basisFor(g.name, `${r.description}: ${r.threshold}`, r.provenance, g.reference);
  if (notes[0]) return basisFor(g.name, `No rule triggered. ${notes[0]}`, "routine", g.reference);
  return basisFor(g.name, "Inside the configured demonstration range: routine monitoring", "routine", g.reference);
}

export const PROVENANCE_LABEL: Record<BasisProvenance, string> = {
  "supplied-prototype": "SUPPLIED PROTOTYPE",
  "astra-assumption": "ASTRA ASSUMPTION",
  "mission-plan": "MISSION PLAN",
  "scenario-simulation": "SCENARIO SIMULATION",
  routine: "ROUTINE",
};
