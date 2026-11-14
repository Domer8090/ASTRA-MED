# ASTRA-MED — Architecture, Design System and Build Plan

`PROMPT.md` is the source of truth. This file records the decisions taken to
satisfy it. When the two disagree, `PROMPT.md` wins and this file is updated.

---

## 1. Subject, audience, primary job

- **Subject:** an offline-first medical console on board a Mars-transit
  spacecraft (demo mission "ARES TRANSIT"), 180-day mission.
- **Primary user:** a crew member who is an engineer or pilot, not a
  physician, working while Earth is 4–24 minutes away by light-time.
- **Primary job:** answer "what is my status, which system needs attention,
  is it a trend, what do I measure or do next" in under ten seconds, with
  every answer traceable to a configured rule and a labeled data source.

## 2. Design system

### 2.1 Colour tokens (fixed by PROMPT.md §2.1)

| Token | Hex | Role |
| --- | --- | --- |
| `space` | `#060B14` | page background |
| `panel` | `#0D1526` | main panels |
| `raised` | `#111D31` | elevated panels, drawers, inputs |
| `line` | `#1D344B` | hairline borders, grid, axis lines |
| `ink` | `#E8F0FA` | primary text |
| `ink-2` | `#91A4BA` | secondary text (any size) |
| `ink-3` | `#647A93` | muted text, large or non-essential only (4.1:1 on panel) |
| `cyan` | `#42D9F5` | focus, selection, interactive accent |
| `blue` | `#4C8DFF` | secondary data series |
| `nominal` | `#22C55E` | NOMINAL |
| `caution` | `#F59E0B` | CAUTION |
| `critical` | `#F43F5E` | CRITICAL |

Status is always colour + icon shape + text: NOMINAL = circle-check,
CAUTION = triangle, CRITICAL = octagon.

### 2.2 Type

Fonts are bundled through `@fontsource` so the console renders identically
offline. No font CDN.

- **Barlow** — interface and explanatory text. Its DIN 1451 lineage is the
  lettering of aviation and highway signage, the right vernacular for an
  instrument panel, and it reads calmly in guidance paragraphs.
- **Barlow Semi Condensed** — instrument labels, panel titles, status words.
  Same skeleton, narrower, so dense console labels fit without shrinking.
- **IBM Plex Mono** — only telemetry values, mission elapsed time, IDs,
  timestamps and units. Never for labels or prose.

Scale (px): 11 / 12 / 13 / 14 / 16 / 20 / 28 / 40. Body 14–16 with
line-height 1.55 (guidance 1.65). Tabular numerals everywhere numbers sit
in columns. Instrument labels are uppercase because PROMPT.md §21 specifies
that console copy; guidance prose is sentence case.

### 2.3 Layout concept

A four-zone console. The body plate and the mission track carry the
identity; everything else is quiet and dense.

```
┌rail─┐┌ top telemetry bar: mission · crew · day ◂▸ · MET · scenario · net · wx · clock · readiness ┐
│ ◉   │├ mission track: 180 status ticks (one per day) + range input + event markers ──────────────┤
│ ◉   │├ readiness strip: STATUS word │ next action sentence │ N/C/C annunciator cells │ last check ─┤
│ ◉   │├──────────────── body plate ─────────────┬──────────── crew vitals (4 × 2 instruments) ─────┤
│ ◉   ││ scanned silhouette + leader-line callouts│ value · unit · badge · range gauge · sparkline   │
│ ◉   ││ selected-system detail                   │                                                  │
│     │├──────────────── trends (focus chart + index tabs) ─────┬──── countermeasures + follow-ups ─┤
│     │├──────────────── space weather (mission + DONKI) ───────┴──── alerts + recent events ───────┤
└─────┘└──────────────────────────────────────────────────────────────────────── guidance drawer ▸ ┘
```

- Desktop ≥1280: 12-column grid, rail 72px (icons + short labels).
- Tablet 768–1279: two columns, rail stays.
- Mobile <768: one column, bottom navigation, guidance becomes a
  full-screen sheet, body-plate callouts become a list of system buttons.
- Content is left-aligned. Numbers are right-aligned in tables.

### 2.4 Signature elements

1. **Body plate.** A front-facing silhouette drawn like a technical plate:
   fine contour, horizontal scan lines clipped to the body, a measurement
   graticule behind it, and leader-line callouts to five systems. The
   selected region fills with its status colour. This is where the visual
   boldness is spent.
2. **Mission track.** The day scrubber is also data: 180 ticks, each coloured
   by that day's derived status, so a persistent trend and a one-day blip
   look different at a glance. Days after the selected day are dimmed
   (replay preview).
3. **Instrument tiles.** Each vital shows where the value sits on its
   configured scale (critical / caution / reference zones with a marker),
   not just a big number.

### 2.5 Principles

- Every alert answers: what changed, why it matters in space, what to do next.
- Elevation is declared once: 1px `line` borders, no drop shadows, no glow
  except a 1px focus ring.
- Radius hierarchy: panels 10px, tiles 6px, controls 4px, status badges 3px.
- Grid lines appear only where they measure something (body plate, charts).
- One orchestrated motion moment: the body plate contour draws on first load.
  Everything else is response motion (drawer, modal, toast, value change)
  using transitions.dev tokens. `prefers-reduced-motion` disables all of it.
- Copy is operational and plain. Buttons name the action ("Log measurement",
  "Mark complete"). Errors say what is wrong and how to fix it.
- Avoid: gradient text, decorative glow, emoji icons, middle-dot meta strings,
  "→" in buttons, eyebrow labels above headings, identical card kits.

## 3. Architecture

```
src/
  types/        health.ts — all domain types (strict)
  config/       thresholds + mission plan (configurable, provenance-labelled)
  data/         bundled reference content: telemetry generator, scenarios,
                body systems, metric guidance, tasks, DONKI fallback, sources
  engine/       pure functions: diagnosticEngine, readinessEngine, protocolEngine
  services/     storageService (versioned, validated), telemetryService
                (synthetic + manual merge), nasaDonkiApi (fetch, normalize, cache)
  state/        missionStore — framework-free store, useSyncExternalStore
  hooks/        useMissionState, useSpaceWeather, useOnlineStatus, useNow …
  components/   presentation only; no thresholds or protocol text inside
  utils/        dates, formatting, validation, prng
```

Rules:

- Engines are pure and unit-tested. Components never compare a value to a
  threshold; they render diagnostics produced by the engine.
- The store writes to storage synchronously inside each action and only then
  notifies subscribers, so "saved" feedback is shown only after persistence.
- Derived state (effective telemetry, per-day diagnostics, readiness) is
  memoised per (scenario, measurements, settings) and never stored.
- XP is derived from completion records, so a task can never award twice.
- Network is optional. First paint uses bundled data and cached DONKI events.

### 3.1 Data provenance labels

`SYNTHETIC` (bundled demo telemetry), `MANUAL` (user entry), `LIVE`, `CACHED`
and `FALLBACK` (DONKI), `SCENARIO` (simulated mission event), and threshold
provenance `SUPPLIED PROTOTYPE` (PROMPT.md §8.2 table) or `ASTRA ASSUMPTION`
(added by this build, editable, not from a source).

### 3.2 Space weather

- Primary endpoint `https://api.nasa.gov/DONKI/{FLR|SEP|CME|notifications}`
  with `VITE_NASA_API_KEY` or `DEMO_KEY`.
- Per-endpoint fallback to the official CCMC host
  `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/...` (no key, CORS `*`). Checked
  2026-11-13: `api.nasa.gov/DONKI/FLR` returned 404 while the CCMC host
  served FLR, so the fallback is needed today. `DEMO_KEY` reported
  `x-ratelimit-limit: 10`.
- `Promise.allSettled`, 12 s timeout per request, 10-minute refresh throttle,
  last good result cached in localStorage.
- Bundled fallback: an archived real DONKI window (2024-05-08 to 2024-05-16,
  the May 2024 storm period), normalised and labelled `DEMO / OFFLINE FALLBACK`.
- Mission-scenario hazards (Scenario C) are separate, labelled `SCENARIO`, and
  are tied to mission days. DONKI never produces a personal dose.

## 4. Phases and checks

| Phase | Scope | Check before moving on |
| --- | --- | --- |
| 1 | Vite + React 18 + TS strict + Tailwind 3, fonts, tokens, lint, Vitest | dev server renders shell, `tsc` clean |
| 2 | Types, thresholds, PRNG telemetry, 3 scenarios, tasks, guidance, fallback DONKI | unit tests: determinism, cumulative dose, plausible bounds |
| 2b | Engines: diagnostics, readiness, protocol/follow-ups | unit tests per rule, persistence, staleness, aggregation |
| 3 | Store + storage, shell, rail, top bar, mission track, readiness strip, vitals | browser: day scrub updates tiles + banner |
| 4 | Body plate SVG, hotspots, system detail, guidance drawer | browser: each hotspot, keyboard, drawer focus |
| 5 | Trend charts, windows, reference bands, status periods, manual points | browser: tooltips, cursor, logged value appears |
| 6 | Countermeasures, XP, streak, undo, follow-ups | unit + browser: no double XP, day switch |
| 7 | DONKI service, normaliser, cache, fallback, panel | unit (mock fetch, partial failure) + live call |
| 8 | Persistence hardening, reset flow, storage-unavailable mode, service worker | corrupt storage test, offline reload |
| 9 | Data Sources / About modal, thresholds table, a11y + responsive polish | keyboard pass, mobile 375px |
| 10 | Full verification: lint, typecheck, tests, build, preview, journeys | PROMPT.md §24 checklist |
