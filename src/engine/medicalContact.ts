/**
 * Message for the medical officer, built on the device from engine output and
 * the crew member's own words. ASTRA-MED does not transmit it: the crew copies
 * it into the mission's messaging system when there is a ground link, or
 * queues it on this device until the next contact. Pure functions.
 */
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type { EnvironmentAdvisory, HealthStatus, MetricDiagnostic, MetricId } from "../types/health";
import { formatWithUnit } from "../utils/formatting";
import type { BaselineDrift } from "./baselineEngine";
import type { TrendWatch } from "./trendEngine";

export type ContactPriority = "urgent" | "routine";

export interface MedicalMessageInput {
  day: number;
  shipTime: string;
  priority: ContactPriority;
  overall: HealthStatus;
  diagnostics: Record<MetricId, MetricDiagnostic>;
  trends: readonly TrendWatch[];
  drift: BaselineDrift;
  advisories: readonly EnvironmentAdvisory[];
  /** What the crew member reports, in their words. */
  report: string;
  /** What has been done so far. */
  actionsTaken: string;
  linkUp: boolean;
  signalDelayMinutes: number;
}

export function buildMedicalMessage(i: MedicalMessageInput): string {
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);
  push(
    `${i.priority === "urgent" ? "URGENT" : "ROUTINE"}: MESSAGE FOR THE MEDICAL OFFICER`,
    `Mission day ${i.day}, ship time ${i.shipTime} UTC.`,
    i.linkUp
      ? `Ground link up. One-way signal delay about ${i.signalDelayMinutes.toFixed(1)} min.`
      : "Written during loss of signal; queued on board for the next contact.",
    "",
    "CREW REPORT",
    i.report.trim() || "(nothing written)",
    "",
    "ACTIONS TAKEN ON BOARD",
    i.actionsTaken.trim() || "(nothing written)",
    "",
    `CONSOLE STATUS: ${i.overall} (prototype thresholds; synthetic demo data unless marked as crew-entered)`,
  );
  const flagged = Object.values(i.diagnostics).filter((d) => d.status !== "NOMINAL");
  if (!flagged.length) push("- All indicators inside their configured ranges.");
  for (const d of flagged) {
    const v = d.latest ? formatWithUnit(d.metricId, d.latest.value) : "no reading";
    const rule = d.triggeredRules[0];
    const crewEntered = d.latest?.source === "manual" || d.latest?.source === "tuesday";
    push(`- ${METRIC_GUIDANCE[d.metricId].name}: ${v}, ${d.status}${rule ? ` (rule: ${rule.threshold})` : ""}${crewEntered ? ", logged by crew" : ""}`);
  }
  if (i.drift.state === "drift") push(`- Pattern check: ${i.drift.drivers.map((x) => x.text).join(" ")}`);
  for (const t of i.trends) push(`- Trend watch: ${t.text}`);
  const hazard = i.advisories.find((a) => a.level !== "ALL CLEAR");
  if (hazard) push(`- Environmental hazard ${hazard.level} (${hazard.phase}); not a personal dose.`);
  push("", "REQUEST", i.priority === "urgent" ? "Please advise on next steps as soon as possible." : "Please review at your next opportunity.");
  push("", "Prepared by ASTRA-MED, a prototype. No diagnosis or treatment was suggested by the app.");
  return lines.join("\n");
}
