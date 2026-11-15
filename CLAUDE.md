# ASTRA-MED — project rules for coding agents

ASTRA-MED is an offline-first astronaut health-monitoring console built for
the 2026 NASA Space Apps Challenge.

**Source of truth:** `PROMPT.md`. Read the relevant section before changing a
feature. Architecture, design tokens and phase plan: `docs/PLAN.md`.

## Stack

Vite 8, React 18, TypeScript 5.9 strict, Tailwind CSS 3, Recharts 3, Lucide
React, Vitest, ESLint 10. No backend, no login, no database. `localStorage` only.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + tests
npm run build      # production build into dist/
npm run preview    # serve dist/ (service worker active here only)
npm run donki:check      # live per-endpoint DONKI check (both hosts)
npm run qa:screenshots   # CDP screenshots of every major view into docs/qa (needs preview running)
npm run assets:fetch     # NASA Earth textures and the hand-tracking model into public/ (offline Recharge deck)
npm run core:build       # engines-only bundle (dist-core/astra-core.js), copied into the iPad app
npm run desktop:dist:win # Windows installers (Electron); desktop:dist:linux for Linux
```

Other hosts (see `docs/INTEGRATION.md`): `desktop/` (Electron shell),
`ios/AstraMed.xcodeproj` (SwiftUI iPad app running the core bundle in
JavaScriptCore), `integrations/cli/astra-core.mjs`. After changing anything the
engines use, run `npm run core:build` so the iPad copy stays current (CI checks
it). Native views never contain thresholds or guidance text; they display what
the core returns. On the FAT32 drive, build Electron output and Xcode
DerivedData on the internal disk, and run `dot_clean -m ios` before
`xcodebuild`.

## Non-negotiable product rules

1. Status labels are exactly `NOMINAL` (#22C55E), `CAUTION` (#F59E0B) and
   `CRITICAL` (#F43F5E). Every status shows text and icon, never colour alone.
2. Overall status and readiness are derived from engine output, never
   hardcoded. A high readiness score never hides a CAUTION or CRITICAL.
3. All thresholds live in `src/config/thresholds.ts` with a provenance tag:
   `supplied-prototype` (PROMPT.md §8.2) or `astra-assumption`. None of them
   are official NASA flight rules; never describe them as such.
4. Components never compare values to thresholds and never contain protocol
   or guidance text. That lives in `src/config`, `src/data` and `src/engine`.
5. Medical language: no diagnoses, no medication, no automatic change to
   exercise or treatment. Use "outside the configured demonstration range",
   "repeat the measurement", "review the mission-approved protocol",
   "contact the medical officer when communication is available".
6. Synthetic telemetry is always labelled `SYNTHETIC`. Never call it real
   astronaut data.
7. Space weather is an environmental hazard, not personal dose. DONKI data
   never populates mSv values. `LIVE` means a successful response in the
   current session; otherwise `CACHED`, `ARCHIVED` or `UNAVAILABLE` (see
   DATA_SOURCES.md §3). Scenario events are labelled `SCENARIO SIMULATION`; the
   scenario C dosimeter overlay is documented in `src/data/scenarioHazards.ts`.
14. Every Tuesday model answer passes `safetyFilter` before it is shown or
    stored. Crisis messages always get the fixed `CRISIS_REPLY`, never a model
    answer alone.
12. Every recommendation carries a `RecommendationBasis` (indicator, rule,
    provenance, reference or "no source"). Show it with `BasisLine`.
13. Mission time: day N = MET (N−1)/00:00–23:59 ship time (UTC). Use
    `missionDayToIso` / `formatReadingStamp`; real-world times stay local dates.
8. The app must load, log, recalculate and chart with no network and no API
   key. API failure must never throw into the UI.
9. Health data stays in the browser. Never send measurements anywhere and
   never `console.log` measurement values. The one exception is Tuesday's
   on-device model: `src/services/localModel.ts` may send the health brief and
   attached images to `localhost` only, and must refuse any other host.
   Camera frames for hand tracking are never sent. Assume no internet in
   flight: Recharge-deck assets ship in `public/`; network-only extras (the
   EPIC photo) must be optional and say so.
10. Never commit a personal NASA API key. `VITE_` variables are public in the
    bundle; `DEMO_KEY` is the fallback.
11. No dead buttons, placeholder charts, fake loading or TODO-only features.
    Show success only after the store has persisted the change.

## Engineering rules

- Strong types in `src/types/health.ts`. No `any`. Validate everything read
  from storage or the network before use.
- Storage keys are versioned: `astra-med:v1:<name>`. Corrupt or missing data
  falls back to defaults; unavailable storage falls back to memory with a
  visible notice.
- Engines (`src/engine`) are pure functions with unit tests. Add or update a
  test whenever a rule changes.
- State lives in `src/state/missionStore.ts` (framework-free, read through
  `useSyncExternalStore`). Derive, don't store, anything computable.
- React: no components defined inside components, derive state during
  render, functional updates, isolate ticking clocks in leaf components,
  import Lucide icons by name, no barrel files of our own.
- Accessibility: semantic elements, `<button>` for actions, `<a>` for
  navigation, visible `:focus-visible` ring, labelled SVG hotspots,
  `aria-live` for toasts and validation, chart text summaries,
  `prefers-reduced-motion` respected, 44px touch targets on mobile.
- Motion uses the transitions.dev tokens defined in `src/index.css`
  (`--duration-*`, `--ease-*`). Animate `transform` and `opacity` only. Never
  `transition: all`.
- Format dates and numbers with `Intl`. Store timestamps as ISO UTC.

## Design rules

- Tokens are defined once in `tailwind.config.js` and `src/index.css`. Do not
  hand-type colours in components.
- Fonts: Barlow (UI text), Barlow Semi Condensed (instrument labels, panel
  titles, status words), IBM Plex Mono (values, MET, IDs, timestamps only).
- Elevation is a 1px border. No drop shadows, no decorative glow, no gradient
  text, no emoji icons.
- Spend boldness on the body plate and the mission track; keep the rest calm.

## Environment notes

- The repo sits on a FAT32 USB volume. macOS writes `._*` AppleDouble files
  next to real files. They are excluded in `tsconfig`, ESLint and Vitest
  config; keep those excludes. Run `dot_clean -m .` if stray `._*` files
  cause tool errors.
- Project skills live in `.claude/skills/` (vercel-react-best-practices,
  web-design-guidelines, transitions-dev, transitions-polish). Use them with
  the frontend-design plugin skill for UI work.
- The Claude desktop preview launcher stalls on this USB volume. Start the
  server from a shell (`node node_modules/vite/bin/vite.js --port 5173`) and
  open http://localhost:5173 in the browser pane by URL.
- The embedded browser pane refuses service-worker registration, so test
  `public/sw.js` offline caching in a normal browser against `npm run preview`.
- DONKI hosts: CCMC documented base `https://ccmc.gsfc.nasa.gov/DONKI-API/get/`
  (no trailing slash) and api.nasa.gov. DEMO_KEY is often exhausted (HTTP 429).
