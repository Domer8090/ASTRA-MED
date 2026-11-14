import { useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { CmeForecastProvider } from "./hooks/useCmeForecast";
import { MissionModelProvider } from "./hooks/useMissionModel";
import { OnboardingProvider } from "./hooks/useOnboarding";
import { MissionStoreContext } from "./hooks/useMissionState";
import { SpaceWeatherProvider } from "./hooks/useSpaceWeather";
import { ToastProvider } from "./hooks/useToast";
import { TuesdayProvider } from "./hooks/useTuesday";
import { UiProvider } from "./hooks/useUi";
import { STORAGE_KEYS } from "./services/storageService";
import type { MissionStore } from "./state/missionStore";

/** The store is created once in main.tsx so StrictMode's double render cannot re-read storage. */
export default function App({ store }: { store: MissionStore }) {

  // Keep several open tabs consistent.
  useEffect(() => {
    const keys = new Set<string>([STORAGE_KEYS.measurements, STORAGE_KEYS.countermeasures, STORAGE_KEYS.followUps, STORAGE_KEYS.settings]);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || keys.has(e.key)) store.reloadFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

  return (
    <MissionStoreContext.Provider value={store}>
      <ToastProvider>
        <SpaceWeatherProvider>
          <CmeForecastProvider>
            <UiProvider>
              <OnboardingProvider>
                <MissionModelProvider>
                  <TuesdayProvider>
                    <AppShell />
                  </TuesdayProvider>
                </MissionModelProvider>
              </OnboardingProvider>
            </UiProvider>
          </CmeForecastProvider>
        </SpaceWeatherProvider>
      </ToastProvider>
    </MissionStoreContext.Provider>
  );
}
