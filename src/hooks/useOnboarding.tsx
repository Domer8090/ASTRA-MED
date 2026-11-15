import { setConsoleView } from "./useConsoleView";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createStorageService, STORAGE_KEYS } from "../services/storageService";
import { useUiState } from "./useUi";

interface OnboardingRecord {
  overviewSeen: boolean;
  tourDone: boolean;
}

interface OnboardingValue {
  /** First visit: show the welcome card on the Summary. */
  showWelcome: boolean;
  dismissWelcome: () => void;
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
 * First visit: the Summary shows a small welcome card offering the tour and
 * About. Nothing opens by itself. Dismissal is remembered in localStorage.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<OnboardingRecord>(() => storage.read(STORAGE_KEYS.onboarding, sanitizeOnboarding, DEFAULT).value);
  const [tourActive, setTourActive] = useState(false);
  const { sourcesTab } = useUiState();
  const wasOpen = useRef(false);

  const save = useCallback((next: OnboardingRecord) => {
    storage.write(STORAGE_KEYS.onboarding, next);
    setRecord(next);
  }, []);

  // Opening the About window counts as having seen the welcome.
  useEffect(() => {
    const open = sourcesTab !== null;
    if (wasOpen.current && !open && !record.overviewSeen) save({ ...record, overviewSeen: true });
    wasOpen.current = open;
  }, [sourcesTab, record, save]);

  const dismissWelcome = useCallback(() => save({ ...record, overviewSeen: true }), [record, save]);
  const startTour = useCallback(() => {
    save({ ...record, overviewSeen: true });
    // The tour walks the Summary view; open it from wherever the crew member is.
    setConsoleView("summary");
    window.scrollTo({ top: 0, behavior: "auto" });
    setTourActive(false);
    window.setTimeout(() => setTourActive(true), 0);
  }, [record, save]);
  const endTour = useCallback(() => {
    setTourActive(false);
    save({ overviewSeen: true, tourDone: true });
  }, [save]);

  const showWelcome = !record.overviewSeen;
  const value = useMemo(() => ({ showWelcome, dismissWelcome, tourActive, startTour, endTour }), [showWelcome, dismissWelcome, tourActive, startTour, endTour]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const v = useContext(OnboardingContext);
  if (!v) throw new Error("OnboardingProvider is missing");
  return v;
}
