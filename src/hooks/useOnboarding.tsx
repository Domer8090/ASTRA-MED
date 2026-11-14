import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createStorageService, STORAGE_KEYS } from "../services/storageService";
import { useUiActions, useUiState } from "./useUi";

interface OnboardingRecord {
  overviewSeen: boolean;
  tourDone: boolean;
}

interface OnboardingValue {
  tourActive: boolean;
  startTour: () => void;
  /** Ends the tour and remembers it, whether finished or skipped. */
  endTour: () => void;
}

const storage = createStorageService();
const DEFAULT: OnboardingRecord = { overviewSeen: false, tourDone: false };

export function sanitizeOnboarding(raw: unknown): OnboardingRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  return { overviewSeen: r.overviewSeen === true, tourDone: r.tourDone === true };
}

const OnboardingContext = createContext<OnboardingValue | null>(null);

/**
 * First visit: open the Overview. Closing it is remembered in localStorage and
 * starts the spotlight tour once. Both can be replayed from the Overview.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<OnboardingRecord>(() => storage.read(STORAGE_KEYS.onboarding, sanitizeOnboarding, DEFAULT).value);
  const [tourActive, setTourActive] = useState(false);
  const { sourcesTab } = useUiState();
  const { openSources } = useUiActions();
  const wasOpen = useRef(false);

  const save = useCallback((next: OnboardingRecord) => {
    storage.write(STORAGE_KEYS.onboarding, next);
    setRecord(next);
  }, []);

  // Deep links (a hash such as #weather or #sources-thresholds) go straight to their target.
  useEffect(() => {
    if (!record.overviewSeen && !window.location.hash) openSources("about");
    // Runs once on first mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const open = sourcesTab !== null;
    if (wasOpen.current && !open && !record.overviewSeen) {
      save({ ...record, overviewSeen: true });
      if (!record.tourDone) setTourActive(true);
    }
    wasOpen.current = open;
  }, [sourcesTab, record, save]);

  const startTour = useCallback(() => setTourActive(true), []);
  const endTour = useCallback(() => {
    setTourActive(false);
    save({ overviewSeen: true, tourDone: true });
  }, [save]);

  const value = useMemo(() => ({ tourActive, startTour, endTour }), [tourActive, startTour, endTour]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const v = useContext(OnboardingContext);
  if (!v) throw new Error("OnboardingProvider is missing");
  return v;
}
