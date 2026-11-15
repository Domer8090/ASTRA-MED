import { describe, expect, it } from "vitest";
import type { BaselineDrift } from "./baselineEngine";
import { topIssues, type SummaryIssueInput } from "./summaryIssues";
import { gaugeTracks, rangeText } from "./gauges";
import type { CountermeasureTask, EnvironmentAdvisory, HealthStatus, MetricDiagnostic, MetricId } from "../types/health";

const diag = (status: HealthStatus) => ({ status }) as MetricDiagnostic;
const steady = { state: "steady" } as BaselineDrift;
const task = (id: string, completed: boolean) => ({ id, title: id, completed }) as CountermeasureTask;

function input(statuses: Partial<Record<MetricId, HealthStatus>>, extra: Partial<SummaryIssueInput> = {}): SummaryIssueInput {
  const ids: MetricId[] = ["heartRate", "bloodPressure", "sleep", "mood"];
  const diagnostics = Object.fromEntries(ids.map((id) => [id, diag(statuses[id] ?? "NOMINAL")])) as Record<MetricId, MetricDiagnostic>;
  return { diagnostics, metricIds: ids, advisories: [], trends: [], drift: steady, tasks: [], ...extra };
}

describe("summary top issues", () => {
  it("puts CRITICAL before CAUTION and caps at four", () => {
    const r = topIssues(input({ heartRate: "CAUTION", bloodPressure: "CRITICAL", sleep: "CAUTION", mood: "CAUTION" }, { tasks: [task("a", false)] }));
    expect(r).toHaveLength(4);
    expect(r[0]).toEqual({ kind: "reading", metricId: "bloodPressure", status: "CRITICAL" });
    expect(r.every((x) => x.kind === "reading")).toBe(true);
  });

  it("shows the good news first when nothing is flagged, then weather and tasks", () => {
    const advisory = { level: "WATCH" } as EnvironmentAdvisory;
    const r = topIssues(input({}, { advisories: [{ level: "ALL CLEAR" } as EnvironmentAdvisory, advisory], tasks: [task("a", true), task("b", false)] }));
    expect(r.map((x) => x.kind)).toEqual(["allClear", "weather", "tasks"]);
    expect(r[2]).toMatchObject({ kind: "tasks", total: 2 });
  });

  it("shows the band between the caution limits as the range, not the reference marker", () => {
    expect(rangeText(gaugeTracks("sleep", 60, 2), "h")).toMatch(/or more h$/);
    expect(rangeText(gaugeTracks("aredMinutes", 60, 2), "min")).toBe("60 or more min");
    expect(rangeText(gaugeTracks("bloodPressure", 60, 2), "mmHg")).toMatch(/^\d+–\d+ \/ \d+–\d+ mmHg$/);
  });
});
