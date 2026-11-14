# Tuesday: the crew companion

Tuesday is part assistant, part friend for a crew member on a long mission.
It explains readings, notices when the crew member's pattern drifts from their
own baseline, checks in on mood and energy, and offers a few minutes away from
the console: an Earth view, a light game or paced breathing.

Tuesday follows the same rules as the rest of ASTRA-MED. It gives no
diagnosis, no medication and no change to exercise or treatment. It is not a
counsellor or a medical device.

## How a message is answered

```
crew message
  -> detectIntent (crisis first: fixed CRISIS_REPLY, always)
  -> red-flag symptom, or a typed reading outside its range (readingsInText):
       fixed reply, never a model's. "250 bpm" is CRITICAL: stop, repeat,
       tell a crewmate, urgent channel. Health intents rank above boredom.
  -> retrieve(): BM25 over the onboard protocol library (src/data/knowledgeBase.ts)
  -> on-device model running?        no  -> offlineReply(): rules + the top passage
       yes -> buildHealthBrief() + passages + recent turns
           -> Ollama on localhost (Qwen3 8B preferred)
           -> safetyFilter(): removes medication, dose, diagnosis and
              exercise-change sentences, strips <think> blocks
  -> answer with cited sources and action buttons (Earth, game, breathe,
     check-in, guide, flight-surgeon report)
```

Photos and lab reports go to the image model (MedGemma 1.5 4B preferred). The
image is resized on the device to 896 px, the input size MedGemma uses, and
sent only to `localhost`. A photo gets a plain description and advice on
retaking it for the medical officer, never a named condition. A lab report is
read into a table of values exactly as printed; Tuesday does not compare them
with any threshold.

## Pieces

| Request | Where it lives | Notes |
| --- | --- | --- |
| MedGemma 1.5 4B: lab reports and clinical images | `src/hooks/useTuesday.tsx`, `IMAGE_PROMPT` and `LAB_PROMPT` in `src/engine/tuesdayEngine.ts`, `compressImage` in `src/services/localModel.ts` | Picks any installed model whose name contains `medgemma`, or the one chosen in settings |
| Qwen3 8B: fast conversation | `src/services/localModel.ts` | Picks `qwen3*` first, then any chat model; sends `think: false` to Qwen3 for short answers |
| Isolation Forest on the crew member's own time series | `src/engine/baselineEngine.ts` | Heart rate, blood pressure, temperature, sleep and mood (the dataset has no HRV). Passed to the model in the health brief |
| Personal baseline, not Earth averages | same | First 14 mission days; drivers read "27% higher than your baseline of 60 bpm" |
| RAG knowledge base | `src/engine/retrieval.ts`, `src/data/knowledgeBase.ts` | ChromaDB and FAISS need a server, so the browser uses a BM25 keyword index. Official ISS medical checklists are not public; Tuesday indexes ASTRA-MED's own sourced guidance instead |
| Camera and hand movement | `src/hooks/useHandTracking.ts`, `src/engine/gestures.ts` | MediaPipe Hand Landmarker in the browser. Pinch to grab and turn, open hand toward the camera to zoom, open and close to breathe |
| Immersive Earth | `src/components/recharge/EarthView.tsx`, `src/services/earthImagery.ts`, `src/engine/sunPosition.ts` | Bundled NASA Blue Marble and VIIRS city lights, the real day–night line, a "Find it" game, and the latest EPIC photo when a ground link exists |
| Games | `OrbitCatch.tsx`, `BreatheRing.tsx`, Find it in `EarthView.tsx` | No fail state. After a session Tuesday asks how the crew member feels, 1 to 5 |
| Mental and physical tracking | `src/state/tuesdayStore.ts`, `CheckInCard.tsx` | Check-in logs the day's mood reading (so the engines and drift see it) and keeps energy in Tuesday's log; weekly summary in the Tuesday panel |

## Contacting the medical officer

Tuesday does not diagnose. That is a product rule (CLAUDE.md, rule 5): a
language model naming a condition from a chat message could delay real care or
cause harm. Instead every urgent or out-of-range answer starts with
**Contact medical officer**, also in the status band and on the hazard map.

- **Ground link up:** shows the signal delay and the earliest possible reply,
  then prepares a message (crew report, actions taken, flagged readings with
  their rules, pattern check, hazards) to copy into the mission's messaging
  system or save as text. ASTRA-MED transmits nothing.
- **No ground link:** lists what to do on board (crew medical officer leads,
  repeat vitals every 15 minutes and log them, note when it started) and
  queues the message on this device for the next contact.
- The link is "up" when the browser is online. A **Simulate loss of signal**
  switch in the dialog demonstrates the no-link path.

## The five hazards

The console's hazard map (`src/engine/hazardMap.ts`) ties each NASA HRP hazard
to today's engine status and one action. Isolation and confinement is
Tuesday's hazard: mood, sleep, check-ins, recharge minutes and the pattern
check, with a button that opens Tuesday.

## Privacy

- Conversation, check-ins and the activity log stay in this browser
  (`astra-med:v1:tuesday`).
- The model endpoint must be `localhost`, `127.0.0.1` or `[::1]`. Anything else
  is refused before a request is made and is replaced when read from storage.
- Camera frames never leave the browser.
- Speech output uses on-device voices only. Speech input is not offered,
  because browser speech recognition sends audio to a cloud service.
- No internet is assumed in flight. ISS crews have only a slow relayed link
  and a deep-space crew has none, so Earth textures, the hand-tracking runtime
  and its model ship with the app. Only the EPIC photo needs a ground link, and
  it is optional.

## Run it with a model

```bash
ollama pull qwen3:8b
```

Install a MedGemma 1.5 4B build for photos and lab reports, then open
Tuesday's settings and pick the models. Without a model, every Tuesday feature
except photo and lab-report reading still works.

## Demo moment

Scenario B, day 109: Tuesday's pattern check reports that recent days look
unlike the crew member's own baseline, led by resting heart rate. The
threshold engine turns CAUTION on day 112. Open Tuesday, ask "How am I
doing?", then say "I'm bored" and open the Earth view.
