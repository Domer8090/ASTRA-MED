const DEFAULT_WHISPER_ENDPOINT = "http://127.0.0.1:11435";

export interface WhisperStatus {
  ready: boolean;
  whisper: boolean;
  ollama: boolean;
  tts: "kokoro" | "piper" | "system";
  ffmpeg: boolean;
  model: boolean;
  engine: string;
  modelPath?: string;
}

function localUrl(path: string): string {
  return `${DEFAULT_WHISPER_ENDPOINT}${path}`;
}

export async function checkLocalWhisper(signal?: AbortSignal): Promise<WhisperStatus | null> {
  try {
    const response = await fetch(localUrl("/health"), {
      signal: signal ?? AbortSignal.timeout(1200),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return null;
    const value = body as Partial<WhisperStatus>;
    if (typeof value.ready !== "boolean" || typeof value.whisper !== "boolean" || typeof value.model !== "boolean") return null;
    return value as WhisperStatus;
  } catch {
    return null;
  }
}

export async function transcribeLocalAudio(blob: Blob, signal?: AbortSignal): Promise<string> {
  const response = await fetch(localUrl("/transcribe"), {
    method: "POST",
    headers: { "Content-Type": blob.type || "audio/webm" },
    body: blob,
    signal: signal ?? AbortSignal.timeout(50_000),
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object") throw new Error("Whisper returned an unreadable response.");
  const payload = body as { transcript?: unknown; error?: unknown };
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Whisper transcription failed.");
  if (typeof payload.transcript !== "string") throw new Error("Whisper did not return a transcript.");
  return payload.transcript.trim();
}

export async function synthesizeLocalSpeech(text: string, voice = "am_adam", signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(localUrl("/tts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
    signal: signal ?? AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error : "Local speech synthesis is unavailable.");
  }
  return response.blob();
}
