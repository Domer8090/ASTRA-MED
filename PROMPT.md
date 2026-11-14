# ASTRA-MED --- Master Website Build Prompt

> **Purpose:** This is the source-of-truth build specification for an AI
> coding agent (Claude Code, Cursor, GitHub Copilot, or equivalent) to
> design, implement, and test ASTRA-MED.
>
> **Product:** ASTRA-MED --- Autonomous Astronaut Health Monitoring
> System\
> **Event:** 2026 NASA Space Apps Challenge\
> **Challenge:** Create Health Monitoring Software for Astronauts on
> Space Missions\
> **Primary objective:** Deliver a polished, interactive, offline-first
> mission medical console that helps astronauts monitor their health and
> follow pre-approved countermeasures when communication with Earth is
> delayed.

------------------------------------------------------------------------

# 0. Instructions to the Coding Agent

Build the complete working website/application described below. Do not
stop after producing a visual mockup, static landing page, wireframe, or
partial dashboard.

1.  Inspect the existing repository before changing it. Preserve useful
    existing code and conventions.
2.  If the repository is empty, initialize the application using the
    stack in Section 4.
3.  Implement the complete user experience, realistic seeded data,
    working interactions, persistence, responsive behavior, and offline
    fallback.
4.  Do not leave dead buttons, placeholder charts, empty panels, fake
    loading states, or TODO-only functionality.
5.  Use modular, strongly typed components and a maintainable
    architecture.
6.  Run the app, run the available checks, fix errors, and verify the
    primary user journeys.
7.  Prefer a coherent, production-quality experience over adding
    unnecessary features.
8.  Do not claim that synthetic data is real astronaut telemetry, that a
    heuristic is a validated medical diagnostic, or that the prototype
    is an operational NASA medical device.
9.  Where a medical threshold or microgravity-specific range is not
    supported by a traceable source, label it as a **prototype reference
    assumption** and make it configurable. Do not invent scientific
    authority.
10. Keep the product usable with no network connection and no NASA API
    key.

The final result must feel like a credible spacecraft mission operations
product: precise, calm, information-dense, legible, and exceptionally
polished.

------------------------------------------------------------------------

# 1. Product Vision and Mission Context

## 1.1 The problem

During deep-space missions, communication latency with Earth may range
from several minutes to more than twenty minutes. Astronauts cannot
depend on immediate ground-based medical interpretation for every health
concern.

ASTRA-MED gives crew members a local, self-contained health-monitoring
workspace. It consolidates vital signs, behavioral indicators, mission
exposure, trends, self-measurement instructions, and approved
countermeasure reminders into one console.

The app should help a crew member answer:

-   What is my current health status?
-   Which physiological system needs attention?
-   How has this measurement changed over the mission?
-   Is this a one-time deviation or a persistent trend?
-   What should I measure or check next?
-   Which approved countermeasure should I complete?
-   Is there a space-weather event that may increase radiation risk?
-   What information should I preserve for a later flight-surgeon
    review?

## 1.2 Product positioning

**ASTRA-MED --- Crew Health. Mission Ready.**

A local-first autonomous astronaut health console for long-duration
human spaceflight.

The interface should communicate:

-   Situational awareness
-   Scientific credibility
-   Operational readiness
-   Calm, actionable guidance
-   Resilience during communications outages

## 1.3 Target users

1.  **Astronaut / crew member:** primary user; may be an engineer or
    pilot, not a physician.
2.  **Mission medical officer:** reviews trends, measurements, and
    health events.
3.  **Flight surgeon / ground medical team:** receives preserved records
    when communication is available.
4.  **Mission operations / evaluator:** understands system status, data
    provenance, and readiness.

## 1.4 Core design principle

Every alert must answer three questions in plain English:

1.  **What changed?**
2.  **Why might it matter in space?**
3.  **What should the crew member do next, according to the approved
    protocol?**

Avoid unexplained medical jargon and alarming language without a clear
next step.

------------------------------------------------------------------------

# 2. Reference Website and Design Direction

Use the following site as a visual and information-architecture
reference:

-   SpaceGenes+ website: https://spacegenes-plus.framer.website/
-   SpaceGenes+ project page:
    https://www.spaceappschallenge.org/2025/find-a-team/spacegenes/?tab=project
-   NASA 2026 challenge:
    https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/

The SpaceGenes+ site presents a polished scientific product with a
strong headline, concise explanation of the problem, clear feature
sections, an understandable workflow, example use cases, and a
data-source/process section.

Use those strengths as inspiration, but do not copy its branding, text,
graphics, or exact layout. ASTRA-MED is an operational health console,
not a gene-expression research dashboard.

## 2.1 Visual identity

Create a premium NASA-inspired mission-control interface.

**Theme** - Background: `#060B14` - Main panels: `#0D1526` - Elevated
panels: `#111D31` - Primary border: subtle cyan/slate, e.g. `#1D344B` -
Primary text: `#E8F0FA` - Secondary text: `#91A4BA` - Muted text:
`#647A93` - Accent cyan: `#42D9F5` - Accent blue: `#4C8DFF` - Nominal:
emerald `#22C55E` - Caution: amber `#F59E0B` - Critical: rose `#F43F5E`

**Typography** - Use a clean sans-serif for interface labels and
explanatory text. - Use a monospace font for telemetry values, mission
elapsed time, IDs, timestamps, and data readouts. - Make numbers easy to
scan at a glance. - Use consistent font weights and spacing.

**Visual language** - Dark spacecraft-console aesthetic. - Subtle grid
lines, thin borders, restrained glow, and minimal gradients. - Rounded
panels, but avoid excessive pill-shaped cards. - Strong hierarchy
between mission status, health metrics, trends, and guidance. - Use
icons consistently; avoid decorative icon overload. - Status must always
be conveyed by text and icon as well as color. - Motion should be subtle
and purposeful. Respect reduced-motion preferences. - No generic
hospital imagery, cartoon astronauts, or distracting space wallpaper.

## 2.2 Product experience

The main app should open directly into the mission console, not a
marketing landing page.

A small branded loading state is acceptable, but the first meaningful
screen should expose current mission status and health indicators
immediately.

Include a compact About / Data Sources area accessible from the console.
If a separate overview page is implemented, it should explain the
mission problem, capabilities, workflow, and scientific limitations
without delaying access to the dashboard.

------------------------------------------------------------------------

# 3. NASA Challenge Requirements and Feature Traceability

The application must visibly satisfy these challenge-oriented
capabilities:

  -----------------------------------------------------------------------
  Requirement                         ASTRA-MED implementation
  ----------------------------------- -----------------------------------
  Track core health indicators        Vital cards, measurement logging,
                                      history

  Monitor multiple physiological      Interactive clickable anatomical
  systems                             body map

  Show health status at a glance      Nominal / Caution / Critical
                                      indicators

  Explain health changes over time    Mission-day trend charts and
                                      reference bands

  Help non-physicians perform         Plain-English measurement guidance
  self-exams                          

  Encourage countermeasures           Daily task checklist, streak, XP,
                                      readiness

  Consider delayed Earth support      Local deterministic guidance and
                                      offline-first operation

  Incorporate space weather           NASA DONKI integration with
                                      cached/offline fallback

  Explain data provenance             Sources, assumptions, timestamps,
                                      synthetic-data labels
  -----------------------------------------------------------------------

Do not treat a feature as complete merely because it appears in a
screenshot. Its interactions and underlying state must work.

------------------------------------------------------------------------

# 4. Technology Stack and Architecture

Use:

-   Vite
-   React 18 or a compatible stable React release
-   TypeScript with strict mode
-   Tailwind CSS
-   Recharts
-   Lucide React
-   Browser `localStorage` for local persistence
-   Native Fetch API for NASA DONKI requests

Optional dependencies may be introduced only when they add clear value.
Keep the application lightweight and avoid requiring a backend.

## 4.1 Architecture constraints

-   Zero required backend.
-   No account or login requirement.
-   No database server.
-   No required network request for the initial experience.
-   All key dashboard functionality must work from bundled local data.
-   API failure must never crash the app.
-   Use typed service boundaries so data sources can be replaced later.
-   Separate UI, domain logic, reference data, synthetic telemetry, and
    API access.
-   Keep medical thresholds and protocol text out of presentation
    components.
-   Validate and normalize persisted data before using it.
-   Include a local reset/demo-data control.
-   Do not store NASA API secrets in source control. A Vite client-side
    key is visible to users; explain this limitation and use `DEMO_KEY`
    as a demonstration fallback.

## 4.2 Suggested directory structure

``` text
.
├── .env.example
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── favicon.svg
│   └── offline/
│       └── donki-fallback.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── health.ts
    ├── data/
    │   ├── nasaBaselines.ts
    │   ├── missionTelemetry.ts
    │   ├── fallbackDonki.ts
    │   ├── bodySystems.ts
    │   └── countermeasureTasks.ts
    ├── services/
    │   ├── nasaDonkiApi.ts
    │   ├── storageService.ts
    │   └── telemetryService.ts
    ├── engine/
    │   ├── diagnosticEngine.ts
    │   ├── readinessEngine.ts
    │   └── protocolEngine.ts
    ├── hooks/
    │   ├── useMissionState.ts
    │   ├── useLocalStorage.ts
    │   └── useSpaceWeather.ts
    ├── components/
    │   ├── AppShell.tsx
    │   ├── TopTelemetryBar.tsx
    │   ├── MissionReadinessBanner.tsx
    │   ├── BodyMapPanel.tsx
    │   ├── VitalsGrid.tsx
    │   ├── VitalMetricCard.tsx
    │   ├── MeasurementForm.tsx
    │   ├── TrendChartsPanel.tsx
    │   ├── GuidanceDrawer.tsx
    │   ├── CountermeasureGamification.tsx
    │   ├── SpaceWeatherPanel.tsx
    │   ├── AlertsPanel.tsx
    │   ├── DataSourcesModal.tsx
    │   ├── ScenarioSelector.tsx
    │   └── shared/
    │       ├── StatusBadge.tsx
    │       ├── Panel.tsx
    │       ├── EmptyState.tsx
    │       └── Tooltip.tsx
    └── utils/
        ├── dates.ts
        ├── formatting.ts
        └── validation.ts
```

You may adjust this structure if the existing repository has a better
convention, but retain the separation of concerns.

## 4.3 Environment file

Create `.env.example`:

``` env
VITE_NASA_API_KEY=DEMO_KEY
```

Document that client-side environment variables are bundled into the
frontend and are not secret. Never commit a personal API key.

------------------------------------------------------------------------

# 5. Main Application Layout

Build a responsive, four-zone mission console.

## 5.1 Global shell

**Left navigation / compact rail** - ASTRA-MED logo and product name -
Mission Overview - Crew Health - Body Systems - Trends -
Countermeasures - Space Weather - Data Sources / About

The primary dashboard may remain a single page with anchored sections or
use lightweight client-side routing. Navigation must work.

**Top telemetry bar** - Mission name: `ARES TRANSIT — DEMO MISSION` -
Crew member selector or demo crew identity - Mission Day selector /
scrubber: Day 1--180 - Mission elapsed time - Scenario selector -
Connection state: ONLINE / OFFLINE - NASA space-weather data state: LIVE
/ CACHED / DEMO - Current local timestamp - Readiness score

**Main workspace** 1. Mission readiness and alert summary. 2. Vital
metrics grid. 3. Interactive human body map with selected-system detail.
4. Mission trend charts. 5. Daily countermeasures and readiness
progress. 6. Space-weather alerts and recent health events.

**Right-side guidance drawer** - Opens when a body system or metric is
selected. - Shows current status, what it means, why it matters, and
self-measurement steps. - Should be dismissible and usable on smaller
screens.

## 5.2 Responsive behavior

Desktop: - Use a balanced multi-column dashboard. - Keep high-priority
metrics above the fold. - Body map and system details should be visually
prominent.

Tablet: - Collapse to two columns where possible. - Keep navigation
accessible.

Mobile: - Use a single-column layout. - Convert the left navigation to a
compact menu or bottom navigation. - Charts must remain readable and
horizontally manageable. - Guidance should become a full-screen drawer
or sheet. - Do not allow critical actions or status labels to be
clipped.

------------------------------------------------------------------------

# 6. Mission Readiness and Status System

## 6.1 Three required status levels

Use exactly these labels and colors throughout the application:

-   **NOMINAL** --- emerald `#22C55E`
-   **CAUTION** --- amber `#F59E0B`
-   **CRITICAL** --- rose `#F43F5E`

A status badge must include text, not just color.

Apply the same status semantics to: - Mission readiness banner - Vital
cards - Body-system hotspots - Selected body-system detail - Alerts -
Trend annotations - Space-weather risk notices, where appropriate

## 6.2 Mission readiness banner

At the top of the console, show: - Overall mission health status -
Readiness score from 0--100 - Number of nominal indicators - Number of
caution indicators - Number of critical indicators - Most important
current action - Last measurement update

The overall status must be derived deterministically from the current
health state. Do not hardcode it independently of the metrics.

Suggested prototype logic: - Critical if any configured critical health
condition is active. - Caution if no critical condition exists but one
or more caution conditions are active. - Nominal otherwise.

The readiness score is an operational engagement indicator, not a
medical clearance score. Clearly label it as a prototype score.

------------------------------------------------------------------------

# 7. Health Data Model and Metrics

Track all required indicators:

1.  Blood pressure --- systolic and diastolic, mmHg.
2.  Heart rate --- bpm.
3.  Blood glucose --- mg/dL.
4.  Body temperature --- °C.
5.  Daily sleep --- hours.
6.  Mood --- score 1--5.
7.  ARED resistance exercise --- minutes per day.
8.  Cumulative radiation exposure --- mSv.

Additional useful optional indicators: - SpO₂ - Respiratory rate -
Hydration / fluid intake - Cognitive reaction-time check (PVT) -
Measurement timestamp and source

## 7.1 TypeScript model

Create strict interfaces similar to:

``` ts
export type HealthStatus = "NOMINAL" | "CAUTION" | "CRITICAL";

export type MetricId =
  | "bloodPressure"
  | "heartRate"
  | "bloodGlucose"
  | "bodyTemperature"
  | "sleep"
  | "mood"
  | "aredMinutes"
  | "radiation";

export interface VitalMeasurement {
  id: string;
  metricId: MetricId;
  value: number | { systolic: number; diastolic: number };
  unit: string;
  missionDay: number;
  recordedAt: string;
  source: "synthetic" | "manual" | "api" | "import";
  notes?: string;
}

export interface MetricDiagnostic {
  metricId: MetricId;
  status: HealthStatus;
  summary: string;
  explanation: string;
  recommendedNextStep: string;
  evaluatedAt: string;
}

export interface MissionDayTelemetry {
  missionDay: number;
  heartRate: number;
  systolic: number;
  diastolic: number;
  glucose: number;
  temperature: number;
  sleepHours: number;
  moodScore: number;
  aredMinutes: number;
  dailyRadiationMsv: number;
  cumulativeRadiationMsv: number;
}

export interface CountermeasureTask {
  id: string;
  title: string;
  description: string;
  category: string;
  targetLabel: string;
  xp: number;
  completed: boolean;
  completedAt?: string;
}

export interface DonkiEvent {
  id: string;
  type: "FLR" | "SEP" | "CME" | "NOTIFICATION";
  title: string;
  startTime?: string;
  endTime?: string;
  severity?: string;
  description: string;
  sourceUrl?: string;
  dataSource: "live" | "cached" | "fallback";
}
```

Extend as needed, while maintaining strict typing and validation.

## 7.2 Metric cards

Each card must display: - Metric name - Latest value - Unit - NOMINAL /
CAUTION / CRITICAL badge - Change from previous measurement or recent
trend - Small sparkline - Last recorded time - Click / tap action to
open the relevant guidance

Suggested card arrangement: - Heart rate - Blood pressure - Blood
glucose - Body temperature - Sleep - Mood - ARED exercise - Cumulative
radiation

The cards should be visually consistent and easy to scan. Use sensible
precision and units.

## 7.3 Measurement logging

Provide a working `Log Measurement` action.

The form should: - Let the user choose a metric. - Show the correct
fields for that metric. - Validate numeric input and reasonable
data-entry bounds. - Require or default the mission day and timestamp. -
Allow an optional note. - Show the units beside the fields. - Save the
entry locally. - Recalculate the metric status, overall status, and
charts immediately. - Show a clear success or validation message.

For blood pressure, collect systolic and diastolic values separately.

Do not silently accept invalid or impossible values. Do not overwrite
history when a new measurement is logged.

------------------------------------------------------------------------

# 8. Scientific Baselines and Diagnostic Rules

## 8.1 Critical scientific constraint

Do not present generic or illustrative thresholds as official NASA
flight rules.

The following ranges are **prototype demonstration assumptions supplied
for this build**. They are not a validated clinical standard and must
not be represented as official NASA medical thresholds. Put them in a
clearly documented, editable configuration module. Display source and
confidence labels in the Data Sources area.

For a real deployment, these values and escalation rules must be
reviewed and approved by qualified aerospace medicine personnel and
mission medical authorities.

## 8.2 Supplied prototype reference values

  --------------------------------------------------------------------------
  Indicator         Supplied prototype  Caution example   Critical example
                    reference                             
  ----------------- ------------------- ----------------- ------------------
  Resting heart     50--68 bpm          \>85 or \<45 bpm  \>105 bpm
  rate                                                    

  Blood pressure    110/70--125/80 mmHg \>135/85 or       \>150/95 or
                                        \<95/60           \<85/55

  Temperature       36.6--37.5 °C       37.6--38.1 °C     ≥38.2 °C

  Blood glucose     75--105 mg/dL       110--139 or \<68  ≥140 or \<55

  Sleep             6.0--7.5 hours      5.0--5.9 for 2+   \<4.5 hours
                                        days              

  Mood              3.5--5 / 5          ≤2.5 for 3+ days  ≤1.5

  Radiation         Mission-dependent   Investigate an    Follow approved
                                        unusual daily     mission exposure
                                        increase          protocol

  ARED exercise     Configured daily    Below planned     Repeated missed
                    plan                target            sessions /
                                                          protocol-defined
                                                          concern
  --------------------------------------------------------------------------

Important: - Do not treat the supplied ranges as universal spaceflight
baselines. - Do not infer a radiation medical emergency from a single
arbitrary cumulative threshold. - The supplied `>50 mSv acute event`
example must not be used as a universal critical trigger. Radiation
exposure interpretation depends on dose rate, particle type, shielding,
mission phase, and approved radiation protection limits. - ARED exercise
targets should be configurable by mission protocol; do not claim one
duration is suitable for every crew member. - The 60-minute exercise
target is a demo task only, not an individualized prescription. - Sleep
and mood status should account for persistence over multiple days rather
than treating one reading as a diagnosis.

## 8.3 Diagnostic engine

Implement a deterministic rules engine that: - Evaluates current
readings against configurable thresholds. - Evaluates persistence where
the rule requires multiple days. - Checks missing or stale
measurements. - Produces a status, plain-English explanation, and
next-step guidance. - Preserves the reason each status was assigned. -
Never changes a recorded measurement. - Never invents a diagnosis. -
Does not automatically prescribe medication or treatment.

Use separate functions for each metric and a shared status aggregation
function.

Example conceptual output:

``` ts
{
  metricId: "sleep",
  status: "CAUTION",
  summary: "Sleep has been below the configured target for two consecutive days.",
  explanation: "Repeated short sleep may affect attention and reaction time.",
  recommendedNextStep: "Complete the scheduled rest-period check and review the approved sleep routine."
}
```

Use language such as: - "This reading is outside the configured
demonstration range." - "Repeat the measurement using the
instructions." - "Review the mission-approved protocol." - "Record
symptoms and contact the medical officer when communication is
available."

Avoid: - "You have \[disease\]." - "This is definitely caused by
microgravity." - "Take \[medication\]." - Any unsupported medical
certainty.

------------------------------------------------------------------------

# 9. Interactive Human Body Map

This is a signature feature and must be implemented with care.

## 9.1 SVG anatomy

Create a clean, front-facing astronaut/human anatomical silhouette using
inline SVG. It should be visually attractive, technically clear, and
readable against the dark panel.

Do not use a static image as a substitute for interaction.

Provide clickable hotspots for these five systems:

1.  **Brain & Eyes / Neuro-Ocular**
2.  **Cardiovascular**
3.  **Musculoskeletal / Bone**
4.  **Immune & Radiation**
5.  **Metabolic & Circadian**

Each hotspot must: - Be keyboard accessible. - Have an appropriate
accessible label. - Respond to click/tap. - Show hover/focus
treatment. - Display its current status using the required status
colors. - Highlight the corresponding region when selected. - Open or
update the system detail panel. - Remain usable on touch screens.

## 9.2 System details

When selected, display: - System name - Current status - Why this system
matters during spaceflight - Relevant metrics - Current observations -
What to measure or check - Plain-English instructions - Why microgravity
or radiation can change the measurement or risk - Recommended next
step - Relevant trend chart link

## 9.3 System content

### A. Brain & Eyes / Neuro-Ocular

Explain: - Fluid shifts toward the head can affect ocular structures and
vision. - Spaceflight-associated neuro-ocular concerns require
appropriate monitoring. - Sleep disruption and workload can affect
attention and cognitive performance.

Relevant measurements: - Vision / symptom check (if configured) - Sleep
duration - PVT reaction-time result - Headache or visual symptom log

Self-check: 1. Sit or stabilize yourself in a safe position. 2. Use the
supplied vision-check card or approved mission device. 3. Test each eye
separately if the protocol calls for it. 4. Record blurred vision,
pressure sensation, headache, or other symptoms. 5. Compare with prior
readings and follow the mission protocol if symptoms are new or
worsening.

Do not claim that a simple self-check diagnoses SANS.

### B. Cardiovascular

Explain: - Microgravity causes fluid redistribution toward the upper
body. - Cardiovascular adaptation and deconditioning may affect
heart-rate and blood-pressure responses. - Reconditioning and hydration
plans are mission-specific.

Relevant measurements: - Heart rate - Blood pressure - Optional
orthostatic / exercise-response measures if the mission protocol
supports them

Self-check: 1. Secure the measurement device and follow its
instructions. 2. Use the same posture and measurement conditions where
possible. 3. Rest for the protocol-defined period. 4. Position the cuff
as instructed and take the reading. 5. Repeat if the device reports an
error or the result is unexpected. 6. Record posture, time, symptoms,
and measurement.

### C. Musculoskeletal / Bone

Explain: - Reduced mechanical loading can contribute to bone and muscle
loss. - Resistive exercise is an important countermeasure. - Exercise
adherence and trends are useful context, but they do not directly
measure bone density.

Relevant measurements: - ARED minutes / completed sessions - Exercise
adherence - Optional strength or bone-health measures only when
supported by an approved device/protocol

Self-check: 1. Review the scheduled exercise plan. 2. Inspect equipment
readiness. 3. Complete only the assigned session. 4. Record completed
minutes and any equipment or discomfort issue. 5. Do not increase
intensity or duration based on app suggestions alone.

### D. Immune & Radiation

Explain: - Spaceflight stressors and radiation exposure are relevant to
immune function. - Solar particle events may require mission-specific
radiation protection actions. - A space-weather event is not the same
thing as a measured personal radiation dose.

Relevant data: - Cumulative radiation dose - Daily dose change, if
actual dosimeter data is available - NASA DONKI solar flares, SEP
events, CME events, and notifications - Symptoms or immune measurements
only if supplied by an approved instrument/protocol

Self-check: 1. Review the current dosimeter reading and timestamp. 2.
Confirm that the measurement is current and from the expected device. 3.
Review the mission space-weather alert. 4. Follow the approved radiation
protection and shelter procedure when directed. 5. Record the event and
any required crew actions.

Never convert a flare class or DONKI event into a fabricated personal
dose. Clearly distinguish forecast hazard from measured exposure.

### E. Metabolic & Circadian

Explain: - Altered light-dark cues and mission schedules can disrupt
circadian timing. - Sleep, nutrition, hydration, and workload can
influence metabolic indicators. - Glucose values require context such as
timing and the mission's measurement protocol.

Relevant measurements: - Blood glucose - Sleep duration - Mood -
Hydration, if enabled - Temperature

Self-check: 1. Confirm the correct measurement device and supplies. 2.
Follow the device instructions and mission timing protocol. 3. Record
whether the reading was fasting, post-meal, or otherwise contextualized
if relevant. 4. Record sleep and mood using the same scale each day. 5.
Follow the approved protocol for unusual results.

------------------------------------------------------------------------

# 10. Plain-English Guidance Drawer

The guidance drawer must work from both body hotspots and metric cards.

For every metric include:

-   **What it measures**
-   **Why it matters**
-   **How to measure it**
-   **What can affect the result in microgravity**
-   **When to repeat the measurement**
-   **What to record**
-   **What to do next**

Guidance must be concise, actionable, and written for a non-physician.

Include a clear disclaimer that instructions are educational prototype
content and do not replace mission-approved procedures or medical
advice.

Do not imply every measurement can be performed without dedicated
equipment. State what device is required.

------------------------------------------------------------------------

# 11. Mission Trend Charts

Use Recharts.

## 11.1 Dataset

Pre-seed 180 mission days so the charts work immediately without an API
or user data.

Create plausible synthetic data for: - Heart rate - Systolic and
diastolic blood pressure - Blood glucose - Body temperature - Sleep
hours - Mood score - ARED minutes - Daily radiation - Cumulative
radiation

Use smooth but realistic variability, gradual adaptation, and occasional
controlled anomalies. Do not generate implausible random noise or label
the data as real astronaut data.

## 11.2 Charts

Provide: - Heart-rate trend - Blood-pressure trend (two series) -
Glucose trend - Temperature trend - Sleep and mood trend - ARED exercise
adherence - Daily and cumulative radiation exposure

The chart panel should support: - Mission Day 1--180 - Selected time
windows (e.g. 7, 30, 90, 180 days) - Hover tooltips with exact values
and units - Legends - Responsive sizing - Selected-day cursor / marker
where useful - Status annotations for notable events - A clear
indication when a chart is showing synthetic demo telemetry

## 11.3 Microgravity reference bands

Use Recharts `ReferenceArea` or an equivalent chart overlay to show
configured reference zones.

-   Label the bands clearly.
-   Use subtle translucent fills.
-   Keep the chart readable.
-   Include a legend or explanation.
-   Do not call a range an official NASA safe zone unless it is
    supported by an authoritative cited source.
-   In the prototype, label it `Configured Reference Range` or
    `Demo Reference Band`.

Charts should update when the mission day changes or a new measurement
is logged.

------------------------------------------------------------------------

# 12. Mission Day Scrubber and Scenario Presets

## 12.1 Mission day selector

Allow selection of Day 1--180 through: - Slider/scrubber - Current day
label - Previous / next day controls - Optional quick-jump buttons

When the selected mission day changes: - Update displayed telemetry. -
Update trend cursor. - Update body-system status. - Update relevant
mission-day context. - Keep historical manual measurements visible in
their correct time position.

## 12.2 Scenario presets

Include at least three deterministic demo scenarios:

### Scenario A --- Nominal Mission

-   Mostly stable health readings.
-   Good countermeasure adherence.
-   No major active health alert.
-   Normal demo space-weather conditions.

### Scenario B --- Cardiovascular Caution

-   Gradual heart-rate deviation and/or blood-pressure change.
-   The diagnostic engine flags the configured caution state.
-   Cardiovascular body hotspot changes status.
-   Guidance explains repeat measurement and protocol review.
-   Trend chart highlights the period.

### Scenario C --- Solar Particle Event

-   Simulated SEP / radiation hazard event.
-   Space-weather panel displays an event.
-   Radiation system becomes caution or displays a hazard advisory
    according to the configured demo rules.
-   The app distinguishes environmental hazard from personal dosimeter
    dose.
-   Guidance directs the crew to review mission-approved radiation
    procedures.

A scenario change must be deterministic and reversible. It must not
erase user-entered data without confirmation.

------------------------------------------------------------------------

# 13. Countermeasure and Readiness Gamification

Build a useful, restrained gamification loop. It should encourage
adherence without trivializing medical issues.

## 13.1 Daily task examples

Include configurable tasks such as:

1.  **ARED resistive exercise** --- demo target 60 minutes; mission plan
    configurable.
2.  **PVT cognitive reaction check** --- complete the scheduled check.
3.  **Hydration check** --- record hydration according to the mission
    plan.
4.  **Evening blue-light wind-down** --- complete the scheduled routine.
5.  **Daily health check-in** --- review required vitals.
6.  **Sleep log** --- record sleep duration.
7.  **Radiation status review** --- review current exposure and
    space-weather status.

Do not present the example tasks as universally approved NASA
prescriptions.

## 13.2 Interaction

Each task must: - Have a checkbox or completion action. - Show a short
description. - Show target / expected completion. - Award XP only once
per task per mission day. - Persist completion locally. - Update daily
completion percentage. - Update streaks correctly. - Allow an
appropriate undo or correction action.

## 13.3 Readiness XP

Display: - Daily completion percentage - Current streak - Total XP -
Completed / total tasks - A short positive message

The readiness score must remain distinct from medical status. A high
task score must never suppress a caution or critical health alert.

## 13.4 Deterministic self-correction

When a task is missed or a metric enters caution: - Explain the missed
or abnormal item. - Suggest a relevant, pre-approved next action. -
Offer a direct link to the applicable guidance. - Track whether the crew
member completed the action.

Never autonomously change medication, exercise intensity, or clinical
treatment.

------------------------------------------------------------------------

# 14. NASA DONKI Space-Weather Integration

## 14.1 Purpose

Show current or recent NASA space-weather information relevant to
mission awareness.

Official API documentation: - NASA APIs: https://api.nasa.gov/ - DONKI:
https://api.nasa.gov/DONKI/

Use: - Solar flares (`FLR`) - Solar energetic particle events (`SEP`) -
Coronal mass ejections (`CME`) - DONKI notifications

## 14.2 Endpoints

Use date ranges dynamically rather than hardcoding a date that becomes
stale.

Examples:

``` text
https://api.nasa.gov/DONKI/FLR?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=DEMO_KEY

https://api.nasa.gov/DONKI/SEP?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=DEMO_KEY

https://api.nasa.gov/DONKI/CME?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=DEMO_KEY

https://api.nasa.gov/DONKI/notifications?type=all&api_key=DEMO_KEY
```

Read the current DONKI response schema and handle optional fields
safely. Do not assume every event has every field.

## 14.3 API service behavior

Implement `nasaDonkiApi.ts` with: - API key from
`import.meta.env.VITE_NASA_API_KEY` - Fallback to `DEMO_KEY` - Request
timeout - Error handling - Safe JSON parsing - Response normalization -
Basic request throttling / refresh control - Local cache of the last
successful result - Bundled offline fallback data - Last successful
fetch timestamp - Clear data provenance

Use `Promise.allSettled` or equivalent so one failed endpoint does not
prevent other event types from loading.

Do not make the dashboard depend on the API succeeding.

## 14.4 Space-weather UI

Create a panel with: - Current space-weather status - LIVE / CACHED /
DEMO label - Last updated time - Event count - Recent FLR, SEP, CME, and
notification list - Event type and timestamp - Severity or class only
when supplied by source - Expandable event details - Source link when
available - Refresh action

When offline: - Display the bundled fallback events. - Label them
`DEMO / OFFLINE FALLBACK`. - Show the last live fetch time if one
exists. - Never imply fallback data is live.

## 14.5 Radiation interpretation

Important: - DONKI is an environmental space-weather source, not an
astronaut personal dosimeter. - A solar flare class is not a personal
radiation dose. - An SEP event is a hazard indicator, not a direct mSv
reading. - A CME does not automatically imply a specific radiation
dose. - Only actual dosimeter measurements or validated mission
radiation models should populate personal exposure values. - Use event
information to prompt awareness and protocol review, not to fabricate
cumulative dose.

------------------------------------------------------------------------

# 15. Local Persistence and Offline-First Behavior

Use `localStorage` for: - Manually logged measurements - Completed
countermeasure tasks - Daily task state - XP and streak state - Selected
mission day - Selected scenario - Cached DONKI data - User preferences

## 15.1 Storage rules

-   Use versioned storage keys.
-   Validate data when reading it.
-   Handle malformed JSON safely.
-   Provide defaults when keys are absent.
-   Handle browser storage failures gracefully.
-   Never let a corrupted cache prevent the app from opening.
-   Keep synthetic baseline telemetry bundled in the app; do not depend
    on localStorage for the initial dataset.

Example key namespace:

``` text
astra-med:v1:measurements
astra-med:v1:countermeasures
astra-med:v1:readiness
astra-med:v1:mission-settings
astra-med:v1:donki-cache
```

## 15.2 Offline requirements

The app must: - Load with no network. - Show the pre-seeded 180-day
telemetry. - Allow measurement logging. - Allow task completion. -
Recalculate diagnostics. - Render all charts. - Display fallback
space-weather data. - Preserve local state after refresh.

If practical, add a Vite-compatible PWA/service-worker setup to cache
the application shell and static assets. Do not let PWA complexity
compromise the reliable offline baseline.

Display network status clearly, but do not confuse browser connectivity
with NASA API availability.

------------------------------------------------------------------------

# 16. Data Sources and Scientific Transparency

Create a `Data Sources` modal or page.

Include the following research and reference destinations supplied for
the project:

1.  NASA Human Research Program --- Spaceflight Standard Measures\
    https://nlsp.nasa.gov/resources/standard-measures

2.  NASA Life Sciences Portal\
    https://www.nasa.gov/hrp/nlsp/

3.  NASA Open Science Data Repository (OSDR / GeneLab / ALSDA)\
    https://osdr.nasa.gov/bio/repo

4.  NASA Human Integration Design Handbook --- Physical Characteristics
    and Capabilities\
    https://www.nasa.gov/reference/4-0-physical-characteristics-and-capabilities-vol-2/

5.  NASA API portal / DONKI\
    https://api.nasa.gov/

6.  UTMB head-down-tilt bed-rest research\
    Link to the specific campaign or publication only after verifying
    the exact source.

7.  NASA OSDR study references supplied for research review:

    -   OSD-817
    -   OSD-987
    -   OSD-989
    -   OSD-1018

Verify study identifiers, titles, organisms, variables, and relevance
before describing any individual study. Do not invent study findings or
claim that a cited study validates the app's diagnostic thresholds.

## 16.1 Data labels

Every data view should make it possible to distinguish: - Synthetic
demonstration telemetry - User-entered measurement - Live NASA DONKI
event - Cached NASA DONKI event - Bundled fallback event - Configured
prototype threshold

Show units, timestamps, and provenance.

## 16.2 Data limitations statement

Include wording equivalent to:

"ASTRA-MED is a NASA Space Apps Challenge prototype. Demonstration
telemetry and configurable thresholds are illustrative and are not
validated flight medical standards. Space-weather events are
environmental indicators and do not represent personal radiation dose.
This application does not diagnose, prescribe treatment, or replace
mission-approved procedures or qualified medical personnel."

------------------------------------------------------------------------

# 17. Accessibility, Security, and Reliability

## Accessibility

-   Use semantic HTML.
-   Use keyboard-accessible controls.
-   Provide visible focus states.
-   Add accessible labels to SVG hotspots.
-   Maintain readable contrast.
-   Do not communicate status using color alone.
-   Respect reduced-motion settings.
-   Make charts understandable with labels, legends, and text summaries.

## Security and privacy

-   Keep health data local to the browser.
-   Do not send health measurements to NASA or any third party.
-   Do not log sensitive measurement values to the console.
-   Do not claim localStorage is encrypted or suitable for regulated
    medical records.
-   Explain that clearing browser storage may remove locally saved demo
    data.
-   Do not put a private NASA API key in source control.
-   Treat all external API data as untrusted input and render it safely.

## Reliability

-   Add error boundaries where useful.
-   Add loading, empty, offline, and error states.
-   Avoid unhandled promise rejections.
-   Validate all user-entered values.
-   Handle date/time zones consistently.
-   Prevent duplicate XP awards.
-   Avoid stale React state updates.
-   Test localStorage corruption and unavailable storage.

------------------------------------------------------------------------

# 18. Detailed Interaction Requirements

The following interactions must work end-to-end:

1.  Clicking a navigation item scrolls to or opens the correct section.
2.  Changing mission day updates the selected telemetry and chart
    marker.
3.  Changing scenario updates the demo mission state.
4.  Clicking a metric card opens the correct guidance.
5.  Clicking each body hotspot selects the correct physiological system.
6.  Selecting a body system updates its highlight and detail panel.
7.  Logging a measurement saves it and updates its card and trend.
8.  Invalid measurement values show a useful validation message.
9.  Completing a countermeasure updates daily progress and XP.
10. Completing the same task twice does not award XP twice.
11. Changing mission day loads the correct day's task state.
12. Refreshing the page preserves user-entered measurements and task
    progress.
13. Resetting demo data requires confirmation and restores the bundled
    baseline.
14. DONKI refresh handles partial endpoint failures.
15. Offline mode shows cached or fallback events with correct labels.
16. Data Sources opens and closes accessibly.
17. Charts show useful tooltips and correct units.
18. Responsive navigation and guidance work on mobile.
19. Status changes propagate consistently across metric cards, body
    hotspots, and readiness banner.
20. No action is presented as successful until the local state change
    has actually completed.

------------------------------------------------------------------------

# 19. Synthetic Mission Telemetry and Demo Storytelling

Generate a deterministic 180-day mission dataset.

Use a seeded pseudo-random generator or fixed generated data so the demo
is repeatable.

The dataset should show: - Stable early mission values. - Gradual
adaptation over time. - Small day-to-day variation. - Correlated but not
identical trends where scientifically plausible. - One or more
controlled scenario anomalies. - A cumulative radiation curve that never
decreases. - Daily radiation values that sum consistently into
cumulative exposure.

Use mission-day labels rather than calendar dates alone.

The user should be able to understand the demo story without reading
documentation: - Normal operations - A health metric begins drifting -
ASTRA-MED highlights the relevant system - The crew member opens
self-check guidance - A countermeasure or follow-up is completed - The
trend and readiness state update

Clearly mark all seeded values as synthetic.

------------------------------------------------------------------------

# 20. Visual Polish and Quality Bar

Aim for the quality of a polished scientific software product, not a
hackathon wireframe.

Must include: - Consistent spacing and alignment. - Strong information
hierarchy. - High-quality chart styling. - Thoughtful empty states. -
Subtle transitions. - Clear panel titles and supporting labels. -
Consistent status badges. - Tooltips where technical terms need
explanation. - Well-designed modals and drawers. - Readable telemetry
numbers. - A cohesive icon system. - A responsive layout. - No
unnecessary visual clutter.

Avoid: - Oversized marketing hero on the main dashboard. - Excessive
neon glow. - Excessive gradients. - Unreadable tiny text. - Random emoji
as the primary icon system. - Inconsistent status colors. - Decorative
charts with no meaningful data. - Placeholder content. - False "live"
indicators. - Unsupported claims of NASA endorsement or certification.

Use the SpaceGenes+ reference for its concise scientific storytelling,
clear feature hierarchy, workflow explanation, and research
transparency. Use an operational mission-control visual language for the
actual ASTRA-MED dashboard.

------------------------------------------------------------------------

# 21. Suggested Dashboard Content and Copy

Use concise operational language.

**Brand** - ASTRA-MED - Autonomous Astronaut Health Monitoring System

**Top bar** - ARES TRANSIT - MISSION DAY 042 / 180 - CREW HEALTH
TELEMETRY - NETWORK: OFFLINE / ONLINE - SPACE WEATHER: LIVE / CACHED /
DEMO

**Readiness** - MISSION HEALTH STATUS - CREW READINESS - ACTIVE ALERTS -
LAST HEALTH CHECK

**Body map** - SELECT A BODY SYSTEM - SYSTEM STATUS - WHY IT MATTERS IN
MICROGRAVITY - SELF-CHECK GUIDE - RECOMMENDED NEXT STEP

**Charts** - 180-DAY HEALTH HISTORY - CONFIGURED REFERENCE RANGE -
MISSION DAY - SYNTHETIC DEMO TELEMETRY

**Countermeasures** - TODAY'S COUNTERMEASURES - DAILY COMPLETION -
CURRENT STREAK - READINESS XP

**Space weather** - SPACE WEATHER MONITOR - SOLAR FLARE - SOLAR
ENERGETIC PARTICLE EVENT - CORONAL MASS EJECTION - ENVIRONMENTAL HAZARD
--- NOT PERSONAL DOSE

------------------------------------------------------------------------

# 22. Implementation Plan

Build in the following order. Do not stop after any single phase.

## Phase 1 --- Foundation

-   Inspect repository.
-   Set up Vite, React, TypeScript, Tailwind.
-   Create theme tokens and app shell.
-   Create types and core data modules.
-   Ensure the app starts successfully.

## Phase 2 --- Seeded mission data

-   Generate deterministic 180-day telemetry.
-   Create configurable prototype baselines.
-   Create fallback DONKI events.
-   Add three scenario presets.
-   Verify data consistency.

## Phase 3 --- Dashboard

-   Build top telemetry bar.
-   Build readiness banner.
-   Build metric cards.
-   Build responsive dashboard grid.
-   Add navigation and selected mission-day state.

## Phase 4 --- Body map and guidance

-   Build interactive SVG.
-   Add five accessible hotspots.
-   Add selected-system details.
-   Build metric/system guidance drawer.

## Phase 5 --- Trends

-   Build Recharts panels.
-   Add time-range controls.
-   Add reference bands.
-   Add tooltips and mission-day selection.
-   Connect charts to current state and manual entries.

## Phase 6 --- Countermeasures

-   Build daily checklist.
-   Implement XP and streak calculations.
-   Implement per-day completion persistence.
-   Add deterministic self-correction prompts.

## Phase 7 --- NASA DONKI

-   Implement API service.
-   Normalize event data.
-   Add timeout and partial-failure handling.
-   Add local cache and offline fallback.
-   Build space-weather panel.

## Phase 8 --- Persistence and resilience

-   Add versioned localStorage service.
-   Validate stored state.
-   Handle storage failures.
-   Add reset flow.
-   Verify offline use.

## Phase 9 --- Data sources and polish

-   Build Data Sources modal.
-   Verify external references and source descriptions.
-   Add accessibility and responsive refinements.
-   Add loading, error, and empty states.

## Phase 10 --- Verification

-   Run TypeScript checks.
-   Run linting if configured.
-   Run production build.
-   Fix all errors and warnings that affect the app.
-   Test all major interactions.
-   Test with network disabled.
-   Test localStorage persistence and reset.
-   Test desktop and mobile layouts.

------------------------------------------------------------------------

# 23. Acceptance Criteria

The application is complete only when all of the following are true.

### Product

-   [ ] The app opens directly into a polished ASTRA-MED mission
    console.
-   [ ] The interface clearly communicates mission day and current
    health status.
-   [ ] All eight required indicators are present.
-   [ ] All five body-system hotspots work.
-   [ ] Every metric and body system has useful self-exam guidance.
-   [ ] Status badges use the exact three required states and colors.
-   [ ] The readiness banner derives from current diagnostic state.
-   [ ] Charts display 180 days of synthetic telemetry.
-   [ ] Charts include clearly labeled configured reference bands.
-   [ ] Mission-day selection works.
-   [ ] All three scenario presets work.
-   [ ] Countermeasure tasks, XP, and streaks work.
-   [ ] Manual measurement logging works.
-   [ ] NASA DONKI integration handles live, cached, and offline
    fallback data.
-   [ ] Radiation hazard and personal dose are clearly distinguished.
-   [ ] Data Sources and limitations are visible.

### Engineering

-   [ ] TypeScript strict mode is enabled.
-   [ ] No critical TypeScript errors.
-   [ ] Production build succeeds.
-   [ ] No dead buttons or nonfunctional controls.
-   [ ] localStorage state survives refresh.
-   [ ] Corrupt localStorage does not crash the app.
-   [ ] App loads and remains useful offline.
-   [ ] No private API key is committed.
-   [ ] No unsupported medical claims are presented as validated facts.

### UX

-   [ ] Desktop layout is polished and balanced.
-   [ ] Mobile layout is usable.
-   [ ] Keyboard navigation works for important controls.
-   [ ] SVG hotspots have accessible labels.
-   [ ] Status is not communicated by color alone.
-   [ ] Synthetic and fallback data are visibly labeled.

------------------------------------------------------------------------

# 24. Final Instructions to the Coding Agent

Now implement ASTRA-MED in the current repository.

Work directly in the codebase. Do not merely explain how to build it or
return code snippets in chat.

Before finishing:

1.  Start the application and inspect the actual rendered UI.
2.  Verify the primary dashboard at desktop and mobile widths.
3.  Test each body hotspot.
4.  Test logging at least one measurement.
5.  Test a scenario change.
6.  Test task completion and duplicate prevention.
7.  Refresh and verify persistence.
8.  Test offline behavior or simulate API failure.
9.  Confirm that the synthetic-data and medical-prototype disclaimers
    are visible.
10. Run the production build and fix failures.

At completion, provide: - A concise summary of implemented features. -
The commands to install and run the project. - The environment variable
setup for NASA DONKI. - Any known limitations. - Confirmation of which
checks were actually run.

**Definition of done:** A visually polished, fully interactive, locally
persistent, offline-first ASTRA-MED prototype that demonstrates how an
astronaut can monitor health, understand trends, perform guided
self-checks, and follow mission-approved countermeasure workflows
without depending on immediate Earth communication.
