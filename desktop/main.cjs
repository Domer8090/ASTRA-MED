/**
 * ASTRA-MED desktop shell for Windows and Linux (macOS works too, for testing).
 *
 * It serves the built web console from inside the app over a private
 * `app://astra` origin, so the console runs with no server and no internet.
 * Health data stays in this machine's user profile (Electron localStorage).
 *
 * Security: sandboxed renderer, context isolation, no Node.js in the page,
 * navigation locked to the app origin, external links open in the system
 * browser, and only the camera permission (for hand control) is granted.
 *
 * Flags:
 *   --officer   open the medical officer dashboard
 *   --kiosk     full-screen kiosk mode for a wall display or crew station
 */
"use strict";

const { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, session, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { parseReadings } = require("./importParser.cjs");

const ORIGIN = "app://astra";
const WEB_ROOT = [path.join(__dirname, "web"), path.join(__dirname, "..", "dist")].find((p) => fs.existsSync(path.join(p, "index.html")));
const START_OFFICER = process.argv.includes("--officer");
const KIOSK = process.argv.includes("--kiosk");

// Hosts the console may contact. Everything works without them; they add live space weather and the EPIC photo.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://epic.gsfc.nasa.gov https://api.nasa.gov",
  "font-src 'self' data:",
  "connect-src 'self' data: blob: https://api.nasa.gov https://ccmc.gsfc.nasa.gov https://epic.gsfc.nasa.gov http://localhost:* http://127.0.0.1:* http://[::1]:*",
  "media-src 'self' blob: mediastream:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);

if (!app.requestSingleInstanceLock()) app.quit();

/** @type {BrowserWindow | null} */
let win = null;

function serveApp() {
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    if (url.host !== "astra") return new Response("Not found", { status: 404 });
    const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = path.normalize(path.join(WEB_ROOT, rel));
    // Refuse anything outside the web root (path traversal).
    if (!file.startsWith(WEB_ROOT + path.sep)) return new Response("Forbidden", { status: 403 });
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response("Not found", { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    if (file.endsWith(".html")) headers.set("Content-Security-Policy", CSP);
    if (file.endsWith(".wasm")) headers.set("Content-Type", "application/wasm");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(res.body, { status: res.status, headers });
  });
}

function lockDownSession() {
  const allowed = new Set(["media", "clipboard-sanitized-write", "fullscreen"]);
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const fromApp = (details.requestingUrl || wc.getURL()).startsWith(ORIGIN);
    // Camera only (hand control). Never the microphone, location, notifications or USB.
    if (permission === "media") return callback(fromApp && (details.mediaTypes || []).every((t) => t === "video"));
    callback(fromApp && allowed.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission, origin) => origin.startsWith(ORIGIN) && allowed.has(permission));
}

function sendToPage(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

async function importReadings() {
  if (!win) return;
  const pick = await dialog.showOpenDialog(win, {
    title: "Import readings",
    buttonLabel: "Import",
    properties: ["openFile"],
    filters: [{ name: "Readings (JSON or CSV)", extensions: ["json", "csv"] }],
  });
  if (pick.canceled || !pick.filePaths[0]) return;
  const file = pick.filePaths[0];
  try {
    const { rows } = parseReadings(fs.readFileSync(file), file);
    sendToPage("astra:import", { rows, fileName: path.basename(file) });
  } catch (e) {
    dialog.showMessageBox(win, { type: "warning", title: "Import readings", message: "Nothing was imported.", detail: e instanceof Error ? e.message : String(e) });
  }
}

ipcMain.on("astra:import-result", (event, result) => {
  if (!win || event.sender !== win.webContents || !result || typeof result !== "object") return;
  const accepted = Number(result.accepted) || 0;
  const rejected = Array.isArray(result.rejected) ? result.rejected.slice(0, 12) : [];
  const total = accepted + (Number(result.rejectedCount) || rejected.length);
  const detail = rejected.length
    ? `Rejected rows (fix them in the file and import again):\n${rejected.map((r) => `Row ${Number(r.row) || "?"}: ${String(r.error).slice(0, 200)}`).join("\n")}${(Number(result.rejectedCount) || 0) > rejected.length ? "\n…" : ""}`
    : "Every row passed the console's entry checks.";
  dialog.showMessageBox(win, {
    type: rejected.length ? "warning" : "info",
    title: "Import readings",
    message: `${accepted} of ${total} readings imported from ${String(result.fileName || "the file").slice(0, 120)}.`,
    detail: `${detail}\n\nImported readings are stored on this computer only.`,
  });
});

function navigate(view) {
  sendToPage("astra:navigate", view);
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        { label: "Import readings…", accelerator: "CmdOrCtrl+I", click: () => void importReadings() },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { label: "Crew console", accelerator: "CmdOrCtrl+1", click: () => navigate("crew") },
        { label: "Medical officer dashboard", accelerator: "CmdOrCtrl+2", click: () => navigate("medical-officer") },
        { type: "separator" },
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }]),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About ASTRA-MED",
          click: () =>
            dialog.showMessageBox(win ?? undefined, {
              type: "info",
              title: "About ASTRA-MED",
              message: `ASTRA-MED ${app.getVersion()}`,
              detail:
                "Offline astronaut health console. NASA Space Apps Challenge 2026 prototype.\n\nTelemetry is SYNTHETIC. Thresholds are prototype demonstration values, not NASA flight rules or clinical standards. Health data stays on this computer.",
            }),
        },
        { label: "Integration guide", click: () => void shell.openExternal("https://github.com/Domer8090/ASTRA-MED/blob/main/docs/INTEGRATION.md") },
        { label: "Source code", click: () => void shell.openExternal("https://github.com/Domer8090/ASTRA-MED") },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: "#060B14",
    title: "ASTRA-MED",
    kiosk: KIOSK,
    autoHideMenuBar: KIOSK,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });
  win.once("ready-to-show", () => win && win.show());
  win.on("closed", () => (win = null));

  const wc = win.webContents;
  // Stay on the app origin. Web links open in the system browser; nothing else opens.
  wc.on("will-navigate", (event, url) => {
    if (!url.startsWith(ORIGIN)) event.preventDefault();
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-attach-webview", (event) => event.preventDefault());

  void win.loadURL(`${ORIGIN}/index.html${START_OFFICER ? "#medical-officer" : ""}`);
}

app.on("second-instance", () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  if (!WEB_ROOT) {
    dialog.showErrorBox("ASTRA-MED", 'The web console is missing. Run "npm run desktop:prepare" before starting the desktop app.');
    app.quit();
    return;
  }
  serveApp();
  lockDownSession();
  buildMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
