import { useEffect } from "react";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { useMissionState, useMissionStore } from "../../hooks/useMissionState";
import { PanelBoundary } from "../shared/ErrorBoundary";
import { useSelectedSystem } from "./useConsoleFocus";
import { TrendChartsPanel } from "../TrendChartsPanel";
import { AstronautPanel } from "./AstronautPanel";
import { StatusLine } from "./StatusLine";
import { SystemIntelPanel } from "./SystemIntelPanel";
import { VitalsColumn } from "./VitalsColumn";

/**
 * The primary console. Four zones that move together:
 * vitals (left), astronaut (centre), system intelligence (right), trend (below).
 * Selecting a system or a vital updates all four.
 */
export function MissionConsole() {
  const { system, mode } = useSelectedSystem();
  const store = useMissionStore();
  const trendTab = useMissionState((s) => s.settings.trendTab);
  // While following priority, keep the trend on the priority system as the day or scenario changes.
  useEffect(() => {
    const tab = BODY_SYSTEMS[system].trendTab;
    if (mode === "auto" && trendTab !== tab) store.setTrendTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, mode]);

  return (
    <section id="overview" aria-labelledby="overview-title" className="flex scroll-mt-[var(--sticky-offset)] flex-col gap-3">
      <h2 id="overview-title" className="sr-only">
        Mission medical console
      </h2>
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
    </section>
  );
}
