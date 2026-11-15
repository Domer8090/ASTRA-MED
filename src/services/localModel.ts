/**
 * Client for a language model running on this device through Ollama
 * (https://ollama.com). Tuesday sends the health brief, retrieved passages and
 * images only to a localhost endpoint; any other host is refused before a
 * request is made. Nothing here throws into the UI: failures return null or
 * an error message.
 */

export const DEFAULT_ENDPOINT = "http://localhost:11434";
/** No first word from the model within this time: answer with onboard rules instead. */
export const FIRST_TOKEN_TIMEOUT_MS = 20_000;
/** Tuesday's answers are short; capping length keeps them fast on a busy machine. */
const MAX_REPLY_TOKENS = 220;

/** Remove a reasoning block, finished or still streaming. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/i, "").trimStart();
}

/** Append Qwen's /no_think switch to the last user message. */
function noThink<T extends { role: string; content: string }>(messages: readonly T[]): T[] {
  const last = messages.map((m) => m.role).lastIndexOf("user");
  return messages.map((m, i) => (i === last && !m.content.includes("/no_think") ? { ...m, content: `${m.content} /no_think` } : m));
}

/** Hard limit for a whole model answer. */
export const ANSWER_TIMEOUT_MS = 90_000;
/** After a slow or failed answer, skip the model for this long and answer from onboard rules at once. */
const SLOW_BACKOFF_MS = 2 * 60_000;
let slowUntil = 0;

/** True while the local model recently failed to answer in time. */
export function modelRecentlySlow(now = Date.now()): boolean {
  return now < slowUntil;
}

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
/**
 * Load a model into memory ahead of the first question, so it doesn't wait for a
 * cold start. Sends no prompt and no health data: an empty request just loads it.
 */
export function warmUpModel(endpoint: string, model: string, prefix: ChatMessage[] = []): void {
  const url = endpointUrl(endpoint, "/api/chat");
  if (!url) return;
  // With a prefix (Tuesday's fixed instructions), Ollama also caches it, so a later
  // question reads fewer new tokens. One output token, then stop.
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: prefix,
      stream: false,
      keep_alive: "30m",
      ...(isThinkingModel(model) ? { think: false } : {}),
      options: { num_ctx: 4096, num_predict: 1 },
    }),
  }).catch(() => undefined);
}

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
  // Small models without a hidden thinking pass answer fastest. Some Ollama builds cannot
  // switch Qwen3's thinking off, which made Tuesday take 20+ seconds, so it comes last.
  const chat =
    has(preferred.chat) ??
    find(/llama3\.2/i) ??
    find(/qwen2\.5/i) ??
    find(/gemma3/i) ??
    find(/phi/i) ??
    find(/llama3/i) ??
    find(/qwen3/i) ??
    find(/qwen/i) ??
    installed.find((n) => !EMBEDDING.test(n) && n !== medical) ??
    medical;
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
  /** Override the first-word time limit (voice uses a shorter one). */
  firstTokenTimeoutMs?: number;
  format?: "json" | JsonObjectSchema;
  temperature?: number;
}): Promise<string> {
  const url = endpointUrl(args.endpoint, "/api/chat");
  if (!url) return "ERROR: The model endpoint must be on this device (localhost).";
  // A stuck model must never leave Tuesday silent: give up if no words arrive
  // in time, or if the whole answer takes too long, and let the caller fall back.
  const thinking = isThinkingModel(args.model);
  const local = new AbortController();
  let timedOut = false;
  const giveUp = () => {
    timedOut = true;
    local.abort();
  };
  args.signal?.addEventListener("abort", () => local.abort(), { once: true });
  let firstToken: ReturnType<typeof setTimeout> | undefined = setTimeout(giveUp, args.firstTokenTimeoutMs ?? FIRST_TOKEN_TIMEOUT_MS);
  const overall = setTimeout(giveUp, ANSWER_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: local.signal,
      body: JSON.stringify({
        model: args.model,
        messages: thinking ? noThink(args.messages) : args.messages,
        stream: true,
        // Qwen3 answers faster without its thinking pass; Tuesday wants short replies.
        // Some Ollama builds ignore `think`, so the prompt also carries /no_think.
        ...(thinking ? { think: false } : {}),
        ...(args.format ? { format: args.format } : {}),
        // Stay loaded between questions so a reply never waits for a reload.
        keep_alive: "30m",
        options: { temperature: args.temperature ?? 0.3, num_ctx: 4096, num_predict: args.format ? 1024 : MAX_REPLY_TOKENS },
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
            if (firstToken && chunk.message.content) {
              clearTimeout(firstToken);
              firstToken = undefined;
            }
            text += chunk.message.content;
            args.onToken?.(stripThinking(text));
          }
        } catch {
          // Ignore a malformed line; the stream continues.
        }
      }
    }
    return stripThinking(text);
  } catch (e) {
    if (timedOut) {
      slowUntil = Date.now() + SLOW_BACKOFF_MS;
      return "ERROR: The local model took too long to answer.";
    }
    if (e instanceof DOMException && e.name === "AbortError") return "ERROR: Stopped.";
    slowUntil = Date.now() + SLOW_BACKOFF_MS;
    return "ERROR: The local model is not reachable.";
  } finally {
    if (firstToken) clearTimeout(firstToken);
    clearTimeout(overall);
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
