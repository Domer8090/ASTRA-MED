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
```

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
   never populates mSv values. Label `LIVE`, `CACHED` or `DEMO / OFFLINE
   FALLBACK` honestly. Scenario events are labelled `SCENARIO`.
8. The app must load, log, recalculate and chart with no network and no API
   key. API failure must never throw into the UI.
9. Health data stays in the browser. Never send measurements anywhere and
   never `console.log` measurement values.
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
- `api.nasa.gov/DONKI/FLR` returned 404 on 2026-11-13; the client falls back to
  the CCMC host per endpoint. A 404 in the console for FLR is expected.
