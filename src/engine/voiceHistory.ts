/**
 * Plain-language summary of one indicator over the last N mission days, for
 * Tuesday's spoken answers ("what has my heart rate been over the last 14 days?").
 * Pure: reads the effective days the engines already use, invents nothing, and
 * states the status only as the diagnostic engine gave it.
 */
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import type { EffectiveDay, HealthStatus, MetricId } from "../types/health";
import { formatWithUnit, METRIC_UNITS } from "../utils/formatting";

const round1 = (x: number) => Math.round(x * 10) / 10;

export function describeHistory(days: readonly EffectiveDay[], today: number, metricId: MetricId, span: number, status: HealthStatus): string {
  const from = Math.max(1, today - span + 1);
  const name = METRIC_GUIDANCE[metricId].shortName.toLowerCase();
  const unit = METRIC_UNITS[metricId];
  const nums: number[] = [];
  const sys: number[] = [];
  const dia: number[] = [];
  let latest: { day: number; text: string } | null = null;
  for (let d = from; d <= today; d++) {
    const v = days[d - 1]?.readings[metricId]?.value;
    if (typeof v === "number") nums.push(v);
    else if (v && typeof v === "object" && "systolic" in v) {
      sys.push(v.systolic);
      dia.push(v.diastolic);
    }
    if (v !== undefined) latest = { day: d, text: formatWithUnit(metricId, v) };
  }
  const count = nums.length || sys.length;
  if (!count || !latest) return `I have no ${name} readings in the last ${span} days.`;

  const avg = (xs: number[]) => round1(xs.reduce((a, b) => a + b, 0) / xs.length);
  const range =
    sys.length > 0
      ? `ranged from ${Math.min(...sys)}/${Math.min(...dia)} to ${Math.max(...sys)}/${Math.max(...dia)} ${unit}, averaging ${Math.round(avg(sys))}/${Math.round(avg(dia))}`
      : `ranged from ${round1(Math.min(...nums))} to ${round1(Math.max(...nums))} ${unit}, averaging ${avg(nums)}`;
  const latestText = latest.day === today ? `Today it is ${latest.text}` : `The latest, on day ${latest.day}, was ${latest.text}`;
  const statusText = status === "NOMINAL" ? "which is NOMINAL" : `which is ${status}, so follow the step in your action queue`;
  return `Over the last ${span} days (${count} reading${count === 1 ? "" : "s"}), your ${name} ${range}. ${latestText}, ${statusText}.`;
}
