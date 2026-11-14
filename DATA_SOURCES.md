# ASTRA-MED data sources audit

Audit date: 2026-11-14. Updated after the final hardening pass (same day). Scope: every value the console displays, where it comes
from, how it is classified, and how it becomes a status, alert, readiness score
or countermeasure recommendation.

## Summary

| Class | What it covers | Label in the UI |
| --- | --- | --- |
| **Synthetic telemetry** | All eight health indicators, plus PVT, hydration and the symptom check. Generated in code by a seeded pseudo-random model. | `SYNTHETIC` |
| **User-entered** | Manual measurements logged on this device. Stored in `localStorage`. | `MANUAL` |
| **Live space-weather observations** | NASA DONKI records received in a successful response during the current browser session. | `LIVE` (all four types) or `PARTIAL LIVE` |
| **Cached space-weather observations** | DONKI records received in an earlier session, read back from `localStorage`, per event type. | `CACHED` |
| **Historical archive** | Real DONKI records from 2024-05-08 to 2024-05-16, bundled for offline use. | `ARCHIVED` (offline fallback) |
| **Feed unavailable** | Offline, or every request failed this session. Data shown keeps its own `CACHED` or `ARCHIVED` tag. | `UNAVAILABLE` |
| **Scenario simulation** | Scenario C: hazard phases on mission days 130–134 and a documented synthetic dosimeter overlay on days 131–133. | `SCENARIO SIMULATION` |
| **Research references** | NASA HRP pages, OSDR studies, MSL/RAD paper. Cited for context only; no data is loaded from them. | Data Sources view |

No astronaut health data comes from any external API. Nothing in the health
pipeline is real astronaut telemetry.

## 1. Health indicators

All synthetic values come from `src/data/missionTelemetry.ts`. The generator
is code, not a JSON file: `mulberry32` seeded by `hashSeed("astra-med:<metric>")`
feeds a first-order autoregressive (AR(1)) noise series per metric, so every load
produces the same 180 days. Scenario B and C apply deterministic overlays on top
of the shared base series. The output is cached in memory per scenario and never
stored.

`src/services/telemetryService.ts` (`buildEffectiveDays`) merges those values
with manual entries from `localStorage` key `astra-med:v1:measurements`. For a
given day and metric, the newest manual entry replaces the synthetic value.
Earlier entries are kept in history.

| Metric | Actual source | File | Update frequency | Classification | Scientific reference | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| Resting heart rate (bpm) | Seeded AR(1) model: 60.5 − 2.5 × early-adaptation term + noise (σ 1.5) + 1.6 bpm per hour of sleep deficit. Scenario B adds up to +31.5 bpm, days 96–146. | `src/data/missionTelemetry.ts` | One synthetic reading per mission day (morning vitals, 06:40–07:15 ship time UTC) | Synthetic, or manual if logged | None. Shape chosen to look plausible. | Not physiological modelling. No circadian variation within a day. |
| Blood pressure (mmHg) | Seeded AR(1): systolic 117 − 5 × adaptation + noise; diastolic 75 − 3 × adaptation, partly correlated with systolic. Scenario B adds up to +27 / +15.5. | same | Daily, with heart rate | Synthetic or manual | None | No posture or orthostatic data. |
| Blood glucose (mg/dL) | Seeded AR(1) around 88, clamped to 76–104, +2.2 per hour of sleep deficit. Day 63 is fixed at 113 and tagged post-meal. | same | Daily | Synthetic or manual | None | Every synthetic value is treated as fasting except day 63. |
| Body temperature (°C) | 36.85 + slow rise of up to 0.22 °C by day 90 + noise, clamped to 36.6–37.4. | same | Daily | Synthetic or manual | None cited | Measurement site is not modelled. |
| Daily sleep (h) | 6.55 + noise, floored at 6.0 on normal nights. Days 27–28 fixed at 5.4 and 5.6. Scenario C fixes days 131–132 at 5.2 and 5.6. | same | Daily, stamped at wake time | Synthetic or manual | Context only: NASA HRP sleep risk page | No sleep staging or actigraphy. |
| Mood (1–5) | 4.25 + noise − 0.28 dip centred on day 112 − 0.35 per hour of sleep deficit, clamped 3.5–5. | same | Daily, evening | Synthetic or manual | None | The mid-mission dip is illustrative, not a claim about "third-quarter" effects. |
| ARED exercise (min) | Seeded roll: 86% of days 60 min, 12% 65 min, 2% 55 min. Days 51, 88 and 141 fixed at 25, 45 and 0 min. | same | Daily, afternoon | Synthetic or manual | Context only: NASA HRP fitness risk page | Minutes describe adherence. They are not a measure of bone or muscle. |
| Cumulative radiation (mSv) | Daily dose 1.80 + 0.05 × sin(2π·day/27) + noise, rounded to 0.01. Cumulative is the running sum. Scenario C adds a documented synthetic SEP overlay of 6.4, 2.8 and 0.9 mSv on days 131–133 (model in `src/data/scenarioHazards.ts`, section 3a). A manual dosimeter reading rebases the cumulative curve from that day forward. | same + `telemetryService.ts` | Daily, end of day | Synthetic or manual | Level cross-checked against the MSL/RAD cruise measurement of about 1.8 mSv/day (Zeitlin et al., *Science* 340:1080–1084, 2013, doi:10.1126/science.1235989; JPL summary). 180 days gives about 324 mSv, close to the 330 mSv RAD measured over its six-month cruise. | Synthetic or manual | The synthetic dosimeter is a demo signal. DONKI events never add to it. No particle-type or shielding model. |
| PVT reaction time (ms) | 246 + noise + 14 ms per hour of sleep deficit | same | Every third day (days 1, 4, 7, …) | Synthetic or manual | None | The baseline is the median of days 1–14. |
| Hydration (L) | 2.45 + noise, clamped 2.05–3.1 | same | Daily, evening | Synthetic or manual | None | Uses a demo plan target of 2.0 L. |
| Neuro-ocular symptom check | All symptoms false | same | Day 1, then every 7 days | Synthetic or manual | Context only: NASA HRP SANS risk page | A self-check cannot diagnose SANS. |

### Derived values shown with the indicators

| Display | Computed in | From |
| --- | --- | --- |
| Change vs previous reading | `formatDelta` (`src/utils/formatting.ts`) | The latest effective reading and the one before it |
| 14-day sparkline | `sparkValues` (`src/services/chartSeries.ts`) | Effective readings. Radiation uses daily dose. |
| Range gauge | `gaugeTracks` (`src/engine/gauges.ts`) | Configured thresholds |
| Reading timestamp | `missionDayToIso`, `formatReadingStamp` (`src/utils/dates.ts`) | Mission epoch (fictional, 2026-05-04 00:00 UTC) plus mission day and ship time. Shown as `D042 06:41` for synthetic and manual readings alike. See section 3b. |
| Mission day track ticks | `evaluateMissionDays` (`src/engine/diagnosticEngine.ts`) | The rules engine run on all 180 days |

## 2. Countermeasure history

| Value | Source | Classification |
| --- | --- | --- |
| Task completion before the scenario's story day | `seededCompletion` in `src/engine/readinessEngine.ts`. ARED and hydration tasks are marked complete when the effective reading meets the plan. Sleep log and PVT are complete when a reading exists. Other tasks use a seeded roll (95% adherence in A, 92% in B, 94% in C). | Synthetic history, labelled "Synthetic history" on each row |
| Task completion on the story day | Morning tasks (health check-in, sleep log) start complete; the rest start open | Synthetic starting state |
| User changes | `localStorage` key `astra-med:v1:countermeasures` | User-entered |
| Follow-up completions | `localStorage` key `astra-med:v1:readiness` | User-entered |
| XP, streak, daily completion | Derived from the above on every render | Mixed synthetic and user data |

## 3. Space weather (NASA DONKI)

### Endpoints

Implemented in `src/services/nasaDonkiApi.ts`. Each type is requested independently and tries two hosts in order.

| Type | CCMC DONKI API (documented base) | api.nasa.gov |
| --- | --- | --- |
| Solar flares | `GET https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?startDate=…&endDate=…` | `GET https://api.nasa.gov/DONKI/FLR?startDate=…&endDate=…&api_key=…` |
| Solar energetic particles | `…/DONKI-API/get/SEP?…` | `…/DONKI/SEP?…` |
| Coronal mass ejections | `…/DONKI-API/get/CME?…` | `…/DONKI/CME?…` |
| Notifications | `…/DONKI-API/get/notifications?…&type=all` | `…/DONKI/notifications?…&type=all&api_key=…` |

- **Host order.** With `DEMO_KEY`, the CCMC DONKI API is tried first, because DEMO_KEY was exhausted (HTTP 429) during testing. With a personal `VITE_NASA_API_KEY`, api.nasa.gov is tried first. Each type falls back to the other host on its own.
- **Paths.** CCMC paths take no trailing slash; `/DONKI-API/get/FLR/` returns HTTP 404.
- **CORS.** The CCMC host sends `Access-Control-Allow-Origin: *` and needs no key. The key is sent only to api.nasa.gov.
- **Range.** Computed at request time: the last 30 days, ending today in UTC.
- **Requests.** Each request has a 12-second timeout. The four types run in parallel under `Promise.allSettled`. Only JSON arrays are accepted, and every timestamp is normalised to ISO 8601 UTC; unparseable times are dropped.
- **Privacy.** Only date ranges and the key are sent. No health data leaves the browser.

### Verification (2026-11-14)

`npm run donki:check` (`scripts/check-donki.mjs`) requests each type from each host independently. Output is saved in `docs/qa-donki-check.txt`:

| Type | CCMC DONKI API | api.nasa.gov (DEMO_KEY) |
| --- | --- | --- |
| FLR | HTTP 200, 13 records, 13/13 `beginTime` parse | HTTP 429 |
| SEP | HTTP 200, 0 records (quiet period) | HTTP 429 |
| CME | HTTP 200, 86 records, 86/86 `startTime` parse | HTTP 429 |
| notifications | HTTP 200, 32 records, 32/32 `messageIssueTime` parse | HTTP 429 |

**In the running app**, a refresh made four requests, all to `ccmc.gsfc.nasa.gov/DONKI-API/get/*`, and each returned HTTP 200. The feed table showed every type as `LIVE` from ccmc.gsfc.nasa.gov, and the top bar read "LIVE via CCMC DONKI API".

- **Offline:** when the browser was set offline, the label changed to `UNAVAILABLE`, showing cached data, and every row showed `CACHED`.
- **Reload:** after a reload, every type showed `CACHED` with "No request yet this session".

**Unit tests** cover each type for: success parsed with ISO timestamps; per-host fallback with HTTP status recorded; both hosts failing; an empty list; non-list JSON; malformed JSON; timeouts; and partial failure across types. They also cover cache migration (v1 to v2), re-labelling cached events, and the label rules.

### When requests run

| Trigger | Behaviour |
| --- | --- |
| Page load | No request is needed to render. Cached or archived data shows immediately. |
| Background refresh | 1.5 s after load, if the browser is online, the newest non-archived data is more than 30 minutes old, and no request was made in the last 10 minutes |
| Manual refresh | The Refresh button. Disabled while offline. At most once per 10 minutes, across reloads (`lastAttemptAt`). |
| Polling | None |

### Labels, cache and failure handling

Every event type is tracked on its own (`DonkiTypeState`): its data source, retrieval time, host, query range and the result of its last request.

| Overall label | Rule (`deriveMode` in `src/hooks/useSpaceWeather.tsx`) |
| --- | --- |
| `LIVE` | All four types were received in a successful response during this session, and the browser is online |
| `PARTIAL LIVE` | Some types are live this session; the others show cached or archived data |
| `CACHED` | No live data this session; at least one type shows data saved in an earlier session |
| `ARCHIVED` | Only the bundled 2024 archive is shown |
| `UNAVAILABLE` | The browser is offline, or every request in the latest refresh failed. Data shown keeps its own `CACHED` or `ARCHIVED` tag. |

- A type that fails keeps whatever it had (live from earlier in this session, cached or archived), and the failed request is shown in the feed table with each host's HTTP status or error.
- The cache (`astra-med:v1:donki-cache`, schema `version: 2`) stores one entry per type. Every event read back is re-labelled `cached`. The older single-snapshot format is migrated.
- `live` is never restored from storage. Going offline relabels this session's live events as `cached`.

### Bundled archive

`src/data/generated/donki-fallback.json` (also copied to `public/offline/donki-fallback.json`) was built by `scripts/build-donki-fallback.mjs` from CCMC. It covers 2024-05-08 to 2024-05-16, the May 2024 solar storm period: 22 flares of class M5 or above, 14 SEP events, 31 CMEs at 700 km/s or faster, and 60 notifications. These are real historical records, normalised by the same code as live responses and labelled `ARCHIVED 2024`.

## 3a. Scenario C: environmental hazard assessment

Defined in `src/data/scenarioHazards.ts` and evaluated by `src/engine/advisoryEngine.ts`.

| Mission day | Level | Phase |
| --- | --- | --- |
| 130 | WATCH | Precursor (simulated large flare reported) |
| 131 | WARNING | Onset and peak |
| 132 | WARNING | Elevated, declining |
| 133 | WATCH | Tail |
| 134 | ALL CLEAR | Post-event review |

- **Relationship to body systems:**
  - *Direct:* immune and radiation (radiation dose).
  - *Indirect:* neuro-ocular (sleep, PVT) and metabolic and circadian (hydration, sleep, mood).
  - *Operational:* musculoskeletal (ARED sessions deferred).
- **Protective actions by level:** each action is a trackable follow-up. Each carries a basis: the hazard level and phase, the `SCENARIO SIMULATION` provenance, and context where one exists. Context is the [NASA Orion radiation protection plan](https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/), which covers sheltering behind stowage mass, and the [NASA Artemis II space-weather page](https://science.nasa.gov/missions/artemis/artemis-2/to-protect-artemis-ii-astronauts-nasa-experts-keep-eyes-on-sun/). The wording is a prototype assumption, not a mission procedure.
- **Health status:** the hazard never changes health status and never creates a dose.
- **Dosimeter overlay model (explicit):** 10.1 mSv total, split 63%, 28% and 9% across days 131, 132 and 133 (6.4, 2.8 and 0.9 mSv). It is added to the synthetic baseline dose in scenario C only.
  - It is not derived from DONKI, from any flare class, or from a transport model.
  - Its size was chosen so day 131 exceeds the configured "more than 2× the 14-day median" rule.
  - Sleep on days 131 and 132 is set to 5.2 h and 5.6 h to represent time in shelter.
  - The model is shown in the Space Weather panel and in Data Sources.
- **Real-world DONKI:** a live or cached SEP that started within the last 72 h raises a WATCH for awareness only. Archived data never does.

## 3b. Mission day, MET and timestamps

- MET counts from the fictional mission epoch, 2026-05-04 00:00 UTC.
- **Mission day N** spans MET `(N−1)/00:00:00` to `(N−1)/23:59:59`. Ship time is UTC.
- **Readings** (synthetic and manual) store `recordedAt` = epoch + (N−1) days + ship time, and display as `D042 06:41`. Hovering the last-check stamp shows MET `041/06:41`.
- **Manual entries** take a mission day and a ship time (HH:MM, UTC). The real time the entry was typed is stored separately as `enteredAt` and shown only as an audit note.
- **The top-bar MET** is a replay clock. The day comes from the selected mission day and the time of day from the current UTC clock, so day 42 shows `041/HH:MM:SS`.
- **Real-world dates** (DONKI records, task completion marks, `enteredAt`) are shown as local calendar dates, never as MET.
- Tests (`src/utils/dates.test.ts`) confirm that every synthetic timestamp falls on its own mission day, that day boundaries line up with MET, and that the top-bar MET day count equals the selected day minus one.

### How space weather reaches health status

- DONKI never changes a dose value or a health status.
- A DONKI SEP event that started within the last 72 hours raises a WATCH-level
  awareness advisory. This applies only to live or cached data, never to the
  bundled archive.
- Scenario C's hazard assessment is separate and simulated (section 3a). The
  documented synthetic dosimeter overlay is what drives the radiation CAUTION.
- Live DONKI data describes the near-Earth environment, not the demo spacecraft.

## 3c. Forecasts and derived context added 2026-11-14

| Data | Source | How it is used | Label |
| --- | --- | --- | --- |
| CME arrival forecasts at Earth and Mars | NASA CCMC WSA-ENLIL runs via DONKI `WSAEnlilSimulations` (CCMC DONKI API first with DEMO_KEY; api.nasa.gov with a personal key), last 10 days | Forecast card in the space-weather monitor; status-band notice for a Mars arrival within 72 h. Latest model run per CME and location is kept. Cached as `astra-med:v1:enlil-cache`. Never sets a dose or status. | LIVE (this session), CACHED, or NOT LOADED |
| Earth–Mars one-way signal delay | NASA JPL SSD *Approximate Positions of the Planets*, Keplerian elements (Standish, valid 1800–2050), computed in the browser | Status band and Overview. Checked against the 2025-01-12 close approach (0.642 AU). | Computed, no network |
| Trend watch | ASTRA-MED engine (`src/engine/trendEngine.ts`), 7-day least-squares fit over the user's own readings | Early-warning projection for NOMINAL indicators that have left their reference band; never changes a status. Parameters in `TREND_WATCH`, tagged `astra-assumption`. | TREND WATCH |
| Five hazards of human spaceflight | NASA HRP, https://www.nasa.gov/hrp/hazards/ | Overview table and per-system hazard line. The hazard-to-system mapping is ASTRA-MED's own. | Reference |
| Partner agency radiation context | Canadian Space Agency: *Monitoring radiation for astronaut health* (2026-02-26), *How does radiation affect the human body in space?*, *Why do we conduct science experiments in space?* | Explains why personal exposure needs on-board dosimetry and why a large SEP calls for shelter. No CSA data is loaded. | Reference |

The flight-surgeon report (`src/engine/reportEngine.ts`) is built on the device from the same engine output. It is shown, copied or saved as a `.txt` file only when the crew chooses; nothing is transmitted.

## 4. Diagnostic thresholds

All thresholds live in `src/config/thresholds.ts`, each tagged with its
provenance. **None of them is sourced from peer-reviewed science or from a NASA
standard.**

| Provenance tag | Meaning | Rules |
| --- | --- | --- |
| `supplied-prototype` | Copied from the table in `PROMPT.md` §8.2. That table cites no source, and `PROMPT.md` itself calls the values prototype demonstration assumptions. | Heart rate, blood pressure, temperature (high), glucose, sleep (2+ days, < 4.5 h), mood |
| `astra-assumption` | Added by this build to fill gaps in that table. No source. | Temperature < 36.0 °C; one night of 4.5–4.9 h; ARED critical at 3+ missed sessions in 7 days; radiation "unusual daily increase" at > 2× the trailing 14-day median; PVT > 15% slower than baseline on 2 checks; hydration below plan for 2+ days; any reported symptom within 3 days; staleness windows; the 80% streak threshold |
| `mission-plan` | Demo plan targets that a real protocol would set per crew member. Editable in Settings. | ARED 60 min/day; hydration 2.0 L/day |
| Deliberately absent | No cumulative radiation limit. `missionExposureBudgetMsv` is `null`, so radiation can never reach CRITICAL from a cumulative value. | Radiation |

The only scientifically anchored number in the pipeline is the *level* of the
synthetic daily dose (MSL/RAD). It is not used as a threshold.

## 5. From raw value to recommendation

```
missionTelemetry.ts (seeded synthetic)      localStorage measurements (manual)
               \                              /
                buildEffectiveDays()  →  EffectiveDay[180]
                          |
     diagnosticEngine.evaluateMetric()  per metric, per day
       • the latest reading at or before the selected day
       • the rule from thresholds.ts gives a status and a RuleTrace with its provenance
       • persistence: consecutive days at the same status
       • staleness: a reading older than its window raises CAUTION
       → MetricDiagnostic {status, summary, explanation, recommendedNextStep, rules}
                          |
     ┌────────────────────┼──────────────────────┬──────────────────────────┐
aggregateStatus()  evaluateBodySystems()   evaluateMissionDays()   advisoryEngine
 overall status     5 systems: the worst    the day-track ticks     scenario + DONKI
 and counts         status of their         and chart CAUTION       environmental
                    metrics                 periods                 advisories (shown
                                                                    beside status,
                                                                    never merged in)
                          |
     protocolEngine.buildFollowUps()
       • one follow-up per non-nominal metric (its recommendedNextStep)
       • one per advisory
       • one per task missed yesterday (the task's missedPrompt)
     mostImportantAction()  →  the banner's next action
                          |
     readinessEngine.computeReadiness()
       score = 50 × today's task completion + 20 × 7-day adherence
             + 15 × follow-ups done + 15 × share of fresh primary metrics
       XP = sum of completed task XP through the selected day (each task once per day)
       streak = consecutive days with ≥ 80% of tasks complete
```

The readiness score is an engagement indicator. It is computed separately from
health status and can never lower or hide a CAUTION or CRITICAL.

## 5a. Recommendation basis

Every recommendation carries a `RecommendationBasis` (`src/engine/basis.ts`), shown under it in the console, guidance drawer, alerts, follow-ups and the space-weather actions:

- **indicator:** the metric, hazard assessment or countermeasure task it comes from
- **rule:** the configured threshold or condition that fired, or "routine monitoring" when the reading is nominal
- **provenance:** `SUPPLIED PROTOTYPE`, `ASTRA ASSUMPTION`, `MISSION PLAN`, `SCENARIO SIMULATION` or `ROUTINE`
- **reference:** scientific context, or none. With a reference, the note reads "context only; it does not validate this threshold". Without one, it reads "no scientific source cited; prototype assumption".

| Indicator | Context reference |
| --- | --- |
| Heart rate, blood pressure, ARED | NASA HRP: Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness |
| Sleep, mood, PVT | NASA HRP: Risk from Inadequate Sleep and Irregular Schedules |
| Neuro-ocular symptom check | NASA HRP: Risk of SANS |
| Radiation | Zeitlin et al. 2013 (MSL/RAD cruise dose) |
| Glucose, temperature, hydration | None cited |

## 6. Findings

### Compliant

1. `LIVE` appears only after a successful response in the current session. Reload and offline both downgrade it to `CACHED`.
2. Synthetic telemetry is labelled `SYNTHETIC` on every vital tile, chart, tooltip and timestamp. The footer and Data Sources state that it is not real astronaut data.
3. DONKI events never create or change a personal dose. The UI repeats "Environmental hazard, not personal dose".
4. Health data never leaves the browser. Only date ranges and the API key go to NASA.
5. Every threshold carries a provenance tag, and the Data Sources thresholds table shows it.

### Gaps found in the first audit (all resolved in the hardening pass)

| # | Finding | Severity | Resolution |
| --- | --- | --- | --- |
| F1 | The top-bar `LIVE` label did not say which host answered. | Low | Fixed: the top bar shows "via CCMC DONKI API" or "via api.nasa.gov", and the feed table shows the host per type. |
| F2 | The archive label did not say the data is historical. | Medium | Fixed: labelled `ARCHIVED 2024`, with the window in the feed table. |
| F3 | XP and streak mixed synthetic history with user actions without saying so. | Medium | Fixed: a note under the stats says so. |
| F4 | The top-bar readiness number had no prototype label. | Low | Fixed: labelled "Readiness (proto)". |
| F5 | Mission epoch, MET and manual timestamps were inconsistent. Manual entries stored real dates. | Medium | Fixed: one MET model, ship-time entry and `enteredAt` (section 3b). |
| F6 | DEMO_KEY is easily exhausted (HTTP 429). | Info | With DEMO_KEY, the CCMC DONKI API is now tried first. A personal key is still recommended. |
| F7 | The CCMC host previously used an undocumented `/DONKI/WS/get` path. | Medium | Migrated to the documented base `/DONKI-API/get/`. |

## 7. Research references (context only, no data loaded)

- NASA HRP Spaceflight Standard Measures: https://nlsp.nasa.gov/resources/standard-measures
- NASA Life Sciences Portal, including the UTMB bed-rest dataset listing: https://www.nasa.gov/hrp/nlsp/
- NASA OSDR: https://osdr.nasa.gov/bio/repo. Studies OSD-817 (ex vivo human optic nerve, SANS model), OSD-987 (*S. mutans* in simulated microgravity), OSD-989 (spacecraft-material bioburden) and OSD-1018 (rats, simulated GCR and isolation). Titles and organisms were checked against OSDR metadata. None validates an ASTRA-MED threshold.
- NASA-STD-3001 Vol. 2 §4.0: https://www.nasa.gov/reference/4-0-physical-characteristics-and-capabilities-vol-2/
- NASA HRP risk pages: SANS; inadequate sleep and irregular schedules; reduced cardiorespiratory and musculoskeletal fitness.
- Zeitlin et al. 2013, *Science* 340:1080–1084, doi:10.1126/science.1235989. JPL summary: https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/
- NASA DONKI / CCMC: https://ccmc.gsfc.nasa.gov/tools/DONKI/, API base https://ccmc.gsfc.nasa.gov/DONKI-API/get/, and https://api.nasa.gov/
- NASA Orion radiation protection plan (shelter context): https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/
- NASA Science, Artemis II space-weather support: https://science.nasa.gov/missions/artemis/artemis-2/to-protect-artemis-ii-astronauts-nasa-experts-keep-eyes-on-sun/
