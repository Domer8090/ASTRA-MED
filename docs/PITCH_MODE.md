# Pitch mode (live demo)

A presenter walkthrough that frames each demo moment with a spotlight and a
caption, told as the story of Joe Davidson, an astronaut on the way to Mars.

## Start it

```bash
npm run pitch
```

This builds the app and opens `/?pitch` in your browser. Press **Shift+P** at
any time to start or stop pitch mode. Reloading the page keeps pitch mode on.

Pitch mode resets the demo data each time it starts, so readings logged earlier
in this browser (for example while trying Tuesday) cannot change what the steps
show. It also skips the offline cache, so a rebuild shows at once.

## Keys

| Key | Action |
|---|---|
| Right arrow, Page Down, Space | Next step |
| Left arrow, Page Up | Previous step |
| Home / End | First / last step |
| H | Hide or show the caption |
| Esc | Exit pitch mode |

Most presentation clickers send Page Down / Page Up, so a clicker works too.

## The steps

The demo opens on the whole console with nothing highlighted. Press → to start.

1. Day 42: Joe Davidson checks in (NOMINAL)
2. One thing for Joe to do
3. Day 104: Joe feels fine, but trend watch sees heart rate rising
4. Day 112: CAUTION, as predicted
5. Joe's console, on any screen: iPadOS, Windows and Linux (pictures in `public/pitch/`)
6. Day 131: a solar storm hits
7. Joe's hands are full: Tuesday
8. Joe misses home: Recharge (click **Hand control** yourself to spin Earth)

Each step sets the scenario, day and view on its own. To change the wording,
edit `src/data/pitchSteps.ts`.

## Files

- `src/components/PitchMode.tsx`, `src/data/pitchSteps.ts`, `public/pitch/` (new)
- `src/components/AppShell.tsx`, `src/main.tsx`: mount pitch mode, read `?pitch`
- `src/components/console/SummaryDashboard.tsx`, `src/components/tuesday/TuesdayMode.tsx`: one `data-pitch` attribute each
- `package.json`: `npm run pitch`; `vite.config.ts`: preview moves to the next port if 4173 is busy
