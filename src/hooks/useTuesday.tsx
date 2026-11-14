import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { knowledgeIndex } from "../data/knowledgeBase";
import { earthMarsLightMinutes } from "../engine/lightTime";
import { retrieve } from "../engine/retrieval";
import {
  actionsFor,
  buildHealthBrief,
  buildModelMessages,
  CRISIS_REPLY,
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
import { chooseModels, listLocalModels, streamChat, type ModelChoice } from "../services/localModel";
import { createTuesdayStore, type TuesdayData, type TuesdayStore } from "../state/tuesdayStore";
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

export interface Attachment {
  kind: "photo" | "lab";
  base64: string;
}

interface TuesdayValue {
  store: TuesdayStore;
  data: TuesdayData;
  open: boolean;
  setOpen: (open: boolean) => void;
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
  ask: (text: string, attachment?: Attachment) => Promise<void>;
  stop: () => void;
  context: TuesdayContext;
}

const TuesdayContextValue = createContext<TuesdayValue | null>(null);

function speak(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    // On-device voices only; network voices would send the text off the device.
    const voice = window.speechSynthesis.getVoices().find((v) => v.localService && v.lang.startsWith("en"));
    if (!voice) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\[\d+\]/g, "").replace(/\[Tuesday removed[^\]]*\]/g, ""));
    u.voice = voice;
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  } catch {
    // Speech is optional.
  }
}

function uniqueSources(list: (SourceRef | null)[]): SourceRef[] {
  const seen = new Set<string>();
  return list.filter((s): s is SourceRef => s !== null && !seen.has(s.url) && Boolean(seen.add(s.url)));
}

export function TuesdayProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createTuesdayStore());
  const data = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [open, setOpen] = useState(false);
  const [recharge, setRecharge] = useState<RechargeMode | null>(null);
  const [checkIn, setCheckIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<ContactRequest | null>(null);
  const [simulatedLos, setSimulatedLos] = useState(false);
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
      else setModel({ state: "ready", installed: names, choice: chooseModels(names, { chat: chatModel, medical: medicalModel }) });
    });
  }, [endpoint, useModel, chatModel, medicalModel]);

  useEffect(() => {
    if (open) refreshModels();
  }, [open, refreshModels]);

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
      lightMinutes: earthMarsLightMinutes(new Date()),
      recentEnergy,
    }),
    [m.day, m.overall.status, m.diagnostics, m.systems, m.advisories, m.trends, m.drift, m.primaryAction.text, recentEnergy],
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  const ask = useCallback(
    async (text: string, attachment?: Attachment) => {
      const question = text.trim() || (attachment?.kind === "lab" ? "Read this lab report." : attachment ? "Look at this photo." : "");
      if (!question || busy) return;
      store.addMessage({ role: "user", text: question, ...(attachment ? { attachment: attachment.kind } : {}) });
      const intent = attachment ? "other" : detectIntent(question);
      const voice = store.getState().settings.voice;

      if (intent === "crisis") {
        store.addMessage({ role: "tuesday", text: CRISIS_REPLY, via: "core", actions: actionsFor("crisis", context) });
        if (voice) speak(CRISIS_REPLY);
        return;
      }

      // Dangerous numbers and red-flag symptoms get a fixed answer, never a model's.
      const vitalsReply = attachment ? null : reportedVitalsReply(readingsInText(question));
      if (vitalsReply || intent === "urgent") {
        const reply = vitalsReply ?? { text: URGENT_REPLY, actions: actionsFor("urgent", context) };
        store.addMessage({ role: "tuesday", text: reply.text, via: "core", actions: reply.actions });
        if (voice) speak(reply.text);
        return;
      }

      const passages = attachment ? [] : retrieve(knowledgeIndex(), question, 4);
      const target = attachment ? model.choice.medical : model.choice.chat;
      if (model.state !== "ready" || !target) {
        const reply = attachment
          ? {
              text: `Reading ${attachment.kind === "lab" ? "a lab report" : "a photo"} needs a multimodal model on this device, such as MedGemma 1.5 4B. ${model.state === "ready" ? "None is installed." : "No local model is running."} Nothing was sent anywhere; the image stayed in this browser.`,
              actions: [],
            }
          : offlineReply(intent, context, passages);
        store.addMessage({ role: "tuesday", text: reply.text, via: "core", actions: reply.actions, sources: uniqueSources(passages.slice(0, 1).map((p) => p.doc.source)) });
        if (voice) speak(reply.text);
        return;
      }

      setBusy(true);
      const controller = new AbortController();
      abort.current = controller;
      const placeholder = store.addMessage({ role: "tuesday", text: "", via: "model", model: target });
      const history = store
        .getState()
        .messages.filter((x) => x.id !== placeholder.id && x.text && !x.attachment)
        .slice(-9, -1)
        .map((x) => ({ role: x.role === "user" ? ("user" as const) : ("assistant" as const), content: x.text }));
      const brief = buildHealthBrief(context);
      const messages = attachment
        ? [{ role: "user" as const, content: `${attachment.kind === "lab" ? LAB_PROMPT : IMAGE_PROMPT}\n\nAstronaut's note: ${question}`, images: [attachment.base64] }]
        : buildModelMessages(brief, passages, history, question);
      const raw = await streamChat({
        endpoint,
        model: target,
        messages,
        signal: controller.signal,
        ...(attachment?.kind === "lab" ? { format: "json" as const } : {}),
        onToken: attachment?.kind === "lab" ? undefined : (t) => store.updateMessage(placeholder.id, { text: safetyFilter(t).text }, false),
      });
      setBusy(false);
      abort.current = null;

      if (raw.startsWith("ERROR:")) {
        const fallback = attachment ? { text: `${raw.slice(7)} Nothing left this device.`, actions: [] } : offlineReply(intent, context, passages);
        store.updateMessage(placeholder.id, {
          text: attachment ? fallback.text : `${fallback.text}\n\n(${raw.slice(7)} Answered with onboard rules.)`,
          via: "core",
          actions: fallback.actions,
          sources: uniqueSources(passages.slice(0, 1).map((p) => p.doc.source)),
        });
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
      if (voice) speak(finalText);
    },
    [busy, context, endpoint, model, store],
  );

  const value = useMemo<TuesdayValue>(
    () => ({
      store,
      data,
      open,
      setOpen,
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
    [store, data, open, recharge, checkIn, model, refreshModels, contact, linkUp, simulatedLos, m.overall.status, busy, ask, stop, context],
  );

  return <TuesdayContextValue.Provider value={value}>{children}</TuesdayContextValue.Provider>;
}

export function useTuesday(): TuesdayValue {
  const v = useContext(TuesdayContextValue);
  if (!v) throw new Error("TuesdayProvider is missing");
  return v;
}
