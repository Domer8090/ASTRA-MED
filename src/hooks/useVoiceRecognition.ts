import { useCallback, useEffect, useRef, useState } from "react";
import { parseVoiceCommand, type ParsedVoiceResult } from "../engine/voiceParser";
import { useMissionModel } from "./useMissionModel";
import { useMissionStore } from "./useMissionState";
import { useToast } from "./useToast";
import { useTuesday } from "./useTuesday";
import { splitVoiceCommands } from "../services/localModel";
import { transcribeLocalAudio } from "../services/localWhisper";
import { unlockTuesdaySpeech } from "../services/voiceSynth";
import { useTuesdaySpeech } from "./useTuesdaySpeech";
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from "../types/speech";

export interface VoiceRecognitionState {
  isSupported: boolean;
  provider: "whisper" | "browser" | "unavailable";
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  lastAction: ParsedVoiceResult | null;
  audioLevel: number;
  /** Live microphone analyser while local capture runs; null otherwise. Read only, for visualisation. */
  getAnalyser: () => AnalyserNode | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  executeCommand: (text: string) => ParsedVoiceResult;
}

export function useVoiceRecognition(options?: {
  onCommand?: (result: ParsedVoiceResult) => void;
  onToggleTuesdayMode?: () => void;
}): VoiceRecognitionState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastAction, setLastAction] = useState<ParsedVoiceResult | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { isSpeaking: isTuesdaySpeaking, status: whisperStatus, speak, stop: stopTuesdaySpeech } = useTuesdaySpeech();

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const audioAnimationRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const speechPauseRef = useRef(false);
  const speechSequenceRef = useRef(0);
  const lastCommandRef = useRef<{ key: string; time: number } | null>(null);
  const recentCommandKeysRef = useRef(new Map<string, number>());
  const whisperModeRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const restartWhisperCaptureRef = useRef<(() => void) | null>(null);
  const processVoiceTranscriptRef = useRef<(text: string) => void>(() => undefined);
  const compoundCommandRef = useRef<(text: string) => void>(() => undefined);
  const audioChunksRef = useRef<Blob[]>([]);
  const captureFrameRef = useRef<number | null>(null);
  const discardCaptureRef = useRef(false);
  const transcribingRef = useRef(false);
  const speechGateRef = useRef(isTuesdaySpeaking);
  speechGateRef.current = isTuesdaySpeaking;

  const { day } = useMissionModel();
  const dayRef = useRef(day);
  dayRef.current = day;
  const store = useMissionStore();
  const toast = useToast();
  const tuesday = useTuesday();
  const tuesdayRef = useRef(tuesday);
  tuesdayRef.current = tuesday;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const getAnalyser = useCallback(() => analyserRef.current, []);

  // Check support for Web Speech API
  const browserSpeechSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSupported = browserSpeechSupported || whisperStatus?.ready === true;

  // Animate audio waveform while listening
  const startAudioWaveform = useCallback(() => {
    let phase = 0;
    let lastUpdate = 0;
    const animate = () => {
      phase += 0.15;
      const now = performance.now();
      if (now - lastUpdate >= 100) {
        const wave = Math.abs(Math.sin(phase) * 0.6 + Math.cos(phase * 2.3) * 0.4);
        setAudioLevel(0.2 + wave * 0.8);
        lastUpdate = now;
      }
      audioAnimationRef.current = requestAnimationFrame(animate);
    };
    audioAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  const stopAudioWaveform = useCallback(() => {
    if (audioAnimationRef.current !== null) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const scheduleRecognitionRestart = useCallback((recognition: SpeechRecognition, delay = 300) => {
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!shouldListenRef.current || speechPauseRef.current || speechGateRef.current || recognitionRef.current !== recognition) return;
      try {
        recognition.start();
      } catch {
        // Some browsers need a short gap after `onend` before start is legal.
        scheduleRecognitionRestart(recognition, 500);
      }
    }, delay);
  }, []);

  const stopWhisperCapture = useCallback((discard: boolean) => {
    discardCaptureRef.current = discard;
    if (captureFrameRef.current !== null) {
      cancelAnimationFrame(captureFrameRef.current);
      captureFrameRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* Recorder may already be stopping. */ }
    }
  }, []);

  const startWhisperCapture = useCallback(async () => {
    if (!shouldListenRef.current || speechPauseRef.current || speechGateRef.current || transcribingRef.current || recorderRef.current?.state === "recording") return;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support local microphone recording.");
      }
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      }
      if (!shouldListenRef.current || speechPauseRef.current || speechGateRef.current) {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        return;
      }
      if (!audioContextRef.current) {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(mediaStreamRef.current).connect(analyser);
        audioContextRef.current = context;
        analyserRef.current = analyser;
      }
      await audioContextRef.current.resume();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const recorder = new MediaRecorder(mediaStreamRef.current, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      discardCaptureRef.current = false;
      const startedAt = performance.now();
      let heardSpeech = false;
      let lastSpeechAt = startedAt;
      const samples = new Uint8Array(analyserRef.current!.fftSize);

      recorder.ondataavailable = (event) => {
        if (event.data.size && !speechGateRef.current) audioChunksRef.current.push(event.data);
        else if (speechGateRef.current) discardCaptureRef.current = true;
      };
      recorder.onerror = () => setError("Whisper could not record this microphone clip.");
      recorder.onstop = () => {
        recorderRef.current = null;
        if (captureFrameRef.current !== null) cancelAnimationFrame(captureFrameRef.current);
        captureFrameRef.current = null;
        stopAudioWaveform();
        setIsListening(false);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        const discard = discardCaptureRef.current || !shouldListenRef.current || speechPauseRef.current || speechGateRef.current;
        discardCaptureRef.current = false;
        if (discard || blob.size < 900) {
          if (shouldListenRef.current && !speechPauseRef.current && !speechGateRef.current) window.setTimeout(() => restartWhisperCaptureRef.current?.(), 180);
          return;
        }

        transcribingRef.current = true;
        void transcribeLocalAudio(blob).then((text) => {
          const transcriptText = text.trim();
          if (transcriptText && shouldListenRef.current && !speechGateRef.current) {
            setTranscript(transcriptText);
            setInterimTranscript("");
            processVoiceTranscriptRef.current(transcriptText);
          }
        }).catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : "Local Whisper transcription failed.");
        }).finally(() => {
          transcribingRef.current = false;
          if (shouldListenRef.current && !speechPauseRef.current && !speechGateRef.current) window.setTimeout(() => restartWhisperCaptureRef.current?.(), 220);
        });
      };

      recorder.start(160);
      setError(null);
      setIsListening(true);
      startAudioWaveform();
      const monitor = () => {
        if (recorderRef.current !== recorder || recorder.state !== "recording") return;
        if (speechGateRef.current) {
          discardCaptureRef.current = true;
          try { recorder.stop(); } catch { /* Recorder may already be stopping. */ }
          return;
        }
        const now = performance.now();
        analyserRef.current?.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const amplitude = (sample - 128) / 128;
          energy += amplitude * amplitude;
        }
        const rms = Math.sqrt(energy / samples.length);
        if (rms > 0.028) {
          heardSpeech = true;
          lastSpeechAt = now;
        }
        const silentAfterSpeech = heardSpeech && now - lastSpeechAt > 850;
        const idleTooLong = !heardSpeech && now - startedAt > 10_000;
        const utteranceTooLong = heardSpeech && now - startedAt > 18_000;
        if (silentAfterSpeech || idleTooLong || utteranceTooLong) {
          discardCaptureRef.current = !heardSpeech;
          try { recorder.stop(); } catch { /* Recorder may already be stopping. */ }
          return;
        }
        captureFrameRef.current = requestAnimationFrame(monitor);
      };
      captureFrameRef.current = requestAnimationFrame(monitor);
    } catch (cause) {
      shouldListenRef.current = false;
      setIsListening(false);
      setError(cause instanceof Error ? cause.message : "Could not start local Whisper microphone capture.");
      stopAudioWaveform();
    }
  }, [startAudioWaveform, stopAudioWaveform]);
  restartWhisperCaptureRef.current = () => { void startWhisperCapture(); };

  const speakResponse = useCallback((text: string) => {
    const resumeListening = shouldListenRef.current;
    const recognition = recognitionRef.current;
    speechSequenceRef.current += 1;
    if (resumeListening) {
      speechPauseRef.current = true;
      stopAudioWaveform();
      setIsListening(false);
      if (whisperModeRef.current) {
        stopWhisperCapture(true);
      } else if (recognition) {
        try { recognition.stop(); } catch { /* Recognition may already be ending. */ }
      }
    }

    if (!speak(text, { rate: 1.06 })) {
      speechPauseRef.current = false;
      if (resumeListening && whisperModeRef.current) restartWhisperCaptureRef.current?.();
      else if (resumeListening && recognition) scheduleRecognitionRestart(recognition, 300);
    }
  }, [scheduleRecognitionRestart, stopAudioWaveform, stopWhisperCapture, speak]);

  // Gate every recognition source, including speech initiated by Tuesday chat.
  useEffect(() => {
    if (isTuesdaySpeaking) {
      if (!shouldListenRef.current || speechPauseRef.current) return;
      speechPauseRef.current = true;
      stopAudioWaveform();
      setIsListening(false);
      if (whisperModeRef.current) stopWhisperCapture(true);
      else if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* Recognition may already be ending. */ }
      }
      return;
    }
    if (!shouldListenRef.current || !speechPauseRef.current) return;
    speechPauseRef.current = false;
    if (whisperModeRef.current) restartWhisperCaptureRef.current?.();
    else if (recognitionRef.current) scheduleRecognitionRestart(recognitionRef.current, 100);
  }, [isTuesdaySpeaking, scheduleRecognitionRestart, stopAudioWaveform, stopWhisperCapture]);

  // Execute a voice command directly or from speech recognition
  const executeCommand = useCallback(
    (text: string): ParsedVoiceResult => {
      unlockTuesdaySpeech();
      const metricCues = [
        /\b(?:heart\s*rate|pulse|bpm)\b/i,
        /\b(?:blood\s*pressure|\bbp\b)\b/i,
        /\b(?:glucose|blood\s*sugar)\b/i,
        /\b(?:temperature|\btemp\b)\b/i,
        /\b(?:sleep|slept)\b/i,
        /\b(?:ared|exercise(?:d|s|ing)?|workout|training|weights)\b/i,
        /\b(?:hydration|fluid\s*intake|water)\b/i,
        /\bmood\b/i,
      ];
      if (metricCues.filter((cue) => cue.test(text)).length > 1) {
        const routed: ParsedVoiceResult = {
          intent: "unknown",
          displayText: "Compound voice command sent to the on-device model",
          speechResponse: "I'm separating those commands now.",
          confidence: 0.82,
          rawText: text,
        };
        setLastAction(routed);
        optionsRef.current?.onCommand?.(routed);
        compoundCommandRef.current(text);
        return routed;
      }

      const parsed = parseVoiceCommand(text, dayRef.current);
      setLastAction(parsed);

      if (optionsRef.current?.onCommand) {
        optionsRef.current.onCommand(parsed);
      }

      // 1. Log measurement automatically without astronauts typing or wasting time
      if (parsed.intent === "log_measurement" && parsed.metricId && parsed.value !== undefined) {
        const recordedAt = new Date().toISOString();
        const res = store.logMeasurement({
          metricId: parsed.metricId,
          value: parsed.value,
          missionDay: parsed.targetDay ?? dayRef.current,
          recordedAt,
          source: "tuesday",
          notes: "Voice telemetry via Tuesday AI",
        });

        toast({
          tone: res.persisted ? "success" : "warning",
          title: "Reading logged",
          body: `${parsed.displayText}. Saved on this device.`,
        });

        // Speak the confirmation
        speakResponse(parsed.speechResponse);
      } else if (parsed.intent === "toggle_tuesday_mode") {
        if (optionsRef.current?.onToggleTuesdayMode) {
          optionsRef.current.onToggleTuesdayMode();
        }
        speakResponse(parsed.speechResponse);
      } else if (parsed.intent === "earth_view") {
        tuesdayRef.current.openRecharge("earth");
        speakResponse(parsed.speechResponse);
      } else if (parsed.intent === "breathe") {
        tuesdayRef.current.openRecharge("breathe");
        speakResponse(parsed.speechResponse);
      } else if (parsed.intent === "game") {
        tuesdayRef.current.openRecharge("game");
        speakResponse(parsed.speechResponse);
      } else if (parsed.intent === "medical_officer") {
        tuesdayRef.current.openContact();
        speakResponse(parsed.speechResponse);
      } else if (parsed.intent === "status_query" || parsed.intent === "help" || parsed.intent === "greeting") {
        speakResponse(parsed.speechResponse);
      } else {
        // Forward general query to Tuesday companion chat
        void tuesdayRef.current.ask(text, undefined, speakResponse);
      }

      return parsed;
    },
    [store, toast, speakResponse],
  );
  processVoiceTranscriptRef.current = (text) => { executeCommand(text); };
  compoundCommandRef.current = (text) => {
    const current = tuesdayRef.current;
    const model = current.model.state === "ready" ? current.model.choice.chat : null;
    const endpoint = current.data.settings.endpoint;
    if (!model) {
      void current.ask(text, undefined, speakResponse);
      return;
    }
    void splitVoiceCommands({ endpoint, model, transcript: text }).then((commands) => {
      const parsedCommands = (commands ?? []).map((command) => parseVoiceCommand(command, dayRef.current));
      const validCommands = parsedCommands.filter((command) =>
        command.intent === "log_measurement" && command.metricId && command.value !== undefined,
      );
      if (validCommands.length > 1) {
        for (const command of validCommands) executeCommand(command.rawText);
        return;
      }
      void tuesdayRef.current.ask(text, undefined, speakResponse);
    }).catch(() => {
      void tuesdayRef.current.ask(text, undefined, speakResponse);
    });
  };

  // Initialize SpeechRecognition instance
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
      recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      if (speechGateRef.current || speechPauseRef.current) {
        try { recognition.stop(); } catch { /* Speech gate is already closing recognition. */ }
        return;
      }
      setIsListening(true);
      setError(null);
      startAudioWaveform();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (speechGateRef.current || speechPauseRef.current) return;
      let interim = "";
      const finalParts: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (!item || !item.length || !item[0]) continue;
        if (item.isFinal) {
          const alternatives: Array<{ text: string; confidence: number; score: number }> = [];
          for (let alternative = 0; alternative < item.length; alternative++) {
            const result = item[alternative];
            if (result?.transcript.trim()) {
              const text = result.transcript.trim();
              const parsed = parseVoiceCommand(text, dayRef.current);
              alternatives.push({
                text,
                confidence: result.confidence ?? 0,
                score: (result.confidence ?? 0) + (parsed.intent === "unknown" ? 0 : 0.12),
              });
            }
          }
          alternatives.sort((a, b) => b.score - a.score);
          if (alternatives[0]) finalParts.push(alternatives[0].text);
        } else {
          interim += item[0].transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (finalParts.length) {
        // Some Web Speech implementations replay the previous final result after
        // `stop()` / `start()`. Ignore that replay so command two cannot re-log
        // command one's value under the wrong vital.
        const now = Date.now();
        for (const [key, time] of recentCommandKeysRef.current) {
          if (now - time >= 8_000) recentCommandKeysRef.current.delete(key);
        }
        const previous = lastCommandRef.current;
        const isRecentReplay = previous && now - previous.time < 8_000;
        const previousWordCount = previous?.key.split(" ").length ?? 0;
        const freshParts = finalParts.flatMap((part) => {
          if (!isRecentReplay) return [part];
          const partKey = part.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
          if (recentCommandKeysRef.current.has(partKey)) return [];
          if (partKey.startsWith(`${previous.key} `)) {
            const remainder = part.split(/\s+/).slice(previousWordCount).join(" ");
            return remainder ? [remainder] : [];
          }
          return [part];
        });
        const trimmed = freshParts.join(" ").replace(/\s+/g, " ").trim();
        if (!trimmed) return;
        setTranscript(trimmed);
        setInterimTranscript("");
        const key = trimmed.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        if (recentCommandKeysRef.current.has(key)) return;
        lastCommandRef.current = { key, time: now };
        recentCommandKeysRef.current.set(key, now);
        executeCommand(trimmed);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
        shouldListenRef.current = false;
        setIsListening(false);
        setError(`Speech error: ${event.error}`);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      stopAudioWaveform();
      // If the user hasn't explicitly stopped, restart continuous listening
      setIsListening(false);
      if (shouldListenRef.current && !speechPauseRef.current && !speechGateRef.current) scheduleRecognitionRestart(recognition);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      speechPauseRef.current = false;
      stopAudioWaveform();
      stopWhisperCapture(true);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      try {
        recognition.stop();
      } catch {
        // Ignored
      }
    };
  }, [isSupported, executeCommand, startAudioWaveform, stopAudioWaveform, scheduleRecognitionRestart, stopWhisperCapture]);

  const startListening = useCallback(() => {
    unlockTuesdaySpeech();
    if ((!recognitionRef.current && !whisperStatus?.ready) || shouldListenRef.current || speechGateRef.current) return;
    shouldListenRef.current = true;
    speechPauseRef.current = false;
    setError(null);
    if (whisperStatus?.ready) {
      whisperModeRef.current = true;
      void startWhisperCapture();
      return;
    }
    whisperModeRef.current = false;
    try {
      recognitionRef.current?.start();
    } catch {
      if (recognitionRef.current) scheduleRecognitionRestart(recognitionRef.current, 400);
    }
  }, [scheduleRecognitionRestart, startWhisperCapture, whisperStatus?.ready]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    speechPauseRef.current = false;
    speechSequenceRef.current += 1;
    setIsListening(false);
    stopAudioWaveform();
    stopTuesdaySpeech();
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
    if (whisperModeRef.current) {
      stopWhisperCapture(true);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      const audioContext = audioContextRef.current;
      audioContextRef.current = null;
      analyserRef.current = null;
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
    }
    whisperModeRef.current = false;
  }, [stopAudioWaveform, stopWhisperCapture, stopTuesdaySpeech]);

  const toggleListening = useCallback(() => {
    if (speechGateRef.current) {
      const wasListening = shouldListenRef.current;
      stopTuesdaySpeech();
      if (!wasListening) window.setTimeout(() => startListening(), 330);
      return;
    }
    if (shouldListenRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening, stopTuesdaySpeech]);

  return {
    isSupported,
    provider: whisperStatus?.ready ? "whisper" : browserSpeechSupported ? "browser" : "unavailable",
    isListening,
    transcript,
    interimTranscript,
    lastAction,
    audioLevel,
    getAnalyser,
    error,
    startListening,
    stopListening,
    toggleListening,
    executeCommand,
  };
}
