/**
 * Daily countermeasure tasks for the demo mission plan.
 * These are example tasks, not universally approved NASA prescriptions.
 */
import type { CountermeasureTaskDefinition } from "../types/health";

export function getCountermeasureTasks(aredTargetMinutes: number, hydrationTargetLiters: number): CountermeasureTaskDefinition[] {
  return [
    {
      id: "health-check-in",
      title: "Daily health check-in",
      description: "Review today's required vitals and log anything missing.",
      category: "monitoring",
      targetLabel: "Heart rate, blood pressure, temperature reviewed",
      xp: 20,
      guidance: { kind: "system", id: "cardiovascular" },
      missedPrompt: "Yesterday's vitals review was not marked complete. Review today's readings first.",
      timing: "morning",
    },
    {
      id: "sleep-log",
      title: "Sleep log",
      description: "Record the length of your last sleep period.",
      category: "sleep",
      targetLabel: "One entry per sleep period",
      xp: 10,
      linkedMetric: "sleep",
      guidance: { kind: "metric", id: "sleep" },
      missedPrompt: "No sleep entry was confirmed yesterday. Log today's sleep using the same method each day.",
      timing: "morning",
    },
    {
      id: "ared-session",
      title: "ARED resistive exercise",
      description: "Complete only the assigned session in today's exercise plan.",
      category: "exercise",
      targetLabel: `Demo target ${aredTargetMinutes} min (mission plan configurable)`,
      xp: 40,
      linkedMetric: "aredMinutes",
      guidance: { kind: "metric", id: "aredMinutes" },
      missedPrompt:
        "Yesterday's resistive session was below plan. Complete today's assigned session only; do not add time or load to make up for it.",
      timing: "day",
    },
    {
      id: "pvt-check",
      title: "PVT cognitive reaction check",
      description: "Run the scheduled Psychomotor Vigilance Test without interruptions.",
      category: "cognitive",
      targetLabel: "Scheduled session completed",
      xp: 15,
      linkedMetric: "pvt",
      guidance: { kind: "metric", id: "pvt" },
      everyNDays: 3,
      missedPrompt: "Yesterday's PVT check was not completed. Run it at a quiet moment today.",
      timing: "day",
    },
    {
      id: "hydration-check",
      title: "Hydration check",
      description: "Record today's fluid intake against the mission plan.",
      category: "hydration",
      targetLabel: `Demo plan ${hydrationTargetLiters.toFixed(1)} L`,
      xp: 10,
      linkedMetric: "hydration",
      guidance: { kind: "metric", id: "hydration" },
      missedPrompt: "Yesterday's fluid intake was not confirmed. Check today's intake against the plan.",
      timing: "day",
    },
    {
      id: "radiation-review",
      title: "Radiation status review",
      description: "Review the dosimeter reading and the space-weather monitor.",
      category: "radiation",
      targetLabel: "Dosimeter and alerts reviewed",
      xp: 10,
      guidance: { kind: "system", id: "immuneRadiation" },
      missedPrompt: "Yesterday's radiation review was not completed. Check the dosimeter and space-weather monitor.",
      timing: "day",
    },
    {
      id: "wind-down",
      title: "Evening blue-light wind-down",
      description: "Follow the scheduled pre-sleep lighting and screen routine.",
      category: "sleep",
      targetLabel: "Routine started at the scheduled time",
      xp: 10,
      guidance: { kind: "metric", id: "sleep" },
      missedPrompt: "Yesterday's wind-down routine was skipped. Start it at the scheduled time tonight.",
      timing: "evening",
    },
  ];
}
