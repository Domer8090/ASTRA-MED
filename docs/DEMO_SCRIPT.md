# ASTRA-MED: three-minute demo script

Three acts, one console. Each act opens from a deep link, so a presenter can
recover from any wrong click by reopening the link. Values quoted below were
read from the running app on 2026-11-14; they come from the seeded synthetic
telemetry and do not change between runs.

## Before you present

1. Run `npm run build && npm run preview` (or `npm run dev`) and open the app once.
2. Open these three tabs in order. The `#overview` hash skips the first-visit
   Overview, so the console shows straight away:
   - Act 1: `http://localhost:4173/?scenario=nominal&day=42#overview`
   - Act 2: `http://localhost:4173/?scenario=cardiovascular&day=104#overview`
   - Act 3: `http://localhost:4173/?scenario=sep&day=130#overview`
   (Use port 5173 for `npm run dev`.)
3. Check the top bar shows **SPACE WEATHER LIVE**. If the venue network is
   down, the app still works and shows CACHED or ARCHIVED; say so instead of
   LIVE (see "If something goes wrong").
4. Use a window at least 1280 px wide so the status band shows its three
   parts in one row.

## Timing

| Time | Section |
| --- | --- |
| 0:00 to 0:20 | The problem |
| 0:20 to 0:55 | Act 1: a normal mission day |
| 0:55 to 1:55 | Act 2: catching a cardiovascular drift early |
| 1:55 to 2:45 | Act 3: solar particle event |
| 2:45 to 3:00 | Close |

## 0:00 The problem (20 s)

> "On the way to Mars, a radio signal to Earth takes between 3 and 22 minutes
> each way. Today it is 11 minutes, so a health question and its answer take
> most of an hour. ASTRA-MED helps the crew triage routine health questions on
> board, and it works with no network at all."

Point at **EARTH–MARS DELAY TODAY 11.0 min** in the status band. It is
computed in the browser from NASA JPL's approximate planet positions.

## 0:20 Act 1: a normal mission day (35 s)

Tab 1, Scenario A, day 42.

1. Read the status band left to right. This is the only thing the crew has to
   read each morning:
   - **NOMINAL**, 11 indicators in range.
   - **Body systems:** all five inside their configured ranges.
   - **Next action:** "Yesterday's radiation review was not completed. Check
     the dosimeter and space-weather monitor."
2. > "Even on a good day it tells you one thing to do next. Here it noticed a
   > task missed yesterday."
3. Point at the body map: five systems, each with a colour, an icon and a
   word, never colour alone.
4. Point at **DEMO DATA** in the top bar.
   > "Every health value here is synthetic and labelled that way. The space
   > weather is real NASA data."

## 0:55 Act 2: catching a cardiovascular drift early (60 s)

Tab 2, Scenario B, day 104. This is the trend-watch moment.

1. The status is still **NOMINAL**. Resting heart rate reads **69 bpm**,
   inside its range.
2. Point at the middle of the status band: **Cardiovascular, TREND WATCH**.
   "Every indicator is inside its range, but resting heart rate is rising
   toward its caution limit: about 7 days at the current rate."
3. Open the system panel's trend watch card and read one line:
   "Rising about 2.3 bpm a day … would reach the caution limit of 85 bpm in
   about 7 days … This is a projection, not a diagnosis."
   > "A threshold alarm would stay silent today. ASTRA-MED fits a line through
   > the last seven days and warns a week ahead. It never changes the status;
   > it only tells the crew to keep measuring the same way."
4. Drag the day-track cursor to **D112**, or press the next-day arrow in the
   top bar eight times so the audience sees the days pass. On **day 112** the
   status turns **CAUTION**: resting heart rate and blood pressure are outside
   the configured demonstration range. (Do not use "Next alert day" here; it
   stops on day 110 first.)
   > "The trend watch called it eight days before the alarm."
5. Click **Demo start D118** on the day track. On day 118 (heart rate **88 bpm**, blood pressure **141/87 mmHg**), read
   the next action: "Repeat the measurement using the instructions. Use the
   same posture and rest period, then review the mission-approved
   cardiovascular protocol."
6. Click **Why this step?** under the next action to show the rule
   (`> 85 bpm`) and its provenance tag **SUPPLIED PROTOTYPE**.
   > "Every recommendation shows its rule and where the rule came from. These
   > are prototype thresholds, not NASA flight rules."
7. Optional, if time allows: click **Log**, enter heart rate 72, save. The
   status, charts and readiness recalculate at once.

## 1:55 Act 3: solar particle event (50 s)

Tab 3, Scenario C, day 130.

1. Day 130 is the precursor. Status is **NOMINAL**, but the band shows
   **HAZARD WATCH** and the next action is "Step 1 of 3: Review the
   mission-approved radiation procedure and confirm your designated shelter
   location."
2. Press the next-day arrow to **day 131**. Status turns **CAUTION**.
   **Immune & Radiation** is the system to watch, "directly linked to the
   active WARNING environmental hazard". The next action becomes "Step 1 of 4:
   Move to the designated shelter location …".
3. Click **Weather** in the side menu. Show the protective sequence in
   priority order: shelter, record the dosimeter at entry and exit, defer
   non-essential work including ARED.
4. Point at **Environmental hazard, not personal dose**.
   > "Space weather tells us the environment is dangerous. Only the dosimeter
   > tells us what the crew received. ASTRA-MED never turns a forecast into a
   > dose."
5. Point at **Solar storm forecast: Earth and Mars**.
   > "This is live from NASA's WSA-ENLIL model. It predicts when a solar
   > storm reaches Mars, which matters for a crew on the way there. If one is
   > due within three days, it also appears in the status band."
6. Optional: jump to **day 134**. ALL CLEAR, status back to **NOMINAL**, and
   the next action is the post-event record for the flight surgeon.

## 2:45 Close (15 s)

> "One band to read each morning, warnings a week early, and real NASA
> space-weather data, all running offline in the browser. Health data never
> leaves the device."

## If something goes wrong

| Problem | What to do |
| --- | --- |
| The Overview opens on a fresh browser | Close it with X. The tour starts once; press Skip tour. Neither comes back. |
| Space weather shows CACHED or ARCHIVED | Say "the venue is offline, so it shows the last NASA data it saved". Never call it LIVE. |
| Wrong day or scenario | Reopen the act's deep link. |
| Charts slow to appear | They load lazily; carry on with the status band and come back. |

## Words to avoid

- "Real astronaut data". The health readings are synthetic.
- "NASA thresholds" or "flight rules". They are prototype thresholds.
- "Radiation dose" for space weather. It is an environmental hazard.
- "Diagnosis" for trend watch. It is a projection.
