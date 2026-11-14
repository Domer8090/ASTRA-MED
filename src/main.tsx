import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { createMissionStore } from "./state/missionStore";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

const store = createMissionStore();

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
