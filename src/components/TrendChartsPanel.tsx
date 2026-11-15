import { lazy, Suspense, useMemo } from "react";
import { MISSION } from "../config/thresholds";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import { buildChartRows, eventAnnotations, statusPeriods, windowRange, type ChartRow, type StatusPeriod } from "../services/chartSeries";
import type { HealthStatus, TrendWindow } from "../types/health";
import { formatNumber } from "../utils/formatting";
import { TABS, type TabDef } from "./charts/trendTabs";
import { Panel } from "./shared/Panel";
import { ProvenanceTag } from "./shared/ProvenanceTag";
import { Segmented } from "./shared/Segmented";
import { StatusIcon } from "./shared/StatusBadge";

/** Recharts is the heaviest dependency; load it in its own chunk so the console paints first. */
const TrendChart = lazy(() => import("./charts/TrendChart"));

const WINDOWS: { value: TrendWindow; label: string }[] = [
  { value: 7, label: "7 d" },
  { value: 30, label: "30 d" },
  { value: 90, label: "90 d" },
  { value: 180, label: "180 d" },
];

function summarize(tab: TabDef, rows: ChartRow[], periods: StatusPeriod[], range: [number, number], day: number): string {
  const last = Math.min(range[1], day);
  const parts = tab.series.map((s) => {
    const vals = rows.filter((r) => r.day <= last).map((r) => r[s.key]).filter((v): v is number => typeof v === "number");
    if (!vals.length) return `${s.name}: no data in this window.`;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const latest = vals[vals.length - 1]!;
    return `${s.name} ranged ${formatNumber(min, s.decimals)} to ${formatNumber(max, s.decimals)} ${s.unit} (mean ${formatNumber(mean, s.decimals)}), latest ${formatNumber(latest, s.decimals)} ${s.unit}.`;
  });
  const cautionDays = periods.reduce((n, p) => n + (p.end - p.start + 1), 0);
  return `Days ${range[0]}–${last}. ${parts.join(" ")} ${cautionDays ? `${cautionDays} day${cautionDays === 1 ? "" : "s"} at CAUTION or CRITICAL in this window.` : "No CAUTION or CRITICAL days in this window."}`;
}

export function TrendChartsPanel() {
  const { days, day, settings, metricDayStatus, diagnostics, scenario } = useMissionModel();
  const store = useMissionStore();
  const tab = TABS.find((t) => t.id === settings.trendTab) ?? TABS[0]!;
  const range = useMemo(() => windowRange(day, settings.trendWindow, MISSION.totalDays), [day, settings.trendWindow]);
  const rows = useMemo(() => buildChartRows(days, day, range), [days, day, range]);
  const periods = useMemo(() => {
    const merged: HealthStatus[] = Array.from({ length: MISSION.totalDays }, (_, i) => {
      let s: HealthStatus = "NOMINAL";
      for (const m of tab.metrics) {
        const v = metricDayStatus[m][i] ?? "NOMINAL";
        if (v === "CRITICAL" || (v === "CAUTION" && s === "NOMINAL")) s = v;
      }
      return s;
    });
    return statusPeriods(merged, range, day);
  }, [metricDayStatus, tab, range, day]);
  const summary = useMemo(() => summarize(tab, rows, periods, range, day), [tab, rows, periods, range, day]);
  const annotations = useMemo(() => eventAnnotations(scenario.events, range, day, tab.metrics), [scenario.events, range, day, tab.metrics]);

  return (
    <Panel
      id="trends"
      title="Physiological trend"
      subtitle={<><p>Follows the selected system. Click the chart to jump to a day.</p><p>Green band: configured reference range (prototype value, not a NASA standard). Shaded bands: days rated CAUTION or CRITICAL. Data stops at the selected day.</p></>}
      actions={
        <>
          <ProvenanceTag kind="SYNTHETIC" label="SYNTHETIC DEMO TELEMETRY" />
          <Segmented label="Time window" value={settings.trendWindow} onChange={(w) => store.setTrendWindow(w)} options={WINDOWS} />
        </>
      }
    >
      <div role="tablist" aria-label="Trend charts" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const selected = t.id === tab.id;
          const status = t.metrics.reduce<HealthStatus>((acc, m) => {
            const s = diagnostics[m].status;
            return s === "CRITICAL" || (s === "CAUTION" && acc === "NOMINAL") ? s : acc;
          }, "NOMINAL");
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`trend-tab-${t.id}`}
              aria-selected={selected}
              aria-controls="trend-chart"
              tabIndex={selected ? 0 : -1}
              onClick={() => store.setTrendTab(t.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = TABS.findIndex((x) => x.id === tab.id);
                const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length]!;
                store.setTrendTab(next.id);
                requestAnimationFrame(() => document.getElementById(`trend-tab-${next.id}`)?.focus());
              }}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-control border px-3 py-1.5 font-cond text-sm font-semibold transition-colors duration-150 ${
                selected ? "border-cyan bg-raised text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
              }`}
            >
              <span className={status === "NOMINAL" ? "text-ink-3" : status === "CAUTION" ? "text-caution" : "text-critical"}>
                <StatusIcon status={status} className="h-3.5 w-3.5" />
              </span>
              <span className="sr-only">{status}, </span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div id="trend-chart" role="tabpanel" aria-labelledby={`trend-tab-${tab.id}`} className="mt-3">
        <div className="h-[300px] w-full md:h-[340px]" role="img" aria-label={`${tab.label} chart. ${summary}`}>
          <Suspense fallback={<div className="flex h-full items-center justify-center rounded-tile border border-dashed border-line text-sm text-ink-2">Loading chart…</div>}>
          <TrendChart
            tab={tab}
            rows={rows}
            periods={periods}
            day={day}
            range={range}
            {...(tab.id === "ared" ? { target: settings.aredTargetMinutes } : {})}
            annotations={annotations}
            onPick={(d) => store.setSelectedDay(Math.min(d, MISSION.totalDays))}
          />
          </Suspense>
        </div>
        <p className="mt-2 max-w-[90ch] text-sm text-ink-2">{summary}</p>
        {annotations.length ? (
          <p className="mt-1 text-xs text-ink-2">
            <span className="font-semibold text-ink">Annotated events: </span>
            {annotations.map((a) => `${a.label} (day ${a.start}${a.end > a.start ? `–${a.end}` : ""})`).join("; ")}.
          </p>
        ) : null}
        {tab.id === "radiation" ? <p className="mt-1 text-2xs text-ink-3">Daily dose comes from the synthetic personal dosimeter. Space-weather events never add to it.</p> : null}
      </div>
    </Panel>
  );
}
