# ASTRA-MED: judging scorecard

Review date: 2026-11-14 (submission closes Sunday 2026-11-15, 23:59 local
event time). Reviewed at commit `a8f7710`. No source code was changed for this
review.

## 1. The rubric as published

Source: NASA Space Apps *Judging & Awards Guide*,
https://www.spaceappschallenge.org/resources/judging-awards-guide/ (fetched
2026-11-14 with curl; the page was dated November 13, 2026). Submission fields
and demo rules come from the linked *Project Submission Guide*,
https://www.spaceappschallenge.org/resources/project-submission-guide/.

**Scale.** At every level of judging (local, universal, global, executive) a
project is scored from 1 to 5 in each of five criteria. The guide
gives no weights, so the five are treated as equal. Only the score of 5 is
described for each criterion.

| Criterion | What it asks (paraphrased; short quotes only) |
| --- | --- |
| **Impact** | How big a problem the project addresses and how many people it could help or inspire. A 5 tackles a significant problem with wide reach and benefit. |
| **Creativity** | Originality: a new concept, or a meaningful improvement on existing ideas, with a fresh perspective or inventive execution. |
| **Validity** | Grounded in scientific principles, technically and logically feasible, able to work in real-world use. Completeness, usability and user-friendliness count. |
| **Relevance** | Fully and directly addresses the chosen challenge, and integrates NASA data as a core part of the solution, not a superficial add-on. |
| **Presentation** | How clearly the team conveys the challenge, solution and significance. Judges score it from the demo and the full project. The guide asks teams to give it equal attention. |

**Judging phases.** Local or Universal judges pick Global Nominees (announced
2026-12-03); expert judges pick Global Finalists and Honorable Mentions
(2026-12-17); a NASA and partner-agency executive committee picks Global
Winners (2027-01-26).

**Ten Global Awards.** Best Use of Science, Best Use of Data, Best Use of
Technology, Galactic Impact, Best Mission Concept, Most Inspirational, Best
Storytelling, Global Connection, Art & Technology, Local Impact.

**Eligibility and submission requirements that affect judging.**

- Respond to an official challenge; all members registered for the same event; 1–6 members (Universal Event: at least 2).
- Complete every required field: Project Name, High-Level Project Summary, Link to Project Demo, Link to Final Project, Detailed Project Description, Use of Super Intelligence (SI), NASA Data, Space Agency Partner Data and Other References.
- **Demo: a video of 30 seconds or less, or a slide deck of at most 7 slides including title and intro.** Projects over these limits are not eligible for Global Judging. Hosted publicly with no login.
- English on the submission page and linked material (a video may be spoken in another language with English subtitles).
- To be eligible for a Global Award, use at least one NASA data source or resource.
- Partner-agency data is strongly encouraged (2026 partners include CSA, ESA, JAXA, ISRO, UK Space Agency and others).
- List every external resource (code, text, images) in References; no copyrighted material without permission.
- Disclose SI (AI) use. Code and data produced with SI must be acknowledged in descriptive text and metadata; SI-generated images and video need a visible watermark. SI must not be used to come up with the idea for solving the challenge. Generated content must not use NASA branding.
- No images, video or audio of anyone under 18.

## 2. State of the build

`npm run check` on 2026-11-14: typecheck **pass**, lint **pass**, tests
**9 failed, 70 passed (79)**. All nine failures are in
`src/services/nasaDonkiApi.test.ts`. The tests assume `DEMO_KEY`, so they
expect the CCMC host to be tried first. With a personal key present in the
local environment file, `hostOrder` puts api.nasa.gov first. Rerunning with
`VITE_NASA_API_KEY=DEMO_KEY npx vitest run` gives **79 of 79 passed**. The
app's behaviour is correct; the tests are not hermetic. A judge who clones the
repo without a key will see 79 passes. README.md still says "67 unit tests".

## 3. Scores per criterion

Scores use the rubric's own 1–5 scale. They are an honest reviewer estimate
of how a local or global judge would score the project **as it stands today**,
not a prediction of results.

### Impact: 3 / 5

**Evidence.**
- Targets a real constraint of deep-space missions: Earth–Mars signal delay of 3–22 minutes each way, so the crew must triage routine health questions on board. The status band shows today's delay, computed from JPL elements (`src/engine/lightTime.ts`).
- Works with no network, no account and no backend (`public/sw.js`, `src/services/storageService.ts`). Health data never leaves the browser.
- Reads in one place: overall status, the body system to watch and the single next action (`src/components/console/StatusLine.tsx`).
- Trend watch warns about a drift before any threshold fires: in scenario B it flags heart rate on day 104, eight days before CAUTION on day 112 (`src/engine/trendEngine.ts`).

**Gaps.**
- The audience is small (deep-space crews) and the submission does not yet make the case for wider reach: analog habitats, Antarctic stations, remote clinics, ISS crew self-checks.
- No validation with any user, astronaut, flight surgeon or analog crew.
- One crew member, one mission profile.
- No record handoff to the flight surgeon. Guidance says "record the readings for the flight surgeon", but there is no export or report to send when communication returns.

### Creativity: 3 / 5

**Evidence.**
- Trend watch: a 7-day least-squares projection that warns ahead of the alarm and never changes a status (`src/engine/trendEngine.ts`).
- Mars CME arrival forecast from NASA CCMC WSA-ENLIL runs, surfaced in the status band when a storm is due within 72 h (`src/services/enlilForecast.ts`).
- A strict split between environmental hazard and personal dose, with a phased WATCH → WARNING → ALL CLEAR protective sequence (`src/data/scenarioHazards.ts`, `src/engine/advisoryEngine.ts`).
- Every recommendation shows its rule and provenance ("Why this step?", `src/engine/basis.ts`, `src/components/shared/BasisLine.tsx`).
- 180-day mission replay track with one status tick per day (`src/components/MissionTrack.tsx`).

**Gaps.**
- The core form (vitals cards, a body map, trend charts, a checklist with XP) is what many teams submitting to this challenge will build. The distinctive parts (trend watch, ENLIL at Mars, light-time, hazard-not-dose) need to lead the demo, or judges will not see them.
- No camera or image input, which the challenge names explicitly.
- No mission-environment variation (station, rover, lunar or Mars base).
- Gamification is light: XP and a streak, with no goals, levels or crew comparison.

### Validity: 3 / 5 (close to 4)

**Evidence.**
- Pure, unit-tested engines (`src/engine/*.test.ts`, `src/state/missionStore.test.ts`, `src/utils/dates.test.ts`); strict TypeScript; validated storage; corrupt-data recovery.
- Offline operation verified in real Chrome with the server stopped (`docs/QA_REPORT.md` §6–7).
- Honest data handling. Synthetic values are labelled SYNTHETIC; LIVE means a successful response this session; DONKI never becomes a dose (`DATA_SOURCES.md`).
- Every threshold carries a provenance tag (`src/config/thresholds.ts`).
- The synthetic dose level is cross-checked against MSL/RAD cruise data (Zeitlin et al. 2013, about 1.8 mSv/day).
- Usable by non-physicians: self-check steps, the device needed and plain-language next steps per system and indicator (`src/data/bodySystems.ts`, `src/data/metricGuidance.ts`). Includes an 8-step tour and a responsive layout down to 375 px.

**Gaps.** An expert judge will spot these first.
- **No threshold has a scientific source.** `DATA_SOURCES.md` §4 says so plainly: values are `supplied-prototype` (from a table that cites nothing) or `astra-assumption`. Some ranges could be anchored to published references that already exist, which would lift this score.
- **All health data is synthetic**; there is no device or file import (the `"import"` and `"api"` source types in `src/types/health.ts` are unused).
- No scenario reaches CRITICAL. That path is reachable only by logging a value by hand and is never shown in the demo.
- The test suite fails in an environment with a personal API key (section 2).
- Accessibility is designed in (text and icon on every status, keyboard hotspots, focus rings, `aria-live`, reduced motion), but there is no recorded screen-reader pass or contrast audit.

### Relevance: 3 / 5

**Evidence (challenge fit).** Strong. Most objectives and optional
considerations are met (section 4): a clickable body figure with per-system
status, the six example indicators plus ARED, radiation, PVT, hydration and a
symptom check, colour coding with text and icons, dynamic charts, routine
prompts and gamification.

**Evidence (NASA data).**
- Live NASA DONKI FLR, SEP, CME and notifications from the CCMC DONKI API and api.nasa.gov (`src/services/nasaDonkiApi.ts`).
- WSA-ENLIL model runs (`src/services/enlilForecast.ts`).
- A bundled real DONKI archive of the May 2024 storm (`src/data/generated/donki-fallback.json`).
- JPL approximate planet positions (`src/engine/lightTime.ts`).
- MSL/RAD dose level.
- NASA HRP risk pages cited as context (`src/data/sources.ts`).

**Gaps.**
- NASA data drives only one of the five systems (radiation and space weather). The health side uses no NASA dataset. HRP pages are cited as context only, and the OSDR studies were reviewed but no rule uses them.
- **The five HRP hazards are not cited anywhere** in `src/`, `README.md`, `DATA_SOURCES.md` or `docs/`. Searches for "hazards of human", "RIDGE", "isolation and confinement", "distance from Earth", "hostile", "gravity field" and "closed environment" found nothing, apart from one sentence of mood guidance ("Isolation, confinement, distance from home and workload...", `src/engine/diagnosticEngine.ts:370`, `src/data/metricGuidance.ts:165`) that is not linked to the HRP page.
- **"Risks of Human Spaceflight":** partly covered. Three individual HRP risk pages are cited in `src/data/sources.ts`: SANS; inadequate sleep and irregular schedules; reduced cardiorespiratory and musculoskeletal fitness. The risk index page itself is not cited, and neither are the radiation risk pages.
- **"Ongoing HRP Research in Space":** not cited.
- **CSA resources are not used.** There is no mention of CSA, ASC-CSA, "Monitoring Radiation for Astronaut Health" or "Why Do We Conduct Science Experiments in Space?" anywhere in the repo. No other partner-agency resource is used either.
- `DATA_SOURCES.md` does not yet document the ENLIL forecast or the JPL light-time computation. They appear only in `docs/QA_REPORT.md` §9 and `src/data/sources.ts`.

### Presentation: 2 / 5 (today); 4 is within reach

**Evidence.**
- A clear three-act script (`docs/DEMO_SCRIPT.md`) with deep links, recovery steps and words to avoid.
- 16 QA screenshots (`docs/qa/`).
- An in-app Overview that opens with what is simulated and what is real, and a guided tour.
- A public GitHub repo (`origin` returns HTTP 200).

**Gaps.**
- **No compliant demo exists.** The script runs three minutes. The rule is a video of 30 seconds or less, or at most 7 slides, and exceeding it makes the project ineligible for Global Judging. This is the biggest risk in the submission.
- No hosted build. Judges must clone the repo and run `npm install`, which most will not do. "Link to Final Project" should be a working URL.
- No submission text has been written yet (draft in `docs/SUBMISSION_DRAFT.md`).
- The story leans on engineering vocabulary (engines, provenance, rule trace). A no-context judge needs the astronaut's problem first.

| Criterion | Score (1–5) | Realistic after the top fixes |
| --- | --- | --- |
| Impact | 3 | 3–4 |
| Creativity | 3 | 4 |
| Validity | 3 | 4 |
| Relevance | 3 | 4 |
| Presentation | 2 | 4 |

## 4. Challenge objectives and considerations

| Challenge item | Status | Evidence / gap |
| --- | --- | --- |
| Software that gathers health indicators | Covered | 8 required + 3 supplementary indicators; manual logging with validation (`src/components/MeasurementForm.tsx`, `src/state/missionStore.ts`). Gathering is by keyboard only; no device or file import. |
| Lets astronauts evaluate and act on their health | Covered | Status band with one next action, guidance drawer (what changed, why it matters in space, what to do), follow-ups (`src/engine/protocolEngine.ts`, `src/components/GuidanceDrawer.tsx`) |
| Visual tool for self-assessment during missions | Covered | Console, body map, vitals with range gauges and sparklines |
| Guidance on treatments and health improvements | Partial (by design) | Countermeasures (ARED, hydration, sleep, PVT), protective steps and "review the mission-approved protocol". It does not suggest treatment or medication, a deliberate safety rule (CLAUDE.md rule 5). Say so in the submission so judges read it as a choice, not a gap. |
| Input by keyboard and mouse | Covered | Log form, task checkboxes, body map, day track |
| Input by camera images | **Missing** | No camera, image or file input anywhere |
| Any data type for an indicator (e.g. mg/dL, ultrasound images) | Partial | Numeric, blood-pressure pair, 1–5 mood scale, symptom booleans, glucose context. No images. |
| NASA HRP: 5 Hazards of Human Spaceflight | **Missing** | Not cited or mapped anywhere (section 3, Relevance) |
| NASA HRP: Risks of Human Spaceflight | Partial | 3 risk pages cited in `src/data/sources.ts` and shown as "context only" on basis lines. No radiation risk page; no risk index. |
| NASA HRP: Ongoing HRP Research in Space | **Missing** | Not cited |
| CSA: Monitoring Radiation for Astronaut Health | **Missing** | Not cited; the radiation story uses MSL/RAD, Orion and Artemis II pages instead |
| CSA: Why Do We Conduct Science Experiments in Space? | **Missing** | Not cited |
| Which measurements can be performed in space | Covered | `relevantMeasurements` and `deviceRequired` per system (`src/data/bodySystems.ts`) |
| Why an exam is needed | Covered | `whyItMatters` and `inSpace` per system; "why it matters" per indicator (`src/data/metricGuidance.ts`) |
| How hazards affect indicators | Partial | Microgravity effects in system text; scenario C links the radiation hazard to four systems. Not organised by the five hazards. |
| When a result warrants crew or flight-surgeon attention | Covered | CAUTION / CRITICAL rules with persistence and staleness; next steps say "contact the medical officer when communication is available". No CRITICAL scenario in the demo; no export for the flight surgeon. |
| Actions that prevent a critical condition | Covered | Daily countermeasures, missed-task prompts, trend watch, SEP shelter sequence |
| UI: animations, interactivity | Covered | Transitions with motion tokens, hover and focus states, spotlight tour, 180-day scrubber |
| Clickable human figure with per-part status | Covered | SVG body plate, 5 keyboard-accessible hotspots with glyph, colour and word (`src/components/bodymap/BodyPlate.tsx`) |
| Optional: different environments (spacecraft, station, rover, planetary base) | **Missing** | One profile: Mars transit (ARES TRANSIT). Light-time is Earth–Mars only. |
| Optional: prompting measurements and actions as routine | Covered | Daily task list, PVT every third day, staleness raises CAUTION, missed-task prompts |
| Optional: gamification | Covered (light) | XP once per task per day, streak, readiness score with breakdown (`src/components/CountermeasureGamification.tsx`, `src/engine/readinessEngine.ts`) |
| Optional: dynamic charts over time | Covered | 7 Recharts views, 7/30/90/180-day windows, reference bands, CAUTION periods, event annotations, text summaries |
| Optional: colour coding | Covered | NOMINAL / CAUTION / CRITICAL colours, always with text and icon |
| Optional: simple instructions; do not assume medical knowledge | Covered | Self-check steps per system, measurement steps per indicator, plain language, onboarding tour |
| Example indicators: BP, HR, blood sugar, temperature, sleep, mood | Covered | All six present |

## 5. Top 8 improvements, in priority order

1. **Make a compliant demo: a 30-second video or a deck of at most 7 slides.**
   *Criterion:* Presentation; also eligibility.
   *Why:* a three-minute demo makes the project ineligible for Global Judging, and the demo carries the Presentation score.
   *Change:* cut `docs/DEMO_SCRIPT.md` to its strongest beat, the scenario B trend watch that warns eight days early, plus one shot of live space weather. Follow the guide's 0:00 / 0:02 / 0:05 / 0:10 / 0:20 structure. Show team names and the challenge, add English subtitles, host it publicly. Watermark any AI-generated imagery.
   *Effort:* S–M.

2. **Host a public build and use it as the Final Project link.**
   *Criterion:* Presentation, Validity.
   *Why:* judges rarely clone and build; a working URL lets them try the body map and trend watch themselves.
   *Change:* deploy `dist/` (GitHub Pages, Netlify or Vercel). Check that the service worker and the CCMC calls work there, and that deep links `?scenario=…&day=…#overview` resolve. Optionally request FortiGuard classification as the guide suggests.
   *Effort:* S.

3. **Map every body system and indicator to the five HRP hazards, and cite the page.**
   *Criterion:* Relevance, Validity.
   *Why:* it is the first resource the challenge lists and it is absent. The mapping also answers the challenge question "how hazards affect indicators".
   *Change:* add a hazard field per system in `src/data/bodySystems.ts` and a hazard line in `SystemIntelPanel`. Add the HRP 5 Hazards, Risks index and radiation risk pages to `src/data/sources.ts`, plus a short "Five hazards" table in the Overview and `DATA_SOURCES.md`. Mapping: radiation → immune and radiation; isolation and confinement → mood and sleep; distance from Earth → light-time and autonomy; gravity fields → cardiovascular, musculoskeletal, neuro-ocular; hostile and closed environment → hydration, temperature, symptoms. Verify each page before citing it.
   *Effort:* S.

4. **Use the CSA radiation resource and the other listed HRP and CSA resources.**
   *Criterion:* Relevance.
   *Why:* partner data is strongly encouraged and the executive judges include partner agencies; today the project uses none.
   *Change:* read CSA *Monitoring Radiation for Astronaut Health*, cite it in `src/data/sources.ts`, the Space Weather panel and the immune and radiation system text where it fits (for example, why personal dosimetry matters). Add *Ongoing HRP Research in Space* and CSA *Why Do We Conduct Science Experiments in Space?* as context for the self-check routine. Cite only what the pages actually say.
   *Effort:* S.

5. **Ground the thresholds where a published reference exists.**
   *Criterion:* Validity (scientific grounding).
   *Why:* "no scientific source cited" on every rule is the weakest point for an expert judge.
   *Change:* in `src/config/thresholds.ts`, add a `reference` to each band that can be anchored. Candidates: blood-pressure categories from a published clinical guideline; NASA-STD-3001 Vol. 1 crew health and radiation exposure standards as context for a cumulative-dose display; HRP sleep guidance. Keep the provenance tags, keep the "not flight rules" wording, update `DATA_SOURCES.md` §4 and the tests.
   *Effort:* M.

6. **Add a mission-environment selector: transit, ISS / station, lunar surface or rover, Mars base.**
   *Criterion:* Relevance (optional consideration), Creativity, Impact.
   *Why:* it is named in the challenge and visibly widens who the tool serves.
   *Change:* a `MissionEnvironment` config in `src/config` and `src/data` that sets the light-time source (constant for ISS and the Moon, JPL for Mars), the radiation baseline, gravity notes per system, task set and EVA or rover checks. Select it beside the scenario selector, derive everything in the engines, and add tests.
   *Effort:* M–L.

7. **Flight-surgeon handoff report and a CRITICAL path in the demo.**
   *Criterion:* Impact, Validity.
   *Why:* the guidance tells the crew to "record readings for the flight surgeon", but there is nothing to send. A judge never sees CRITICAL behaviour.
   *Change:* a "Prepare report for the comms window" action that builds a local summary of status, out-of-range readings with rule and provenance, follow-ups done, and hazard and dosimeter entries. Generate it on device as a file download (JSON plus readable text) with nothing sent anywhere. Add a short scripted step that logs a value crossing a critical limit.
   *Effort:* M.

8. **Camera or image input for one indicator.**
   *Criterion:* Relevance, Creativity.
   *Why:* the challenge names camera images and ultrasound as inputs; the app has none.
   *Change:* the smallest honest version attaches a photo, taken with the camera, to a log entry (vision-check card, device display, skin or eye photo). Store it locally in IndexedDB, label it, and use no analysis. Keep it under the existing storage and privacy rules; the image never leaves the device.
   *Effort:* M.

**Quick fixes outside the top eight (each S).**
- Make `src/services/nasaDonkiApi.test.ts` independent of the local key: stub `VITE_NASA_API_KEY` or pass the key explicitly.
- Update the README test count (67 → 79).
- Add ENLIL and JPL light-time to `DATA_SOURCES.md`.
- Add an SI-use statement to the README.

## 6. Weaknesses judges may raise, and how to answer them

| Likely objection | Honest answer to give |
| --- | --- |
| "The health data is fake." | Yes, and it is labelled SYNTHETIC everywhere. Individual astronaut health records are not openly available, so the demo uses a seeded synthetic model; manual entries work end to end. |
| "These thresholds are made up." | They are prototype values with provenance tags. None is a NASA flight rule, and a real deployment would need flight-surgeon review. (Improvement 5 narrows this gap.) |
| "Where are the challenge's HRP and CSA resources?" | Today only three HRP risk pages are used. Fix with improvements 3 and 4 before submitting. |
| "Space weather isn't astronaut health." | It is the environmental side of the radiation hazard; the app never converts it into a dose, and a separate dosimeter drives the radiation status. |
| "Why no treatment advice?" | It is deliberate: the app does not diagnose or prescribe, and points to the mission-approved protocol and the medical officer. |
| "Does it work on a phone and offline?" | Yes, from 375 px wide, and offline after the first load (service worker verified in Chrome). |


## Changes made after this review (2026-11-14)

| Improvement | Status |
| --- | --- |
| 1. 30-second video or 7-slide deck | Not done. Outline in `docs/SUBMISSION_DRAFT.md`. |
| 2. Public hosted build | `.github/workflows/pages.yml` deploys to https://domer8090.github.io/ASTRA-MED/ once GitHub Pages (source: GitHub Actions) is enabled. Subpath build verified locally. |
| 3. Five HRP hazards | Done. `src/data/spaceflightHazards.ts`; Overview table; hazard line with link in each system panel. |
| 4. CSA and other listed resources | Done for the HRP hazards and risks index and three CSA pages (`src/data/sources.ts`, space-weather monitor, Overview). *Ongoing HRP Research in Space* is still unused. |
| 5. Thresholds anchored to published references | Not done. |
| 6. Mission-environment selector | Not done. |
| 7. Flight-surgeon report and a CRITICAL case | Done. On-device report (`src/engine/reportEngine.ts`, "Report for flight surgeon" in the status band). Demo script shows CRITICAL by logging 110 bpm. |
| 8. Camera photo on a log entry | Not done. |
| Small fixes | DONKI tests now pin `DEMO_KEY` (all pass with a personal key in `.env.local`); README test count removed; `DATA_SOURCES.md` §3c added. |
