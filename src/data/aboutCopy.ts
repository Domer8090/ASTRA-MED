/** Words for the Overview tab's side panel. Kept here, not in components (CLAUDE.md rule 4). */
import type { HealthStatus } from "../types/health";

export const STATUS_KEY: { status: HealthStatus; meaning: string }[] = [
  { status: "NOMINAL", meaning: "Inside the configured demonstration range." },
  { status: "CAUTION", meaning: "Outside the range. Repeat the measurement." },
  { status: "CRITICAL", meaning: "Far outside. Review the mission-approved protocol and contact the medical officer when communication is available." },
];
