import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { createMissionStore } from "./state/missionStore";
import { isScenarioId } from "./data/scenarios";
import { connectDesktop } from "./services/desktopBridge";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

const store = createMissionStore();

// Deep links for demos: ?scenario=sep&day=131 selects a scenario and day once, then the URL is cleaned.
const params = new URLSearchParams(window.location.search);
const scenarioParam = params.get("scenario");
if (scenarioParam && isScenarioId(scenarioParam)) store.setScenario(scenarioParam);
const dayParam = Number(params.get("day"));
if (Number.isInteger(dayParam) && dayParam >= 1) store.setSelectedDay(dayParam);
if (scenarioParam || params.has("day")) history.replaceState(null, "", window.location.pathname + window.location.hash);

// Inside the Windows / Linux desktop app: File > Import readings and the View menu.
connectDesktop(store);

createRoot(root).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);

// Cache the app shell for offline use. Production builds only; dev stays uncached.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* Offline caching is optional; the app works without it. */
    });
  });
}
