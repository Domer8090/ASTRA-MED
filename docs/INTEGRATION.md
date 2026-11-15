# Integrating ASTRA-MED

ASTRA-MED is one rules engine with several front ends. The engine decides every
status, threshold, follow-up and piece of guidance. The front ends only display
what it returns. This guide covers how to run each one and how to connect the
engine to other systems.

All telemetry in this repository is **synthetic**. Every threshold is a
**prototype demonstration value**, not a NASA flight rule or a clinical
standard. Before any operational use, qualified aerospace-medicine staff must
review and approve each value in `src/config/thresholds.ts`.

## One engine, four hosts

```
                    src/engine + src/config + src/data   (TypeScript, pure functions, unit-tested)
                                   |
                        src/core/astraCore.ts           (one JSON-in / JSON-out interface)
                                   |
        +--------------------------+---------------------------+----------------------+
        |                          |                           |                      |
   Web console               Desktop app                  iPad app                CLI and pipelines
   (React, any browser)      (Electron, Windows/Linux)    (SwiftUI, JavaScriptCore) (Node.js)
```

| Host | Where it runs | Network | Health data stored in |
| --- | --- | --- | --- |
| Web console | Any modern browser, served as static files | None needed. Optional: NASA DONKI space weather, EPIC photo | Browser `localStorage` |
| Desktop app | Windows 10/11 (x64, arm64), Linux (x64, arm64) | None needed. Same optional feeds | The user profile: `%APPDATA%\ASTRA-MED` or `~/.config/ASTRA-MED` |
| iPad app | iPadOS 18 or later | None | One file in the app's Application Support folder, with complete data protection (encrypted while the iPad is locked) |
| CLI | Any machine with Node.js 22 | None | Nothing; it reads a file and prints JSON |

All four hosts run the same engine code. The iPad app and the CLI load
`dist-core/astra-core.js`, which is built from the same source files the web
console uses. CI checks that the copy inside the iPad app matches the source
(`.github/workflows/apps.yml`).

## 1. Web console on an internal server

```bash
npm ci
npm run build
```

Copy `dist/` to any static web server, such as an intranet server, an S3
bucket or an ISS laptop's local server. There is no backend, no login and no
database. To serve the console from a sub-path, set `VITE_BASE`, for example
`VITE_BASE=/astra-med/ npm run build`.

The medical officer dashboard is the same build, opened at `#medical-officer`.

## 2. Desktop app for Windows and Linux

The desktop app is the full web console packaged with Electron. It runs with no
server and no internet. The console is served from inside the app over a
private `app://astra` origin.

### Build the installers

```bash
npm ci
npm run desktop:dist:win      # NSIS installer (x64, arm64) and a portable .exe
npm run desktop:dist:linux    # AppImage, .deb and .tar.gz (x64, arm64)
```

Output goes to `desktop/release/`. The `Build apps` GitHub workflow builds
both on native runners and attaches the files to the run.

> The repository's own working copy sits on a FAT32 USB drive. macOS writes
> `._*` sidecar files there, which break electron-builder. On that drive, add
> `-c.directories.output=/tmp/astra-release` to build on the internal disk.

### Deploy

- **Silent install on Windows:** `ASTRA-MED-1.0.0-win-x64.exe /S` installs for
  the current user. The installer also accepts `/D=C:\Path` to choose the
  install folder.
- **Linux:** `sudo apt install ./ASTRA-MED-1.0.0-linux-amd64.deb`, or make the
  AppImage executable and run it.
- **Crew station or wall display:** start with `--kiosk` for a full-screen
  console with no window frame.
- **Ground medical officer:** start with `--officer` to open the dashboard.
- **Updates:** there is no auto-update channel and no telemetry. Health data
  never leaves the machine. Roll out new versions the same way as the first one.

### Security settings in the desktop shell (`desktop/main.cjs`)

- Sandboxed renderer, context isolation, and no Node.js in the page.
- Navigation is locked to the app origin. Web links open in the system browser.
- A Content Security Policy limits network access to NASA DONKI
  (`api.nasa.gov`, `ccmc.gsfc.nasa.gov`), NASA EPIC (`epic.gsfc.nasa.gov`) and
  a local model on `localhost`.
- The only permission granted is the camera, for hand control. Microphone,
  location, notifications and USB access are refused.
- The page can reach exactly three functions in the shell, all in
  `desktop/preload.cjs`: receive imported rows, report the import result, and
  switch views.

## 3. Importing readings

To bring readings from another system into the console, use
**File > Import readings…** in the desktop app, or use the CLI.

Both accept JSON or CSV. The JSON format is defined in
`integrations/schema/measurement-input.schema.json`. Examples are in
`integrations/examples/`.

```json
{
  "scenario": "cardiovascular",
  "measurements": [
    { "metricId": "heartRate", "missionDay": 118, "shipTime": "07:30", "value": "92" },
    { "metricId": "bloodPressure", "missionDay": 118, "shipTime": "07:32", "systolic": "138", "diastolic": "86" }
  ]
}
```

```csv
metricId,missionDay,shipTime,value,systolic,diastolic,notes
heartRate,42,07:30,64,,,
bloodPressure,42,07:31,,118,76,
```

Every row goes through the same entry checks as the crew's measurement form
(`src/core/logDraft.ts`). Rejected rows are reported by row number with the
reason. ASTRA-MED never guesses or corrects a value. Accepted rows are stored
on that machine only.

Indicator IDs: `heartRate`, `bloodPressure`, `bloodGlucose`,
`bodyTemperature`, `sleep`, `mood`, `aredMinutes`, `radiation` (cumulative
dosimeter mSv), `pvt`, `hydration`, `symptoms`.

## 4. Command line and pipelines

```bash
npm run core:build
node integrations/cli/astra-core.mjs evaluate integrations/examples/day-118.json
node integrations/cli/astra-core.mjs evaluate readings.csv --scenario nominal --day 42 --full
node integrations/cli/astra-core.mjs report readings.json > surgeon-summary.txt
node integrations/cli/astra-core.mjs methods
```

`evaluate` prints the overall status, each indicator's status with the rules
that set it, body systems, trend watch, baseline drift and the next protocol
action, as JSON. `--full` prints everything the console shows. `report`
prints the plain-text flight surgeon summary.

The exit code is `0` when every input row was accepted, `3` when any row was
rejected, and `1` or `2` on a usage or file error. A pipeline can fail on a bad
file without parsing the output.

## 5. Embedding the engine in another application

`dist-core/astra-core.js` is one self-contained script with no imports and no
network access. It defines `globalThis.AstraCore`:

```js
const core = AstraCore.create(storage);   // storage: { getItem, setItem, removeItem }, or AstraCore.memoryStorage()
const reply = core.call("snapshot", JSON.stringify({ linkUp: true }));
// reply is a JSON string: {"ok":true,"result":{...}} or {"ok":false,"error":"..."}
```

`call` never throws, so any host that can pass strings can use the engine. The
iPad app does this through JavaScriptCore (`ios/AstraMed/Core/CoreEngine.swift`).
Other options are a WebView, Node.js, or an embedded JavaScript runtime in a
C, C++, Java or Python application.

| Method | Arguments | Returns |
| --- | --- | --- |
| `snapshot` | `linkUp` | Everything for the selected day: overall status, 11 indicators with rules and guidance, body systems, advisories, tasks, follow-ups, readiness, trend watch, baseline drift, the five HRP hazards, Tuesday's messages |
| `series` | `metricId`, `window` (7, 30, 90, 180) | Chart points with per-day status, display reference lines and scenario events |
| `logMeasurement` | `metricId`, `missionDay`, `shipTime`, `value` or `systolic`/`diastolic` or `symptoms`, `notes` | `{ok, status}` or `{ok:false, errors}` |
| `deleteMeasurement`, `measurements` | `id` / none | Crew-logged entries |
| `setDay`, `setScenario` | `day` / `scenarioId` | Selected day and synthetic scenario |
| `setTaskCompletion`, `setFollowUpCompletion` | `day`, `taskId`/`id`, `completed` | Countermeasure and follow-up records |
| `updatePlanTargets`, `resetDemoData` | targets / none | Plan settings |
| `tuesdayAsk` | `text` | Tuesday's onboard reply (fixed crisis and dangerous-reading replies included) |
| `tuesdayModelPrompt` | `text` | The prompt for an on-device model, or `null` when the question must get a fixed reply |
| `tuesdayRecordModelAnswer` | `question`, `answer`, `model`, `hasPassages`, `sources` | Stores a model answer after the safety filter |
| `safetyFilter` | `text` | The text with medication, dose, diagnosis and exercise-change sentences removed |
| `report` | none | Flight surgeon summary (plain text) |
| `medicalMessage` | `priority`, `report`, `actionsTaken`, `linkUp` | Prepared message for the medical officer |
| `queueMessage`, `removeQueued` | `priority`, `text` / `id` | Messages kept for the next ground contact |
| `logActivity`, `clearConversation` | `kind`, `minutes`, `mood`, `energy` / none | Tuesday wellbeing records |

The storage object receives versioned keys (`astra-med:v1:*`). The engine
validates everything it reads back, and corrupt data falls back to defaults.

## 6. iPad app

The iPad app is native SwiftUI: a split view with Overview, Vitals and trends
(Swift Charts), Log a reading, Countermeasures, Hazards and body systems,
Tuesday, Recharge (a RealityKit globe lit for the current time, and paced
breathing), the flight surgeon summary and Settings. The medical-officer
contact sheet is available from every screen.

```bash
open ios/AstraMed.xcodeproj
```

Choose a development team under Signing & Capabilities, then run on an iPad or
an iPad simulator. Node.js is not needed: the engine bundle is checked in at
`ios/AstraMed/Resources/astra-core.js`. After changing anything in `src/`, run
`npm run core:build` to refresh it.

- **Tuesday on iPad:** on iPadOS 26 with Apple Intelligence, Tuesday answers
  with Apple's on-device model. The health brief never leaves the iPad. Every
  answer passes the engine's safety filter before it is shown or stored.
  Crisis messages and dangerous typed readings always get the fixed replies.
  Without the model, Tuesday uses the onboard rules.
- **Distribution:** use Apple Business Manager or an MDM (for example Jamf)
  for managed devices, or TestFlight for evaluation. The app has no network
  code and needs no special entitlements.
- **Tests:** `CoreEngineTests` checks that every engine output decodes into
  the Swift models for all three scenarios, that entry rules match the web
  console, that crisis messages get the fixed reply, and that data survives a
  relaunch.

## 7. Safety rules every host keeps

- Statuses are exactly NOMINAL, CAUTION and CRITICAL, always shown with text
  and an icon.
- No diagnosis, no medication, no automatic change to exercise or treatment.
- Synthetic data is labelled SYNTHETIC. Space weather is an environmental
  hazard, never a personal dose.
- Health data stays on the device. The only exception is the optional
  on-device model: Ollama on `localhost` for the desktop and web console, or
  Apple's on-device model on iPad.
