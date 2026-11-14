import { useSyncExternalStore } from "react";

export type AppView = "crew" | "medical-officer";

export const MEDICAL_OFFICER_HASH = "#medical-officer";

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Which page is showing. `#medical-officer` opens the ground dashboard; anything else is the crew console. */
export function useView(): AppView {
  return useSyncExternalStore(
    subscribe,
    () => (window.location.hash === MEDICAL_OFFICER_HASH ? "medical-officer" : "crew"),
    () => "crew",
  );
}

export function goToView(view: AppView): void {
  window.location.hash = view === "medical-officer" ? MEDICAL_OFFICER_HASH : "#overview";
  window.scrollTo({ top: 0 });
}
