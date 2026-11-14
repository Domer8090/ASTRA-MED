import { CloudOff, DatabaseZap } from "lucide-react";
import { useMissionState } from "../hooks/useMissionState";
import { useSpaceWeather } from "../hooks/useSpaceWeather";
import { useUiActions } from "../hooks/useUi";
import { AlertsPanel } from "./AlertsPanel";
import { CountermeasureGamification } from "./CountermeasureGamification";
import { DataSourcesModal } from "./DataSourcesModal";
import { GuidanceDrawer } from "./GuidanceDrawer";
import { HazardMap } from "./HazardMap";
import { MeasurementForm } from "./MeasurementForm";
import { MissionConsole } from "./console/MissionConsole";
import { MissionTrack } from "./MissionTrack";
import { NavRail } from "./NavRail";
import { DeepLinks } from "./DeepLinks";
import { PanelBoundary } from "./shared/ErrorBoundary";
import { SpaceWeatherPanel } from "./SpaceWeatherPanel";
import { SpotlightTour } from "./SpotlightTour";
import { TopTelemetryBar } from "./TopTelemetryBar";
import { RechargeDeck } from "./recharge/RechargeDeck";
import { TuesdayLauncher, TuesdayPanel } from "./tuesday/TuesdayPanel";
import { MedicalContactDialog } from "./tuesday/MedicalContactDialog";

function SystemNotices() {
  const storage = useMissionState((s) => s.storage);
  const { online } = useSpaceWeather();
  const { openSources } = useUiActions();
  if (storage.available && storage.recoveredKeys.length === 0 && storage.lastWriteOk && online) return null;
  return (
    <div className="flex flex-col gap-2" role="status">
      {!online ? (
        <p className="flex items-start gap-2 rounded-tile border border-line-strong bg-panel px-3 py-2 text-sm text-ink">
          <CloudOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
          Offline. Every health function keeps working from bundled data and this browser's storage. The space-weather feed is UNAVAILABLE; cached or archived events stay visible with their labels.
        </p>
      ) : null}
      {!storage.available || !storage.lastWriteOk ? (
        <p className="flex items-start gap-2 rounded-tile border border-caution/50 bg-panel px-3 py-2 text-sm text-ink">
          <DatabaseZap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
          This browser is not saving data. New entries and task progress will be lost when the page reloads.
        </p>
      ) : null}
      {storage.recoveredKeys.length ? (
        <p className="flex flex-wrap items-start gap-2 rounded-tile border border-caution/50 bg-panel px-3 py-2 text-sm text-ink">
          <DatabaseZap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
          Some saved data could not be read and was reset to defaults.
          <button type="button" className="link" onClick={() => openSources("storage")}>
            See storage details
          </button>
        </p>
      ) : null}
    </div>
  );
}

export function AppShell() {
  return (
    <div className="min-h-dvh pb-[76px] lg:pb-0">
      <a href="#main" className="sr-only z-[70] rounded-control bg-cyan px-3 py-2 font-semibold text-space focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to console
      </a>
      <NavRail />
      <div className="lg:pl-[var(--rail-w)]">
        <div className="sticky top-0 z-30">
          <TopTelemetryBar />
          <div className="hidden md:block">
            <MissionTrack />
          </div>
        </div>
        <div className="md:hidden">
          <MissionTrack />
        </div>
        <main id="main" tabIndex={-1} className="mx-auto flex max-w-[1760px] flex-col gap-3 px-3 py-3 outline-none md:px-4">
          <SystemNotices />
          <MissionConsole />
          <PanelBoundary name="Hazards">
            <HazardMap />
          </PanelBoundary>
          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,1fr)]">
            <PanelBoundary name="Countermeasures">
              <CountermeasureGamification />
            </PanelBoundary>
            <PanelBoundary name="Alerts">
              <AlertsPanel />
            </PanelBoundary>
          </div>
          <PanelBoundary name="Space weather">
            <SpaceWeatherPanel />
          </PanelBoundary>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-ink-3">
            <p className="max-w-[90ch]">
              ASTRA-MED is a NASA Space Apps Challenge 2026 prototype. Synthetic demonstration data and prototype thresholds; not an operational NASA medical device, and not endorsed by NASA.
            </p>
            <FooterSourcesLink />
          </footer>
        </main>
      </div>
      <DeepLinks />
      <GuidanceDrawer />
      <MeasurementForm />
      <DataSourcesModal />
      <SpotlightTour />
      <TuesdayLauncher />
      <TuesdayPanel />
      <RechargeDeck />
      <MedicalContactDialog />
    </div>
  );
}

function FooterSourcesLink() {
  const { openSources } = useUiActions();
  return (
    <button type="button" className="link" onClick={() => openSources("sources")}>
      Data sources and limitations
    </button>
  );
}
