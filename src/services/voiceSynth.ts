/** Shared local neural TTS player with system speech fallback. */
import { synthesizeLocalSpeech } from "./localWhisper";

const TRAILING_SILENCE_MS = 300;

let cachedVoice: SpeechSynthesisVoice | null = null;
let globalMuted = false;
let activeSpeaking = false;
let speakingUntil = 0;
let utteranceSequence = 0;
let outputContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeAbort: AbortController | null = null;
let trailingTimer: number | null = null;
let activeOptions: SpeakOptions | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try { globalMuted = localStorage.getItem("astra-med:v1:voice-mute") === "true"; } catch { /* Ignore storage errors. */ }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function clearPlayer(): void {
  activeAbort?.abort();
  activeAbort = null;
  if (activeSource) {
    activeSource.onended = null;
    try { activeSource.stop(); } catch { /* It may have ended already. */ }
    activeSource.disconnect();
    activeSource = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Resume Web Audio inside the mic button's user gesture for reliable playback. */
export function unlockTuesdaySpeech(): void {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    outputContext ??= new AudioContext();
    if (outputContext.state === "suspended") void outputContext.resume();
  } catch { /* The system speech fallback remains available. */ }
}

function startGate(): void {
  if (trailingTimer !== null) window.clearTimeout(trailingTimer);
  trailingTimer = null;
  speakingUntil = 0;
  activeSpeaking = true;
  notify();
}

function finishGate(sequence: number): void {
  if (sequence !== utteranceSequence) return;
  activeSpeaking = false;
  speakingUntil = Date.now() + TRAILING_SILENCE_MS;
  if (typeof window !== "undefined") {
    if (trailingTimer !== null) window.clearTimeout(trailingTimer);
    trailingTimer = window.setTimeout(() => {
      trailingTimer = null;
      if (sequence !== utteranceSequence) return;
      speakingUntil = 0;
      const options = activeOptions;
      activeOptions = null;
      notify();
      options?.onEnd?.();
    }, TRAILING_SILENCE_MS);
  } else {
    activeOptions?.onEnd?.();
    activeOptions = null;
  }
  notify();
}

export function isGlobalMuted(): boolean {
  return globalMuted;
}

export function setGlobalMute(muted: boolean): void {
  globalMuted = muted;
  if (muted) stopSpeaking();
  try { localStorage.setItem("astra-med:v1:voice-mute", String(muted)); } catch { /* Ignore storage errors. */ }
  notify();
}

export function toggleGlobalMute(): boolean {
  const next = !globalMuted;
  setGlobalMute(next);
  return next;
}

export function subscribeTuesdaySpeech(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSpeakingSnapshot(): boolean {
  return activeSpeaking || Date.now() < speakingUntil;
}

export function getMutedSnapshot(): boolean {
  return globalMuted;
}

function findBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const candidates = english.length ? english : voices;
  const score = (voice: SpeechSynthesisVoice): number => {
    const name = voice.name.toLowerCase();
    let value = voice.localService ? 10 : 0;
    if (/(natural|enhanced|premium|neural)/.test(name)) value += 100;
    if (name.includes("daniel")) value += 70;
    if (/(samantha|alex|oliver|arthur|george|ryan)/.test(name)) value += 35;
    if (voice.lang.toLowerCase().startsWith("en-gb")) value += 18;
    if (/(compact|novelty|whisper)/.test(name)) value -= 50;
    return value;
  };
  return candidates.reduce((best, voice) => score(voice) > score(best) ? voice : best);
}

function cleanSpeechText(text: string): string {
  const cleaned = text.replace(/\[\d+\]/g, "").replace(/\[Tuesday removed[^\]]*\]/g, "").replace(/[*_#`~]/g, "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const sentences = cleaned.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [cleaned];
  let concise = sentences.slice(0, 2).join(" ").trim();
  if (concise.length > 280) {
    const cutoff = concise.lastIndexOf(" ", 260);
    concise = `${concise.slice(0, cutoff > 160 ? cutoff : 260).trimEnd()}.`;
  }
  return concise;
}

function speakWithSystemVoice(text: string, sequence: number, options: SpeakOptions): void {
  if (sequence !== utteranceSequence) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    finishGate(sequence);
    options.onError?.(new Error("No speech output is available."));
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) cachedVoice = findBestVoice(voices);
    if (cachedVoice) utterance.voice = cachedVoice;
    utterance.lang = cachedVoice?.lang || "en-US";
    utterance.pitch = options.pitch ?? 0.94;
    utterance.rate = options.rate ?? 1.06;
    utterance.volume = options.volume ?? 1;
    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => finishGate(sequence);
    utterance.onerror = (event) => {
      if (sequence !== utteranceSequence) return;
      options.onError?.(event);
      finishGate(sequence);
    };
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    options.onError?.(error);
    finishGate(sequence);
  }
}

async function playKokoro(text: string, sequence: number, options: SpeakOptions): Promise<boolean> {
  const controller = new AbortController();
  activeAbort = controller;
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const blob = await synthesizeLocalSpeech(text, "am_adam", controller.signal);
    if (!blob.size || sequence !== utteranceSequence || globalMuted) return false;
    unlockTuesdaySpeech();
    if (!outputContext) return false;
    if (outputContext.state === "suspended") await outputContext.resume();
    const buffer = await outputContext.decodeAudioData(await blob.arrayBuffer());
    if (sequence !== utteranceSequence || globalMuted) return false;
    const source = outputContext.createBufferSource();
    activeSource = source;
    source.buffer = buffer;
    source.connect(outputContext.destination);
    source.onended = () => {
      source.disconnect();
      if (activeSource === source) activeSource = null;
      finishGate(sequence);
    };
    options.onStart?.();
    source.start();
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
    if (activeAbort === controller) activeAbort = null;
  }
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

/** Prefer local Kokoro; use the device's best English voice when it is absent. */
export function speakTuesday(text: string, options: SpeakOptions = {}): boolean {
  if (typeof window === "undefined" || globalMuted) {
    if (globalMuted) stopSpeaking();
    return false;
  }
  const spokenText = cleanSpeechText(text);
  if (!spokenText) return false;

  clearPlayer();
  const sequence = ++utteranceSequence;
  activeOptions = options;
  startGate();
  void playKokoro(spokenText, sequence, options).then((played) => {
    if (sequence !== utteranceSequence || played) return;
    // A failed/offline Kokoro request falls straight back to local OS speech.
    if (activeAbort) activeAbort = null;
    speakWithSystemVoice(spokenText, sequence, options);
  });
  return true;
}

/** Stop speech output; keep the microphone gate closed for its acoustic tail. */
export function stopSpeaking(): void {
  const hadSpeech = getSpeakingSnapshot() || activeSource !== null || activeAbort !== null;
  const sequence = ++utteranceSequence;
  clearPlayer();
  if (trailingTimer !== null && typeof window !== "undefined") window.clearTimeout(trailingTimer);
  trailingTimer = null;
  if (hadSpeech) {
    activeSpeaking = false;
    speakingUntil = Date.now() + TRAILING_SILENCE_MS;
    const options = activeOptions;
    activeOptions = null;
    trailingTimer = window.setTimeout(() => {
      if (sequence !== utteranceSequence) return;
      trailingTimer = null;
      speakingUntil = 0;
      notify();
      options?.onEnd?.();
    }, TRAILING_SILENCE_MS);
  } else {
    activeSpeaking = false;
    speakingUntil = 0;
    activeOptions = null;
  }
  notify();
}

export function isSpeaking(): boolean {
  return getSpeakingSnapshot();
}
