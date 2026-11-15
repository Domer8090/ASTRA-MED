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

/** Longest piece sent to the voice in one go. Kokoro drops text past its input limit. */
const CHUNK_CHARS = 220;

/** Clean text for speech and split it into sentence-sized pieces. Nothing is dropped. */
export function speechChunks(text: string): string[] {
  const cleaned = text.replace(/\s*\[\d+\]/g, "").replace(/\[Tuesday removed[^\]]*\]/g, "").replace(/[*_#`~]/g, "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const sentences = (cleaned.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [cleaned]).map((x) => x.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  const push = (piece: string) => {
    if (!current) current = piece;
    else if (current.length + 1 + piece.length <= CHUNK_CHARS) current = `${current} ${piece}`;
    else {
      chunks.push(current);
      current = piece;
    }
  };
  for (const sentence of sentences) {
    if (sentence.length <= CHUNK_CHARS) {
      push(sentence);
      continue;
    }
    // A very long sentence: break at commas, then at spaces.
    for (const part of sentence.split(/(?<=[,;:])\s+/)) {
      let rest = part;
      while (rest.length > CHUNK_CHARS) {
        const cut = rest.lastIndexOf(" ", CHUNK_CHARS);
        const at = cut > 60 ? cut : CHUNK_CHARS;
        push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      if (rest) push(rest);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function speakWithSystemVoice(chunks: readonly string[], sequence: number, options: SpeakOptions): void {
  if (sequence !== utteranceSequence) return;
  if (!chunks.length) {
    finishGate(sequence);
    return;
  }
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    finishGate(sequence);
    options.onError?.(new Error("No speech output is available."));
    return;
  }
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) cachedVoice = findBestVoice(voices);
    // One utterance per piece: Chrome stops long single utterances after about 15 seconds.
    chunks.forEach((chunk, i) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      if (cachedVoice) utterance.voice = cachedVoice;
      utterance.lang = cachedVoice?.lang || "en-US";
      utterance.pitch = options.pitch ?? 0.94;
      utterance.rate = options.rate ?? 1.06;
      utterance.volume = options.volume ?? 1;
      if (i === 0) utterance.onstart = () => options.onStart?.();
      if (i === chunks.length - 1) utterance.onend = () => finishGate(sequence);
      utterance.onerror = (event) => {
        if (sequence !== utteranceSequence) return;
        options.onError?.(event);
        finishGate(sequence);
      };
      window.speechSynthesis.speak(utterance);
    });
  } catch (error) {
    options.onError?.(error);
    finishGate(sequence);
  }
}

/** Ask the local Kokoro server for one piece. Null if it is unavailable or too slow. */
async function synthesizeChunk(text: string): Promise<AudioBuffer | null> {
  const controller = new AbortController();
  activeAbort = controller;
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const blob = await synthesizeLocalSpeech(text, "am_adam", controller.signal);
    if (!blob.size) return null;
    unlockTuesdaySpeech();
    if (!outputContext) return null;
    if (outputContext.state === "suspended") await outputContext.resume();
    return await outputContext.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
    if (activeAbort === controller) activeAbort = null;
  }
}

function playBuffer(buffer: AudioBuffer, sequence: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!outputContext || sequence !== utteranceSequence || globalMuted) return resolve(false);
    const source = outputContext.createBufferSource();
    activeSource = source;
    source.buffer = buffer;
    source.connect(outputContext.destination);
    source.onended = () => {
      source.disconnect();
      if (activeSource === source) activeSource = null;
      resolve(sequence === utteranceSequence);
    };
    source.start();
  });
}

/**
 * Speak every piece with Kokoro, preparing the next piece while the current one plays.
 * Returns how many pieces were spoken, so the system voice can finish the rest.
 */
async function playKokoro(chunks: readonly string[], sequence: number, options: SpeakOptions): Promise<number> {
  let next = synthesizeChunk(chunks[0]!);
  for (let i = 0; i < chunks.length; i++) {
    const buffer = await next;
    if (sequence !== utteranceSequence || globalMuted) return chunks.length;
    if (!buffer) return i;
    next = i + 1 < chunks.length ? synthesizeChunk(chunks[i + 1]!) : Promise.resolve(null);
    if (i === 0) options.onStart?.();
    const finished = await playBuffer(buffer, sequence);
    if (!finished) return chunks.length;
  }
  finishGate(sequence);
  return chunks.length;
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
  const chunks = speechChunks(text);
  if (!chunks.length) return false;

  clearPlayer();
  const sequence = ++utteranceSequence;
  activeOptions = options;
  startGate();
  void playKokoro(chunks, sequence, options).then((spoken) => {
    if (sequence !== utteranceSequence || spoken >= chunks.length) return;
    // Kokoro unavailable or failed part-way: the device voice says the rest, so nothing is cut.
    if (activeAbort) activeAbort = null;
    speakWithSystemVoice(chunks.slice(spoken), sequence, options);
  });
  return true;
}

/** One piece with the device voice. Resolves when it ends or fails. */
function speakSystemChunk(text: string, sequence: number, options: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    if (sequence !== utteranceSequence || typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return resolve();
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) cachedVoice = findBestVoice(voices);
      const utterance = new SpeechSynthesisUtterance(text);
      if (cachedVoice) utterance.voice = cachedVoice;
      utterance.lang = cachedVoice?.lang || "en-US";
      utterance.pitch = options.pitch ?? 0.94;
      utterance.rate = options.rate ?? 1.06;
      utterance.volume = options.volume ?? 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

/** A reply spoken while it is still being written: push sentences as they arrive, then end. */
export interface SpeechStream {
  push: (text: string) => void;
  end: () => void;
}

/**
 * Start speaking a reply before the whole reply exists. Each pushed sentence is
 * voiced as soon as the previous one finishes, so the first words play while
 * the local model is still writing the rest. Returns null when muted.
 */
export function openSpeechStream(options: SpeakOptions = {}): SpeechStream | null {
  if (typeof window === "undefined" || globalMuted) {
    if (globalMuted) stopSpeaking();
    return null;
  }
  clearPlayer();
  const sequence = ++utteranceSequence;
  activeOptions = options;
  startGate();
  const queue: string[] = [];
  let ended = false;
  let wake: (() => void) | null = null;
  const live = () => sequence === utteranceSequence && !globalMuted;
  const next = async (): Promise<string | null> => {
    while (!queue.length) {
      if (ended || !live()) return null;
      await new Promise<void>((resolve) => { wake = resolve; });
      wake = null;
    }
    return queue.shift() ?? null;
  };
  void (async () => {
    let useSystem = false;
    let started = false;
    let chunk = await next();
    let audio = chunk ? synthesizeChunk(chunk) : null;
    while (chunk !== null && live()) {
      const buffer = audio ? await audio : null;
      if (!live()) return;
      // Prepare the next piece while this one plays.
      const following = next();
      const followingAudio = following.then((c) => (c && !useSystem && live() ? synthesizeChunk(c) : null));
      if (!started) {
        started = true;
        options.onStart?.();
      }
      if (buffer) {
        if (!(await playBuffer(buffer, sequence))) return;
      } else {
        useSystem = true;
        await speakSystemChunk(chunk, sequence, options);
      }
      chunk = await following;
      audio = useSystem ? null : followingAudio;
    }
    finishGate(sequence);
  })();
  return {
    push: (text) => {
      if (!live()) return;
      queue.push(...speechChunks(text));
      wake?.();
    },
    end: () => {
      ended = true;
      wake?.();
    },
  };
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
