import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { useMissionState, useMissionStore } from "../../hooks/useMissionState";
import { useTuesday } from "../../hooks/useTuesday";
import { PanelBoundary } from "../shared/ErrorBoundary";
import { useSelectedSystem } from "./useConsoleFocus";
import { TrendChartsPanel } from "../TrendChartsPanel";
import { AstronautPanel } from "./AstronautPanel";
import { StatusLine } from "./StatusLine";
import { SystemIntelPanel } from "./SystemIntelPanel";
import { VitalsColumn } from "./VitalsColumn";
import { TuesdayMode } from "../tuesday/TuesdayMode";
import { TuesdayMark } from "../tuesday/TuesdayMark";

/**
 * The primary console. Four zones that move together:
 * vitals (left), astronaut (centre), system intelligence (right), trend (below).
 * Selecting a system or a vital updates all four.
 * Also offers Tuesday mode: voice logging, checklist and action queue.
 */
export function MissionConsole() {
  const { system, mode } = useSelectedSystem();
  const store = useMissionStore();
  const trendTab = useMissionState((s) => s.settings.trendTab);
  const tuesday = useTuesday();
  const [viewMode, setViewMode] = useState<"classic" | "tuesday">("classic");

  // Keep viewMode synced if voice command requested tuesdayMode
  useEffect(() => {
    if (tuesday.tuesdayMode && viewMode !== "tuesday") {
      setViewMode("tuesday");
    }
  }, [tuesday.tuesdayMode, viewMode]);

  // While following priority, keep the trend on the priority system as the day or scenario changes.
  useEffect(() => {
    const tab = BODY_SYSTEMS[system].trendTab;
    if (mode === "auto" && trendTab !== tab) store.setTrendTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, mode]);

  return (
    <section id="overview" aria-labelledby="overview-title" className="flex scroll-mt-[var(--sticky-offset)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <h2 id="overview-title" className="font-cond text-sm font-bold uppercase tracking-label text-ink">
          Mission Medical Console
        </h2>

        {/* View Mode Toggle Switch */}
        <div className="flex items-center gap-1.5 rounded-tile border border-line bg-panel p-1">
          <button
            type="button"
            onClick={() => {
              setViewMode("classic");
              tuesday.setTuesdayMode(false);
            }}
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1 font-cond text-xs font-semibold transition-colors ${
              viewMode === "classic"
                ? "bg-raised text-cyan border border-line-strong"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Classic Console</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("tuesday");
              tuesday.setTuesdayMode(true);
            }}
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1 font-cond text-xs font-semibold transition-colors ${
              viewMode === "tuesday"
                ? "bg-raised text-tue border border-tue/50"
                : "text-tue hover:bg-tue/10"
            }`}
          >
            <TuesdayMark className="h-3.5 w-3.5" />
            <span>Tuesday mode</span>
          </button>
        </div>
      </div>

      {viewMode === "tuesday" ? (
        <PanelBoundary name="Tuesday Mode Command Center">
          <TuesdayMode embedded onClose={() => {
            setViewMode("classic");
            tuesday.setTuesdayMode(false);
          }} />
        </PanelBoundary>
      ) : (
        <>
          <PanelBoundary name="Mission status">
            <StatusLine />
          </PanelBoundary>
          <div className="console-grid grid gap-3">
            <div className="[grid-area:astro]">
              <PanelBoundary name="Body map">
                <AstronautPanel />
              </PanelBoundary>
            </div>
            <div className="[grid-area:vitals]">
              <PanelBoundary name="Crew vitals">
                <VitalsColumn />
              </PanelBoundary>
            </div>
            <div className="intel-cell [grid-area:intel]">
              <PanelBoundary name="System intelligence">
                <SystemIntelPanel />
              </PanelBoundary>
            </div>
            <div className="min-w-0 [grid-area:trend]">
              <PanelBoundary name="Trend charts">
                <TrendChartsPanel />
              </PanelBoundary>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
