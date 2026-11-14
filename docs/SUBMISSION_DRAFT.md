# ASTRA-MED: Space Apps 2026 submission draft

Draft for the project page. Fields follow the NASA Space Apps *Project
Submission Guide* (https://www.spaceappschallenge.org/resources/project-submission-guide/).
Items in [square brackets] are for the team to fill in or confirm before
submitting. Every claim below matches what the code does at commit `a8f7710`.
If a feature changes before submission, update this text.

Challenge: **Health Monitoring Software for Astronauts**

---

## Project Name

**ASTRA-MED: Crew Health. Mission Ready.**

## High-Level Project Summary

ASTRA-MED is a browser-based health console that lets an astronaut check
their own health without waiting for Earth. On the way to Mars a message can
take up to 22 minutes each way.

The crew logs eleven indicators, such as blood pressure, heart rate,
glucose, sleep and mood. A rules engine shows each one as
NOMINAL, CAUTION or CRITICAL on a clickable body map. Each status comes with a
plain-language next step, and a trend watch warns when a reading is drifting
toward its limit. Live NASA DONKI space-weather data, including WSA-ENLIL
forecasts of solar storms reaching Mars, sets the radiation context. It works
fully offline, and health data never leaves the device.

## Link to Project Demo

[Public link to a video of 30 seconds or less, or a deck of at most 7 slides
including title and intro. See "Demo outline" below. The three-minute script
in `docs/DEMO_SCRIPT.md` is for live judging only; it is too long to submit as
the demo.]

## Link to Final Project

https://domer8090.github.io/ASTRA-MED/ [Live once GitHub Pages is enabled for the repository; `.github/workflows/pages.yml` builds and deploys on every push to `main`. Confirm the URL loads before submitting.] Source code:
https://github.com/Domer8090/ASTRA-MED

---

## Detailed Project Description

### What it does

ASTRA-MED opens straight into a mission console for a 180-day demo mission to
Mars, ARES TRANSIT. The crew member sees:

- **A status band.** Overall health status, the body system to watch and the single most important next action, all derived from the rules engine. The band also shows today's Earth–Mars signal delay.
- **A clickable body map.** Five body systems: neuro-ocular, cardiovascular, musculoskeletal, immune and radiation, metabolic and circadian. Each shows its status as a colour, an icon and a word, never colour alone. Selecting a system shows:
  - what changed and why it matters in microgravity
  - which measurements can be taken on board and the device needed
  - a step-by-step self-check
  - the recommended next step
- **Crew vitals.** Eight required indicators (resting heart rate, blood pressure, blood glucose, body temperature, sleep, mood, resistive exercise minutes, cumulative radiation dose) and three supplementary ones (PVT reaction time, hydration, a neuro-ocular symptom check). Each has a range gauge, a 14-day sparkline and its change since the last reading.
- **Measurement logging.** Entry by keyboard and mouse, with validation. For example, a dosimeter reading lower than the previous day is rejected with a reason. Status, charts and readiness recalculate as soon as the entry is saved.
- **Trend charts.** Seven views over 7, 30, 90 or 180 days, with reference bands, CAUTION periods, event annotations and a text summary of each chart.
- **Trend watch.** For readings that are still NOMINAL but have left their reference band, a 7-day straight-line fit estimates when the reading would reach its caution limit. It shows a notice only if that is within 7 days and the fit is good (R² ≥ 0.5). It never changes a status.
- **Daily countermeasures.** Resistive exercise, hydration, sleep log, PVT and health check-in. Each task earns XP once per day; the console also tracks a streak and a readiness score whose four parts are shown. Readiness is an engagement indicator. It can never hide a CAUTION or CRITICAL.
- **Space weather.** NASA DONKI solar flares, solar energetic particle events, coronal mass ejections and notifications, plus WSA-ENLIL forecasts of CME arrival at Earth and Mars. Space weather is shown as an environmental hazard, never as a personal dose.
- **"Why this step?"** under every recommendation. It shows the indicator, the rule that fired, where the rule came from, and any reference.
- **Three replayable scenarios.**
  - A: a nominal mission day.
  - B: a cardiovascular drift that trend watch flags eight days before the alarm.
  - C: a simulated solar particle event with a WATCH → WARNING → ALL CLEAR protective sequence.

### How it works

1. **Readings.** A seeded synthetic model generates 180 days of telemetry. The crew's own entries replace the synthetic value for that day and metric, and earlier entries are kept in history.
2. **Diagnostics.** For each metric, the diagnostic engine finds the latest reading on or before the selected day. It applies the configured rule, including persistence (for example two short nights in a row) and staleness: a missing measurement raises CAUTION. The result is a status, an explanation, a next step and a rule trace.
3. **System status.** Each body system takes the worst status of its metrics, and the overall status is the worst of all of them. Nothing is hardcoded.
4. **Follow-ups.** The protocol engine creates one follow-up per out-of-range metric, active hazard and task missed yesterday, then picks the single most important action.
5. **Space weather.** The DONKI client asks each event type from two NASA hosts in turn (CCMC DONKI API, then api.nasa.gov) with a 12-second timeout. Every response is validated, and the client caches each type separately. A feed is labelled LIVE only after a successful response this session; otherwise CACHED, ARCHIVED or UNAVAILABLE. A bundled archive of real DONKI records from the May 2024 solar storm keeps the panel meaningful offline.
6. **Signal delay.** Earth–Mars distance and one-way delay are computed in the browser from JPL's Keplerian elements for approximate planet positions.
7. **Offline.** A service worker caches the app shell, and all state is in versioned `localStorage`. The app loads, logs, recalculates and charts with no network and no API key. A failed API call never breaks the interface.

### How it addresses the challenge

| Challenge asks for | ASTRA-MED |
| --- | --- |
| Gather health indicators | Eleven indicators, including all six examples: blood pressure, heart rate, blood sugar, body temperature, sleep, mood |
| Evaluate and act on health status | NOMINAL / CAUTION / CRITICAL per indicator and system, with one next action and step-by-step guidance |
| Clickable human figure with status per body part | SVG body map with five keyboard-accessible systems |
| Which measurements can be done in space, and why | Each system lists its on-board measurements, the device needed and why it matters in microgravity |
| When a result needs crew or flight-surgeon attention | CAUTION and CRITICAL rules with persistence and staleness. Next steps say to repeat the measurement, review the mission-approved protocol and contact the medical officer when communication is available. |
| Actions that prevent a critical condition | Daily countermeasures, prompts for missed tasks, trend watch, and a shelter sequence for radiation hazards |
| Measurement and action prompts as part of a routine | Daily task list, PVT every third day, CAUTION when a measurement goes stale |
| Gamification | XP, streak and a readiness score with its breakdown |
| Dynamic charts and colour coding | Seven trend views; status colours always paired with text and an icon |
| Simple instructions; no medical knowledge assumed | Plain-language explanations, self-check steps, an Overview and an 8-step guided tour |

ASTRA-MED does not suggest treatments or medication, and it never changes
exercise or treatment on its own. This is deliberate. Its guidance stops at
"repeat the measurement", "review the mission-approved protocol" and
"contact the medical officer", because an unvalidated tool should not
prescribe.

### Benefits

- **Autonomy under signal delay.** The crew can triage routine readings on board, read one band each morning and know the next step.
- **Early warning.** Trend watch flags a steady drift before a threshold alarm.
- **Trust through transparency.**
  - Every recommendation shows its rule and where the rule came from.
  - Synthetic data is labelled SYNTHETIC.
  - Space weather is never presented as a dose.
- **Works anywhere.** Offline, on a laptop or a phone (from 375 px wide), with no account or server.
- **Privacy.** Health data stays in the browser; only date ranges (and, for api.nasa.gov, the public API key) go to NASA's space-weather APIs.

### What we hope to achieve

[Team to confirm.] A clear, honest reference design for crew self-monitoring
that a flight-medicine team could adapt by replacing the demonstration
thresholds with its own approved values. The same pattern could serve
analog-mission crews and other isolated, remote teams that cannot reach a
clinician quickly.

### Tools, languages and software

- TypeScript 5.9 (strict), React 18, Vite 8
- Tailwind CSS 3, Recharts 3 (charts), Lucide React (icons)
- Vitest (79 unit tests), ESLint 10
- Service worker and `localStorage` for offline use; no backend, database or login
- Fonts: Barlow, Barlow Semi Condensed, IBM Plex Mono, bundled through Fontsource (no font CDN, so they work offline)
- Node scripts for live DONKI endpoint checks and QA screenshots (Chrome DevTools Protocol)

---

## Use of Super Intelligence (SI)

[Team to complete accurately. Judges do not see this answer, but they do see
any SI markers in the project. The guide asks teams to say where SI was used
and to acknowledge SI-generated code in descriptive text and metadata.]

Suggested wording, if accurate: "We used Claude Code (Anthropic) as a coding
assistant to write and refactor source code, unit tests and documentation
from our own specification (`PROMPT.md`), which sets out the concept, features
and safety rules. The team chose the challenge approach, reviewed the output
and tested the app. No SI-generated images, video or audio are used."

Also add a matching note to `README.md`.

---

## NASA Data

**NASA data used in the app:**

- **NASA DONKI** (Space Weather Database Of Notifications, Knowledge, Information), run by the Community Coordinated Modeling Center:
  - Solar flares (FLR), solar energetic particle events (SEP), coronal mass ejections (CME) and notifications.
  - Requested live for the last 30 days from the CCMC DONKI API (https://ccmc.gsfc.nasa.gov/DONKI-API/get/), with api.nasa.gov as the second host.
  - Shown in the space-weather monitor. A live SEP within the last 72 hours raises an awareness notice.
  - It never sets a dose or a health status.
- **NASA CCMC WSA-ENLIL simulations** via DONKI. These are model forecasts of CME arrival at Earth and Mars. A Mars arrival within 72 hours appears in the status band.
- **Archived DONKI records.** Real records from 2024-05-08 to 2024-05-16 (the May 2024 solar storm) are bundled for offline use and labelled ARCHIVED 2024.
- **NASA JPL Solar System Dynamics, *Approximate Positions of the Planets*** (Keplerian elements). Used to compute the Earth–Mars distance and signal delay in the browser.

**NASA resources cited for context:**

- **NASA HRP: 5 Hazards of Human Spaceflight.** Organises the app: the Overview maps each hazard (space radiation, isolation and confinement, distance from Earth, gravity fields, hostile and closed environments) to the body systems it affects and to what ASTRA-MED watches or does, and each body system's panel names its hazards with a link. The mapping is ours, not a NASA table.
- **NASA HRP: Risks of Human Spaceflight** (index). Listed in Data sources as the entry point for the individual risk pages below.
- **NASA Human Research Program risk pages.** Each is shown as context, not validation, on the relevant recommendations:
  - Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)
  - Risk from Inadequate Sleep and Irregular Schedules
  - Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness
- **MSL/RAD cruise measurement** (Zeitlin et al., *Science* 340:1080–1084, 2013) and the JPL summary. Used only to set a plausible level, about 1.8 mSv per day, for the synthetic dosimeter.
- **NASA Orion radiation protection plan** and **NASA Science Artemis II space-weather page.** Context for the shelter step in the radiation sequence.
- **Reviewed for background, not used by any rule:** HRP Spaceflight Standard Measures (NASA Life Sciences Portal), the NASA Life Sciences Portal, NASA OSDR studies OSD-817, OSD-987, OSD-989 and OSD-1018, and NASA-STD-3001 Vol. 2 §4.0.

**What is not NASA data:**

- **Health readings are synthetic.** They come from a seeded model and are labelled SYNTHETIC. They are not real astronaut data.
- **Thresholds are prototype demonstration values**, each tagged `supplied-prototype` or `astra-assumption`. They are not NASA flight rules or validated clinical standards.
- **Scenario C** (solar particle event) and its dosimeter readings are a labelled SCENARIO SIMULATION.

## Space Agency Partner Data and Other References

**Space agency partner resources used (Canadian Space Agency):**

- **CSA: *Monitoring Radiation for Astronaut Health*** (2026-02-26). Cited in the space-weather monitor and the Overview: neutrons are about 30% of ISS radiation and CSA is developing CANS, a continuous on-board neutron monitor. It supports the app's rule that personal exposure comes from on-board dosimetry, never from space-weather alerts.
- **CSA: *How does radiation affect the human body in space?*** Supports treating a large solar particle event as the case that needs shelter (Scenario C).
- **CSA: *Why Do We Conduct Science Experiments in Space?*** Its list of deep-space risks (more weightlessness, radiation, isolation, communication delay, less reliance on Earth) frames on-board self-assessment and the Earth–Mars signal delay.

**Listed by the challenge but not yet used:**

- NASA HRP: *Ongoing HRP Research in Space*.

**Other references and tools:**

- React, React DOM, Vite, TypeScript, Tailwind CSS, PostCSS, Autoprefixer, Recharts, Lucide React, Vitest, ESLint and typescript-eslint, all open source. Full list in `package.json`.
- Barlow, Barlow Semi Condensed and IBM Plex Mono fonts via Fontsource (SIL Open Font License).
- Mulberry32 pseudo-random generator (a widely published small algorithm) for seeded telemetry.
- Full source audit: `DATA_SOURCES.md`; references in `src/data/sources.ts`.
- [Any design reference the team used, with link.]

---

## Creativity

- **Trend watch.** Most monitors alarm when a value crosses a line. ASTRA-MED projects a steady drift and warns about a week ahead, without changing the status or calling it a diagnosis.
- **Space weather for a Mars crew, not for Earth.** WSA-ENLIL forecasts show when a solar storm reaches Mars, which matters to a crew in transit, and the status band shows today's real signal delay.
- **Hazard is not dose.** The app keeps the environment (what space weather says) separate from exposure (what the dosimeter records) and gives a step-by-step protective sequence for each hazard level.
- **Every recommendation can show its rule and where the rule came from.** The crew can see why the app is asking for something.
- **Mission replay.** A 180-day track with one status tick per day lets a crew member or reviewer scrub through the mission and see when and why things changed.

## Considerations and limitations

- All health readings are synthetic or entered by hand. There is no device, sensor or camera integration.
- Thresholds are prototype assumptions with no scientific source cited; a real deployment would need every value and escalation rule approved by aerospace-medicine staff.
- No camera or image input yet, and no ultrasound support.
- One mission profile (Mars transit) and one crew member. Station, rover and planetary-base environments are not modelled.
- Live DONKI data describes near-Earth space weather, and ENLIL reports planets, not a spacecraft. Mars stands in for a crew in transit.
- The scenario C dose overlay is illustrative. Real particle-event doses depend on spectrum, shielding and location.
- `localStorage` is not encrypted and is not a medical record store.
- There is no export of records for the flight surgeon yet.
- The app does not diagnose, prescribe or replace mission-approved procedures or medical personnel.

---

## Demo outline

The submitted demo must be a video of **30 seconds or less** (English, or
English subtitles) or a deck of **7 slides or fewer**. Over the limit, the
project is not eligible for Global Judging. The full three-act walkthrough
for live judging is in [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

### 30-second video (structure from the submission guide)

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:02 | Team name card | "[Team name], NASA Space Apps 2026." |
| 0:02–0:05 | Status band showing the Earth–Mars delay | "On the way to Mars, a health question can take most of an hour to answer." |
| 0:05–0:10 | Title over the console | "ASTRA-MED: crew health, checked on board, fully offline." |
| 0:10–0:20 | Scenario B: body map, then the trend watch card on day 104, then day 112 turning CAUTION | "Tap a body system to see its status and next step. Here it spots a heart-rate drift eight days before the alarm." |
| 0:20–0:30 | Space-weather panel, ENLIL Mars forecast and the "not personal dose" note | "Live NASA space-weather data warns of solar storms at Mars. Next: real sensors and flight-surgeon review." |

Show the DEMO DATA chip on screen once, so viewers know the readings are
synthetic.

### 7-slide alternative

1. **Title.** ASTRA-MED, team name, team members, the challenge.
2. **Problem.** Signal delay to Mars; crews must assess their own health.
3. **Solution.** A screenshot of the console: status band, body map, next action.
4. **User experience.** Scenario B trend watch: warned eight days before CAUTION.
5. **NASA data.** DONKI events, the ENLIL Mars forecast, JPL light-time; hazard is not dose.
6. **Trust and safety.** SYNTHETIC labels, prototype thresholds, "Why this step?", offline, private.
7. **Future.** Real sensor input, more mission environments, flight-surgeon handoff, validated thresholds.
