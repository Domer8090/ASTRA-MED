/**
 * The only bridge between the desktop shell and the web console. It exposes
 * three narrow functions; the page gets no Node.js or file-system access.
 */
"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("astraDesktop", {
  platform: process.platform,
  /** Called with (rows, fileName) when the user picks File > Import readings. */
  onImport(callback) {
    ipcRenderer.on("astra:import", (_event, payload) => callback(payload.rows, payload.fileName));
  },
  /** Sends the import outcome back so the shell can show a native summary. */
  reportImport(result) {
    ipcRenderer.send("astra:import-result", result);
  },
  /** Called with a view name ("crew" or "medical-officer") from the View menu. */
  onNavigate(callback) {
    ipcRenderer.on("astra:navigate", (_event, view) => callback(view));
  },
});
