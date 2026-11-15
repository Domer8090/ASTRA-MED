import { useCallback, useEffect, useSyncExternalStore } from "react";
import { checkLocalWhisper, type WhisperStatus } from "../services/localWhisper";
import {
  getMutedSnapshot,
  getSpeakingSnapshot,
  setGlobalMute,
  speakTuesday,
  stopSpeaking,
  subscribeTuesdaySpeech,
  toggleGlobalMute,
  type SpeakOptions,
} from "../services/voiceSynth";

let cachedStatus: WhisperStatus | null = null;
const statusListeners = new Set<() => void>();
let statusPollUsers = 0;
let statusPollTimer: number | null = null;

async function refreshStatus(): Promise<void> {
  const status = await checkLocalWhisper();
  const next = status;
  if (JSON.stringify(cachedStatus) === JSON.stringify(next)) return;
  cachedStatus = next;
  for (const listener of statusListeners) listener();
}

function subscribeStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function getStatusSnapshot(): WhisperStatus | null {
  return cachedStatus;
}

export function useTuesdaySpeech() {
  const isSpeaking = useSyncExternalStore(subscribeTuesdaySpeech, getSpeakingSnapshot, () => false);
  const muted = useSyncExternalStore(subscribeTuesdaySpeech, getMutedSnapshot, () => false);
  const localVoice = useSyncExternalStore(subscribeStatus, getStatusSnapshot, () => null);
  const speak = useCallback((text: string, options?: SpeakOptions) => speakTuesday(text, options), []);
  const stop = useCallback(() => stopSpeaking(), []);
  const toggleMute = useCallback(() => toggleGlobalMute(), []);
  const setMuted = useCallback((muted: boolean) => setGlobalMute(muted), []);

  useEffect(() => {
    statusPollUsers += 1;
    if (statusPollUsers === 1) {
      void refreshStatus();
      statusPollTimer = window.setInterval(() => { void refreshStatus(); }, 5000);
    }
    return () => {
      statusPollUsers -= 1;
      if (statusPollUsers === 0 && statusPollTimer !== null) {
        window.clearInterval(statusPollTimer);
        statusPollTimer = null;
      }
    };
  }, []);

  return {
    isSpeaking,
    muted,
    ttsProvider: localVoice?.tts ?? "system",
    localTtsReady: localVoice?.tts === "kokoro" || localVoice?.tts === "piper",
    whisperReady: localVoice?.ready === true,
    status: localVoice,
    speak,
    stop,
    setMuted,
    toggleMute,
  };
}
