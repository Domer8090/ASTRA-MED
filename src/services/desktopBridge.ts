/**
 * Connects the web console to the desktop shell (desktop/preload.cjs) when it
 * runs inside the Windows / Linux app. In a normal browser this does nothing.
 *
 * Imported rows go through the same entry checks as the measurement form
 * (src/core/logDraft.ts). Nothing is sent anywhere: the shell only shows a
 * summary dialog on this computer.
 */
import { logDraft, toLogDraft } from "../core/logDraft";
import { goToView } from "../hooks/useView";
import type { MissionStore } from "../state/missionStore";

interface ImportResult {
  fileName: string;
  accepted: number;
  rejectedCount: number;
  rejected: { row: number; error: string }[];
}

interface DesktopApi {
  platform: string;
  onImport(callback: (rows: unknown[], fileName: string) => void): void;
  reportImport(result: ImportResult): void;
  onNavigate(callback: (view: string) => void): void;
}

function desktopApi(): DesktopApi | null {
  const api = (window as Window & { astraDesktop?: DesktopApi }).astraDesktop;
  return api && typeof api.onImport === "function" ? api : null;
}

export function importRows(store: MissionStore, rows: readonly unknown[], fileName: string): ImportResult {
  const rejected: { row: number; error: string }[] = [];
  let accepted = 0;
  rows.forEach((raw, i) => {
    const draft = toLogDraft(raw);
    if (!draft) {
      rejected.push({ row: i + 1, error: "Not a recognised reading (check metricId)." });
      return;
    }
    const r = logDraft(store, draft);
    if (r.ok) accepted++;
    else rejected.push({ row: i + 1, error: Object.values(r.errors)[0] ?? "Rejected." });
  });
  return { fileName, accepted, rejectedCount: rejected.length, rejected: rejected.slice(0, 50) };
}

export function connectDesktop(store: MissionStore): boolean {
  const api = desktopApi();
  if (!api) return false;
  document.documentElement.dataset.desktop = api.platform;
  api.onImport((rows, fileName) => api.reportImport(importRows(store, Array.isArray(rows) ? rows : [], String(fileName))));
  api.onNavigate((view) => goToView(view === "medical-officer" ? "medical-officer" : "crew"));
  return true;
}
