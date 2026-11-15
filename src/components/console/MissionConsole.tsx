import { useEffect } from "react";
import { LayoutGrid, Mic, Monitor } from "lucide-react";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { useMissionState, useMissionStore } from "../../hooks/useMissionState";
import { useTuesday } from "../../hooks/useTuesday";
import { PanelBoundary } from "../shared/ErrorBoundary";
import { useSelectedSystem } from "./useConsoleFocus";
import { TrendChartsPanel } from "../TrendChartsPanel";
import { AstronautPanel } from "./AstronautPanel";
import { StatusLine } from "./StatusLine";
import { SummaryDashboard } from "./SummaryDashboard";
import { SystemIntelPanel } from "./SystemIntelPanel";
import { VitalsColumn } from "./VitalsColumn";
import { TuesdayMode } from "../tuesday/TuesdayMode";
import { getConsoleView, setConsoleView, useConsoleView } from "../../hooks/useConsoleView";

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
  const viewMode = useConsoleView();

  // Tuesday's launcher and voice commands switch the console into Tuesday mode.
  useEffect(() => {
    if (tuesday.tuesdayMode) setConsoleView("tuesday");
    else if (getConsoleView() === "tuesday") setConsoleView("summary");
  }, [tuesday.tuesdayMode]);

  // Leaving Tuesday mode another way (navigation, Details) turns it off, so the launcher works again.
  useEffect(() => {
    if (viewMode !== "tuesday" && getConsoleView() !== "tuesday" && tuesday.tuesdayMode) tuesday.setTuesdayMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // While following priority, keep the trend on the priority system as the day or scenario changes.
  useEffect(() => {
    const tab = BODY_SYSTEMS[system].trendTab;
    if (mode === "auto" && trendTab !== tab) store.setTrendTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, mode]);

  const show = (v: "summary" | "details" | "tuesday") => {
    if (v === "tuesday") {
      tuesday.setTuesdayMode(true);
      return;
    }
    if (tuesday.tuesdayMode) tuesday.setTuesdayMode(false);
    setConsoleView(v);
  };
  const VIEWS = [
    { id: "summary", label: "Summary", Icon: LayoutGrid },
    { id: "details", label: "Details", Icon: Monitor },
    { id: "tuesday", label: "Tuesday", Icon: Mic },
  ] as const;

  return (
    <section id="overview" aria-labelledby="overview-title" className="flex scroll-mt-[var(--sticky-offset)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="overview-title" className="text-xl font-bold text-ink">
          {viewMode === "summary" ? "Today" : viewMode === "tuesday" ? "Tuesday" : "Details"}
        </h2>
        <div role="group" aria-label="View" className="flex items-center gap-1 rounded-tile border border-line bg-panel p-1">
          {VIEWS.map(({ id: v, label, Icon }) => (
            <button
              key={v}
              type="button"
              aria-pressed={viewMode === v}
              onClick={() => show(v)}
              className={`flex min-h-[36px] items-center gap-1.5 rounded-control px-3 font-cond text-sm font-semibold transition-colors ${
                viewMode === v ? "border border-line-strong bg-raised text-cyan" : "text-ink-2 hover:text-ink"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "tuesday" ? (
        <PanelBoundary name="Tuesday mode">
          <TuesdayMode embedded onClose={() => show("summary")} />
        </PanelBoundary>
      ) : viewMode === "summary" ? (
        <PanelBoundary name="Summary">
          <SummaryDashboard />
        </PanelBoundary>
      ) : (
        <div id="details" className="flex scroll-mt-[var(--sticky-offset)] flex-col gap-3">
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
        </div>
      )}
    </section>
  );
}
