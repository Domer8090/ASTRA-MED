/**
 * Everything Tuesday may quote, gathered from ASTRA-MED's existing guidance,
 * hazard, protective-step and wellbeing data. The text is the app's own
 * prototype content with its sources; none of it is an official NASA
 * checklist or ISS medical procedure.
 */
import { buildIndex, type KnowledgeDoc, type KnowledgeIndex } from "../engine/retrieval";
import { ALL_METRIC_IDS } from "../types/health";
import { ARED, HYDRATION } from "../config/thresholds";
import { getCountermeasureTasks } from "./countermeasureTasks";
import { GUIDANCE_DISCLAIMER, METRIC_GUIDANCE } from "./metricGuidance";
import { SEP_SYSTEM_RELATIONS, SHELTER_REFERENCE } from "./scenarioHazards";
import { REFERENCE_SOURCES } from "./sources";
import { HRP_HAZARDS_URL, SPACEFLIGHT_HAZARDS } from "./spaceflightHazards";
import { WELLBEING_GUIDES } from "./wellbeingGuides";

function guidanceDocs(): KnowledgeDoc[] {
  return ALL_METRIC_IDS.map((id) => {
    const g = METRIC_GUIDANCE[id];
    return {
      id: `guidance:${id}`,
      title: `${g.name}: how to measure and what to do`,
      kind: "guidance",
      source: g.reference,
      text: [
        g.whatItMeasures,
        g.whyItMatters,
        `Device: ${g.deviceRequired}`,
        `How to measure: ${g.howToMeasure.join(" ")}`,
        `In microgravity: ${g.microgravityEffects}`,
        `When to repeat: ${g.whenToRepeat}`,
        `Next step: ${g.nextStep}`,
      ].join(" "),
    };
  });
}

function hazardDocs(): KnowledgeDoc[] {
  return SPACEFLIGHT_HAZARDS.map((h) => ({
    id: `hazard:${h.id}`,
    title: `Spaceflight hazard: ${h.name}`,
    kind: "hazard",
    source: { label: "NASA HRP: 5 Hazards of Human Spaceflight", url: HRP_HAZARDS_URL },
    text: `${h.summary} In ASTRA-MED: ${h.inApp}`,
  }));
}

function protocolDocs(): KnowledgeDoc[] {
  const tasks = getCountermeasureTasks(ARED.defaultTargetMinutes, HYDRATION.defaultTargetLiters).map<KnowledgeDoc>((t) => ({
    id: `task:${t.id}`,
    title: `Countermeasure task: ${t.title}`,
    kind: "protocol",
    source: null,
    text: `${t.description} Target: ${t.targetLabel}. If missed: ${t.missedPrompt}`,
  }));
  const sep: KnowledgeDoc = {
    id: "protocol:sep",
    title: "Solar particle event: protective sequence",
    kind: "protocol",
    source: SHELTER_REFERENCE,
    text: `During a solar particle event (solar storm) warning, here is what to do: move to the designated shelter location, record the dosimeter at shelter entry and exit, and defer non-essential work including ARED exercise. ${SEP_SYSTEM_RELATIONS.map((r) => r.text).join(" ")} Space weather is an environmental hazard; only the dosimeter measures personal dose.`,
  };
  const escalation: KnowledgeDoc = {
    id: "protocol:escalation",
    title: "When a reading is outside the configured range",
    kind: "protocol",
    source: null,
    text: `Repeat the measurement with the same posture and rest period. If it stays outside the configured demonstration range, review the mission-approved protocol and contact the medical officer when communication is available. A CRITICAL status means contact the medical officer when communication is available. ${GUIDANCE_DISCLAIMER}`,
  };
  return [...tasks, sep, escalation];
}

function wellbeingDocs(): KnowledgeDoc[] {
  return WELLBEING_GUIDES.map((w) => ({ id: `wellbeing:${w.id}`, title: w.title, kind: "wellbeing", source: w.source, text: w.text }));
}

function sourceDocs(): KnowledgeDoc[] {
  return REFERENCE_SOURCES.map((s) => ({
    id: `source:${s.url}`,
    title: s.title,
    kind: "source",
    source: { label: `${s.publisher}: ${s.title}`, url: s.url },
    text: `${s.description} Used for: ${s.usedFor}`,
  }));
}

export function knowledgeDocs(): KnowledgeDoc[] {
  return [...guidanceDocs(), ...hazardDocs(), ...protocolDocs(), ...wellbeingDocs(), ...sourceDocs()];
}

let cached: KnowledgeIndex | null = null;
export function knowledgeIndex(): KnowledgeIndex {
  cached ??= buildIndex(knowledgeDocs());
  return cached;
}
