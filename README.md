# ASTRA-MED

Autonomous astronaut health monitoring console. A NASA Space Apps Challenge 2026
prototype for the challenge *Create Health Monitoring Software for Astronauts on
Space Missions*.

The app opens straight into a mission console for the demo mission
**ARES TRANSIT**: crew vitals, an interactive body map, 180-day trends,
countermeasure tracking and NASA DONKI space weather. Everything runs in the
browser, works offline and needs no account or backend.

> **Prototype.** Telemetry is synthetic. Thresholds are configurable prototype
> assumptions, not NASA flight rules or validated clinical standards. Space-weather
> events are environmental indicators, not personal dose. ASTRA-MED does not
> diagnose, prescribe or replace mission-approved procedures or medical personnel.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build and preview (the service worker that caches the app shell is
active only here):

```bash
npm run build
npm run preview    # http://localhost:4173
```

Checks:

```bash
npm run check      # TypeScript, ESLint, Vitest unit tests
```

```bash
npm run donki:check      # live check of each DONKI endpoint on both hosts
```

```bash
npm run qa:screenshots   # screenshots of every major view (needs npm run preview running)
```

Reports: [`DATA_SOURCES.md`](DATA_SOURCES.md) (data provenance audit) and
[`docs/QA_REPORT.md`](docs/QA_REPORT.md) (final QA with screenshots).

## NASA API key

DONKI requests go to the documented CCMC DONKI API
(`https://ccmc.gsfc.nasa.gov/DONKI-API/get/`, no key) and to
`api.nasa.gov/DONKI` with `VITE_NASA_API_KEY`, falling back to `DEMO_KEY`. With
DEMO_KEY the CCMC host is tried first.

```bash
cp .env.example .env.local   # then set VITE_NASA_API_KEY=your_key
```

Vite bundles every `VITE_` variable into the page, so the key is visible to
anyone who loads the app. It is not a secret. Never commit a personal key.
`DEMO_KEY` is heavily rate-limited; each endpoint falls back to the official
CCMC DONKI host, which needs no key.

## What is in the console

| Area | What it does |
| --- | --- |
| Top bar and mission track | Mission day 1–180 scrubber with one status tick per day, MET, scenario, network and space-weather state, readiness |
| Readiness banner | Overall status derived from the rules engine, counts, the most important action, last check |
| Crew vitals | 8 required indicators with status, change, 14-day sparkline and a gauge against configured ranges |
| Body map | SVG body plate with 5 keyboard-accessible hotspots and system detail, self-check guide and next step |
| Guidance drawer | What changed, why it matters in space, what to do next, rule trace, measurement steps |
| Trends | 7 Recharts views, 7/30/90/180-day windows, reference bands, CAUTION periods, manual-entry markers |
| Countermeasures | Daily tasks, XP once per task per day, streak, undo, follow-up actions |
| Space weather | DONKI FLR, SEP, CME and notifications; LIVE, PARTIAL, CACHED or DEMO / OFFLINE FALLBACK |
| Data sources | Verified references, OSDR study notes, thresholds table, data labels, storage, plan targets, reset |

Scenarios: **A** nominal (day 42), **B** cardiovascular caution (day 118),
**C** simulated solar particle event (day 131).

## Architecture

See [`docs/PLAN.md`](docs/PLAN.md). The source-of-truth specification is
[`PROMPT.md`](PROMPT.md); agent rules are in [`CLAUDE.md`](CLAUDE.md).

```
src/config     thresholds (with provenance) and colour tokens
src/data       synthetic telemetry, scenarios, guidance, tasks, DONKI fallback, sources
src/engine     diagnostic, body-system, advisory, readiness and protocol engines (pure)
src/services   storage, telemetry merge, chart series, NASA DONKI client
src/state      framework-free mission store
src/hooks      React bindings and providers
src/components presentation only
```

## Known limitations

- All health data is synthetic or entered by hand; there is no device integration.
- Thresholds are prototype assumptions. Several gaps in the supplied table are
  filled with labelled ASTRA assumptions (see Data Sources, Thresholds).
- `localStorage` is not encrypted and is not a medical record store.
- The bundled DONKI fallback is an archived real window (2024-05-08 to 2024-05-16),
  not current conditions.
- Live DONKI data describes the near-Earth environment, not the demo spacecraft.
- One demo crew identity; no multi-crew support.

## Public build

`.github/workflows/pages.yml` checks, builds and deploys the app to GitHub
Pages on every push to `main` (enable Pages with source "GitHub Actions" in
the repository settings). The public build uses NASA's `DEMO_KEY`; never add a
personal `VITE_NASA_API_KEY` to the workflow, because Vite embeds it in the
bundle.
