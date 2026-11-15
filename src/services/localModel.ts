/**
 * Client for a language model running on this device through Ollama
 * (https://ollama.com). Tuesday sends the health brief, retrieved passages and
 * images only to a localhost endpoint; any other host is refused before a
 * request is made. Nothing here throws into the UI: failures return null or
 * an error message.
 */

export const DEFAULT_ENDPOINT = "http://localhost:11434";

export interface ModelChoice {
  /** Fast conversational model, Qwen3 4B preferred for voice routing. */
  chat: string | null;
  /** Multimodal medical model for images and lab reports, MedGemma preferred. */
  medical: string | null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /** Base64 images (no data: prefix) for multimodal models. */
  images?: string[];
}

export interface JsonObjectSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties?: boolean;
}

/** Only the loopback interface counts as on-device. */
export function isLocalEndpoint(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || h.endsWith(".localhost");
  } catch {
    return false;
  }
}

function endpointUrl(endpoint: string, path: string): string | null {
  if (!isLocalEndpoint(endpoint)) return null;
  return `${endpoint.replace(/\/+$/, "")}${path}`;
}

/** Installed model names, or null when no local runtime answers. */
export async function listLocalModels(endpoint: string, signal?: AbortSignal): Promise<string[] | null> {
  const url = endpointUrl(endpoint, "/api/tags");
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object" || !Array.isArray((body as { models?: unknown }).models)) return null;
    return (body as { models: unknown[] }).models
      .map((m) => (m && typeof m === "object" && typeof (m as { name?: unknown }).name === "string" ? (m as { name: string }).name : null))
      .filter((n): n is string => n !== null);
  } catch {
    return null;
  }
}

const EMBEDDING = /embed|bge|minilm|nomic/i;

/** Pick models by preference: an explicit choice if installed, else Qwen3 / MedGemma, else any chat model. */
export function chooseModels(installed: readonly string[], preferred: Partial<ModelChoice> = {}): ModelChoice {
  const has = (name: string | null | undefined) => (name && installed.includes(name) ? name : null);
  const find = (re: RegExp) => installed.find((n) => re.test(n)) ?? null;
  const medical = has(preferred.medical) ?? find(/medgemma/i);
  const chat = has(preferred.chat) ?? find(/qwen3/i) ?? find(/qwen/i) ?? installed.find((n) => !EMBEDDING.test(n) && n !== medical) ?? medical;
  return { chat, medical };
}

export function isThinkingModel(name: string): boolean {
  return /qwen3|deepseek-r1|gpt-oss/i.test(name);
}

/**
 * Stream a chat answer. Calls `onToken` with the text so far. Returns the full
 * text, or an error message prefixed with "ERROR:".
 */
export async function streamChat(args: {
  endpoint: string;
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onToken?: (textSoFar: string) => void;
  format?: "json" | JsonObjectSchema;
  temperature?: number;
}): Promise<string> {
  const url = endpointUrl(args.endpoint, "/api/chat");
  if (!url) return "ERROR: The model endpoint must be on this device (localhost).";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: args.signal ?? null,
      body: JSON.stringify({
        model: args.model,
        messages: args.messages,
        stream: true,
        // Qwen3 answers faster without its thinking pass; Tuesday wants short replies.
        ...(isThinkingModel(args.model) ? { think: false } : {}),
        ...(args.format ? { format: args.format } : {}),
        options: { temperature: args.temperature ?? 0.3, num_ctx: 4096 },
      }),
    });
    if (!res.ok || !res.body) return `ERROR: The local model answered HTTP ${res.status}.`;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as { message?: { content?: unknown }; error?: unknown };
          if (typeof chunk.error === "string") return `ERROR: ${chunk.error}`;
          if (typeof chunk.message?.content === "string") {
            text += chunk.message.content;
            args.onToken?.(text);
          }
        } catch {
          // Ignore a malformed line; the stream continues.
        }
      }
    }
    return text;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "ERROR: Stopped.";
    return "ERROR: The local model is not reachable.";
  }
}

/**
 * Ask a localhost model to separate a compound voice request into exact source
 * phrases. Callers still validate every phrase with the deterministic parser;
 * the model cannot invent or directly write a reading.
 */
export async function splitVoiceCommands(args: {
  endpoint: string;
  model: string;
  transcript: string;
  signal?: AbortSignal;
}): Promise<string[] | null> {
  const raw = await streamChat({
    endpoint: args.endpoint,
    model: args.model,
    signal: args.signal,
    format: {
      type: "object",
      properties: { commands: { type: "array", items: { type: "string" } } },
      required: ["commands"],
      additionalProperties: false,
    },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Split the user's spoken request into 1 to 4 separate command phrases only when it contains multiple commands. Return JSON with one property: commands, an array of exact contiguous quotes copied verbatim from the user's words. Do not infer, correct, or add numbers. If it is not multiple commands, return {\"commands\":[]}. /no_think",
      },
      { role: "user", content: args.transcript.slice(0, 1200) },
    ],
  });
  if (!raw || raw.startsWith("ERROR:")) return null;
  const cleanRaw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleanRaw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { commands?: unknown }).commands)) return null;
    const source = args.transcript.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const commands = (parsed as { commands: unknown[] }).commands
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim())
      .filter((part) => {
        const quote = part.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        return quote.length > 0 && source.includes(quote);
      })
      .slice(0, 4);
    return commands.length > 1 ? commands : null;
  } catch {
    return null;
  }
}

/**
 * Shrink an image on the device before it goes to the local model. MedGemma
 * reads images at 896 × 896, so larger photos only cost time. Returns base64
 * JPEG without the data: prefix.
 */
export async function compressImage(file: Blob, maxSide = 896, quality = 0.85): Promise<{ base64: string; width: number; height: number; bytes: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    return { base64, width, height, bytes: Math.round((base64.length * 3) / 4) };
  } catch {
    return null;
  }
}
