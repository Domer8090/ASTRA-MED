/** Carries a "start pitch mode" request from main.tsx (which reads ?pitch) to PitchMode. */
const SESSION_KEY = "astra-med-pitch";

export function requestPitchOnLoad(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* Pitch mode can still be started with Shift+P. */
  }
}

export function takePitchRequest(): boolean {
  if (new URLSearchParams(window.location.search).has("pitch")) return true;
  try {
    const on = sessionStorage.getItem(SESSION_KEY) === "1";
    sessionStorage.removeItem(SESSION_KEY);
    return on;
  } catch {
    return false;
  }
}
