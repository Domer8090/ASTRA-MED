import { useSyncExternalStore } from "react";

/**
 * Which console view shows: the simple Summary (default), Details (body map,
 * trends, tasks, alerts, hazards, devices, space weather) or Tuesday mode.
 * Module-level so navigation can open Details before scrolling to a section.
 */
export type ConsoleView = "summary" | "details" | "tuesday";

let current: ConsoleView = "summary";
const listeners = new Set<() => void>();

export function getConsoleView(): ConsoleView {
  return current;
}

export function setConsoleView(view: ConsoleView): void {
  if (view === current) return;
  current = view;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConsoleView(): ConsoleView {
  return useSyncExternalStore(subscribe, getConsoleView, () => "summary");
}
