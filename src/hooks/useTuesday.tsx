import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { knowledgeIndex } from "../data/knowledgeBase";
import { missionSignalMinutes } from "../utils/dates";
import { retrieve } from "../engine/retrieval";
import {
  actionsFor,
  buildHealthBrief,
  buildModelMessages,
  buildVoiceMessages,
  cleanSpoken,
  CRISIS_REPLY,
  hasUnsupportedNumber,
  takeSentences,
  TUESDAY_VOICE_PROMPT,
  MIN_TIP_SCORE,
  detectIntent,
  readingsInText,
  reportedVitalsReply,
  URGENT_REPLY,
  IMAGE_PROMPT,
  LAB_PROMPT,
  offlineReply,
  parseLabResults,
  safetyFilter,
  type TuesdayContext,
} from "../engine/tuesdayEngine";
import { chooseModels, listLocalModels, modelRecentlySlow, streamChat, warmUpModel, type ModelChoice } from "../services/localModel";
import { createTuesdayStore, type TuesdayData, type TuesdayStore } from "../state/tuesdayStore";
import { useTuesdaySpeech } from "./useTuesdaySpeech";
import type { SpeechStream } from "../services/voiceSynth";
import type { SourceRef } from "../types/health";
import { useMissionModel } from "./useMissionModel";
import { useOnlineStatus } from "./useOnlineStatus";

export type RechargeMode = "earth" | "game" | "breathe";

export interface ModelStatus {
  state: "checking" | "ready" | "none" | "off";
  installed: string[];
  choice: ModelChoice;
}

export interface ContactRequest {
  priority: "urgent" | "routine";
  report: string;
}

/** Where a spoken answer goes: the voice loop supplies this. */
export interface VoiceSink {
  /** Say a complete, fixed text (safety replies, fallbacks). */
  speak: (text: string) => void;
  /** Start a reply that is spoken sentence by sentence while the model writes it. Null when muted. */
  open: () => SpeechStream | null;
  /** Show the reply so far on screen. */
  show: (text: string) => void;
}

export interface Attachment {
  kind: "photo" | "lab";
  base64: string;
}

interface TuesdayValue {
  store: TuesdayStore;
  data: TuesdayData;
  open: boolean;
  setOpen: (open: boolean) => void;
  tuesdayMode: boolean;
  setTuesdayMode: (open: boolean) => void;
  voiceLaunch: boolean;
  startTalking: () => void;
  consumeVoiceLaunch: () => void;
  recharge: RechargeMode | null;
  openRecharge: (mode: RechargeMode) => void;
  closeRecharge: () => void;
  checkIn: boolean;
  setCheckIn: (open: boolean) => void;
  model: ModelStatus;
  refreshModels: () => void;
  contact: ContactRequest | null;
  openContact: (req?: Partial<ContactRequest>) => void;
  closeContact: () => void;
  /** Ground link: browser online and no simulated loss of signal. */
  linkUp: boolean;
  simulatedLos: boolean;
  setSimulatedLos: (los: boolean) => void;
  busy: boolean;
  /**
   * Answer a message. With `voice`, the answer is spoken. `consoleResult` is what the
   * console already did or knows for this request; the model words it, and it is
   * said as written whenever the model is unavailable or slow.
   */
  ask: (text: string, attachment?: Attachment, voice?: VoiceSink, consoleResult?: string) => Promise<void>;
  stop: () => void;
  context: TuesdayContext;
}

const TuesdayContextValue = createContext<TuesdayValue | null>(null);

function uniqueSources(list: (SourceRef | null)[]): SourceRef[] {
  const seen = new Set<string>();
  return list.filter((s): s is SourceRef => s !== null && !seen.has(s.url) && Boolean(seen.add(s.url)));
}

export function TuesdayProvider({ children }: { children: ReactNode }) {
  const speech = useTuesdaySpeech();
  const [store] = useState(() => createTuesdayStore());
  const data = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [open, setOpen] = useState(false);
  const [tuesdayMode, setTuesdayMode] = useState(false);
  const [voiceLaunch, setVoiceLaunch] = useState(false);
  const [recharge, setRecharge] = useState<RechargeMode | null>(null);
  const [checkIn, setCheckIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<ContactRequest | null>(null);
  const [simulatedLos, setSimulatedLos] = useState(false);
  const startTalking = useCallback(() => {
    setOpen(false);
    setTuesdayMode(true);
    setVoiceLaunch(true);
  }, []);
  const consumeVoiceLaunch = useCallback(() => setVoiceLaunch(false), []);
  const online = useOnlineStatus();
  const linkUp = online && !simulatedLos;
  const [model, setModel] = useState<ModelStatus>({ state: "checking", installed: [], choice: { chat: null, medical: null } });
  const abort = useRef<AbortController | null>(null);
  const m = useMissionModel();
  const { endpoint, useModel, chatModel, medicalModel } = data.settings;

  const refreshModels = useCallback(() => {
    if (!useModel) {
      setModel({ state: "off", installed: [], choice: { chat: null, medical: null } });
      return;
    }
    setModel((s) => ({ ...s, state: "checking" }));
    void listLocalModels(endpoint).then((names) => {
      if (!names || !names.length) setModel({ state: "none", installed: names ?? [], choice: { chat: null, medical: null } });
      else {
        const choice = chooseModels(names, { chat: chatModel, medical: medicalModel });
        setModel({ state: "ready", installed: names, choice });
        // Load the model and cache Tuesday's fixed instructions. No health data is sent.
        if (choice.chat) warmUpModel(endpoint, choice.chat, [{ role: "system", content: TUESDAY_VOICE_PROMPT }]);
      }
    });
  }, [endpoint, useModel, chatModel, medicalModel]);

  useEffect(() => {
    if (open || tuesdayMode) refreshModels();
  }, [open, tuesdayMode, refreshModels]);

  const recentEnergy = useMemo(() => [...data.activity].reverse().find((a) => a.kind === "checkin" && a.energy !== undefined)?.energy ?? null, [data.activity]);
  const context = useMemo<TuesdayContext>(
    () => ({
      day: m.day,
      overall: m.overall.status,
      diagnostics: m.diagnostics,
      systems: m.systems,
      advisories: m.advisories,
      trends: m.trends,
      drift: m.drift,
      primaryAction: m.primaryAction.text,
      lightMinutes: missionSignalMinutes(m.day),
      recentEnergy,
    }),
    [m.day, m.overall.status, m.diagnostics, m.systems, m.advisories, m.trends, m.drift, m.primaryAction.text, recentEnergy],
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  const busyRef = useRef(false);
  const ask = useCallback(
    async (text: string, attachment?: Attachment, voiceSink?: VoiceSink, consoleResult?: string) => {
      const question = text.trim() || (attachment?.kind === "lab" ? "Read this lab report." : attachment ? "Look at this photo." : "");
      if (!question) return;
      if (busyRef.current) {
        // Talking over Tuesday interrupts the answer in progress, as with a person.
        if (!voiceSink) return;
        abort.current?.abort();
      }
      const say = voiceSink?.speak ?? speech.speak;
      store.addMessage({ role: "user", text: question, ...(attachment ? { attachment: attachment.kind } : {}) });
      const intent = attachment ? "other" : detectIntent(question);
      // Spoken questions are always answered aloud (the Voice replies switch can still mute it).
      // Typed chat questions follow Tuesday's own voice setting.
      const voice = voiceSink ? true : store.getState().settings.voice;

      if (intent === "crisis") {
        store.addMessage({ role: "tuesday", text: CRISIS_REPLY, via: "core", actions: actionsFor("crisis", context) });
        if (voice) say(CRISIS_REPLY);
        return;
      }

      // Dangerous numbers and red-flag symptoms get a fixed answer, never a model's.
      const vitalsReply = attachment ? null : reportedVitalsReply(readingsInText(question));
      if (vitalsReply || intent === "urgent") {
        const reply = vitalsReply ?? { text: URGENT_REPLY, actions: actionsFor("urgent", context) };
        store.addMessage({ role: "tuesday", text: reply.text, via: "core", actions: reply.actions });
        if (voice) say(reply.text);
        return;
      }

      // With a console result the facts are already known; the library is only needed for open questions.
      const passages = attachment || consoleResult ? [] : retrieve(knowledgeIndex(), question, 4);
      const target = attachment ? model.choice.medical : model.choice.chat;
      const fallback = () => (consoleResult ? { text: consoleResult, actions: [] } : offlineReply(intent, context, passages));
      // Health facts the console already worked out are said as written, never reworded by a
      // model (a small model was found to invent readings). No model, or it was just too slow:
      // also answer at once from the console and onboard rules.
      if (consoleResult || (!attachment && modelRecentlySlow()) || model.state !== "ready" || !target) {
        const reply = attachment
          ? {
              text: `Reading ${attachment.kind === "lab" ? "a lab report" : "a photo"} needs a multimodal model on this device, such as MedGemma 1.5 4B. ${model.state === "ready" ? "None is installed." : "No local model is running."} Nothing was sent anywhere; the image stayed in this browser.`,
              actions: [],
            }
          : fallback();
        store.addMessage({ role: "tuesday", text: reply.text, via: "core", actions: reply.actions, sources: uniqueSources(passages.slice(0, 1).map((p) => p.doc.source)) });
        if (voice) say(reply.text);
        return;
      }

      busyRef.current = true;
      setBusy(true);
      const controller = new AbortController();
      abort.current = controller;
      const placeholder = store.addMessage({ role: "tuesday", text: "", via: "model", model: target });
      const history = store
        .getState()
        .messages.filter((x) => x.id !== placeholder.id && x.text && !x.attachment && x.role !== "officer")
        .slice(-9, -1)
        .map((x) => ({ role: x.role === "user" ? ("user" as const) : ("assistant" as const), content: x.text }));
      const brief = buildHealthBrief(context);
      // Only passages that really match, and fewer for voice: every extra token is reading time.
      const tips = passages.filter((p) => p.score >= MIN_TIP_SCORE).slice(0, voiceSink ? 2 : 4);
      const messages = attachment
        ? [{ role: "user" as const, content: `${attachment.kind === "lab" ? LAB_PROMPT : IMAGE_PROMPT}\n\nAstronaut's note: ${question}`, images: [attachment.base64] }]
        : voiceSink
          ? buildVoiceMessages(brief, tips, history.slice(-6), question, consoleResult)
          : buildModelMessages(brief, tips, history, consoleResult ? `${question}\n\nCONSOLE RESULT (true)\n${consoleResult}` : question);

      // Spoken answers: each finished sentence is checked and voiced at once, while the model keeps writing.
      const given = messages.map((x) => x.content).join("\n");
      const spoken: string[] = [];
      // A holder, because the stream is opened inside the token callback.
      const out: { stream: SpeechStream | null } = { stream: null };
      let checked = 0;
      let safetyNoted = false;
      const voiceSentences = (soFar: string, final: boolean) => {
        if (!voiceSink) return;
        const { done, rest } = takeSentences(soFar);
        const all = final && rest.trim() ? [...done, rest.trim()] : done;
        for (; checked < all.length; checked++) {
          const sentence = cleanSpoken(all[checked]!);
          if (!sentence) continue;
          let line = sentence;
          if (safetyFilter(sentence).removed) {
            if (safetyNoted) continue;
            safetyNoted = true;
            line = "That part is a question for the medical officer, so I'll leave it to them.";
          } else if (hasUnsupportedNumber(sentence, given)) continue;
          spoken.push(line);
          out.stream ??= voiceSink.open();
          out.stream?.push(line);
          voiceSink.show(spoken.join(" "));
          store.updateMessage(placeholder.id, { text: spoken.join(" ") }, false);
        }
      };

      const raw = await streamChat({
        endpoint,
        model: target,
        messages,
        signal: controller.signal,
        ...(voiceSink ? { firstTokenTimeoutMs: 8_000, temperature: 0.6 } : {}),
        ...(attachment?.kind === "lab" ? { format: "json" as const } : {}),
        onToken:
          attachment?.kind === "lab"
            ? undefined
            : voiceSink
              ? (t) => voiceSentences(t, false)
              : (t) => store.updateMessage(placeholder.id, { text: safetyFilter(t).text }, false),
      });
      const interrupted = controller.signal.aborted;
      if (abort.current === controller) {
        abort.current = null;
        busyRef.current = false;
        setBusy(false);
      }

      if (voiceSink) {
        if (!raw.startsWith("ERROR:")) voiceSentences(raw, true);
        const s = out.stream;
        if (interrupted) {
          s?.end();
          store.updateMessage(placeholder.id, { text: spoken.join(" ") || "(Interrupted.)", via: "model", model: target });
          return;
        }
        if (!spoken.length) {
          // The model failed, timed out or said nothing usable: say the console's own answer.
          s?.end();
          const fb = fallback();
          store.updateMessage(placeholder.id, { text: fb.text, via: "core", actions: fb.actions });
          say(fb.text);
          return;
        }
        s?.end();
        store.updateMessage(placeholder.id, { text: spoken.join(" "), via: "model", model: target, actions: actionsFor(intent, context) });
        return;
      }

      if (raw.startsWith("ERROR:")) {
        const fb = attachment ? { text: `${raw.slice(7)} Nothing left this device.`, actions: [] } : fallback();
        store.updateMessage(placeholder.id, {
          text: attachment ? fb.text : `${fb.text}\n\n(${raw.slice(7)} Answered with onboard rules.)`,
          via: "core",
          actions: fb.actions,
          sources: uniqueSources(passages.slice(0, 1).map((p) => p.doc.source)),
        });
        if (voice && !attachment) say(fb.text);
        return;
      }

      let finalText: string;
      let removed = 0;
      if (attachment?.kind === "lab") {
        const results = parseLabResults(raw);
        finalText = results
          ? `I read ${results.length} result${results.length === 1 ? "" : "s"}. Values are copied as printed; check them against the report. I have not compared them with any threshold.\n\n${results
              .map((r) => `${r.analyte}: ${r.value}${r.unit ? ` ${r.unit}` : ""}${r.referenceRange ? ` (reference ${r.referenceRange})` : ""}${r.flag !== "unknown" ? `, printed flag ${r.flag}` : ""}`)
              .join("\n")}\n\nShare the report with the medical officer when communication is available.`
          : "I could not read results from that image. Try a flatter, well-lit photo of the whole page.";
      } else {
        const filtered = safetyFilter(raw);
        // A citation with no passage behind it would point at nothing.
        if (!passages.length) filtered.text = filtered.text.replace(/\s?\[\d+\]/g, "");
        finalText = filtered.text || "I don't have a good answer for that. If it's about your health, contact the medical officer when communication is available.";
        removed = filtered.removed;
      }
      store.updateMessage(placeholder.id, {
        text: finalText,
        via: "model",
        model: target,
        actions: attachment ? [] : actionsFor(intent, context),
        sources: uniqueSources(passages.map((p) => p.doc.source)),
        ...(removed ? { filtered: removed } : {}),
      });
      if (voice) say(finalText);
    },
    [context, endpoint, model, store, speech.speak],
  );

  const value = useMemo<TuesdayValue>(
    () => ({
      store,
      data,
      open,
      setOpen,
      tuesdayMode,
      setTuesdayMode,
      voiceLaunch,
      startTalking,
      consumeVoiceLaunch,
      recharge,
      openRecharge: (mode) => setRecharge(mode),
      closeRecharge: () => setRecharge(null),
      checkIn,
      setCheckIn,
      model,
      refreshModels,
      contact,
      openContact: (req = {}) => {
        // Default the report to the crew member's latest message, so they do not type it twice.
        const lastUser = [...store.getState().messages].reverse().find((x) => x.role === "user" && !x.attachment)?.text ?? "";
        setContact({ priority: req.priority ?? (m.overall.status === "CRITICAL" ? "urgent" : "routine"), report: req.report ?? lastUser });
      },
      closeContact: () => setContact(null),
      linkUp,
      simulatedLos,
      setSimulatedLos,
      busy,
      ask,
      stop,
      context,
    }),
    [store, data, open, tuesdayMode, voiceLaunch, startTalking, consumeVoiceLaunch, recharge, checkIn, model, refreshModels, contact, linkUp, simulatedLos, m.overall.status, busy, ask, stop, context],
  );

  return <TuesdayContextValue.Provider value={value}>{children}</TuesdayContextValue.Provider>;
}

export function useTuesday(): TuesdayValue {
  const v = useContext(TuesdayContextValue);
  if (!v) throw new Error("TuesdayProvider is missing");
  return v;
}
