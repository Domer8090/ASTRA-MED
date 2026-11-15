import { createServer } from "node:http";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile, spawn } from "node:child_process";
import { createInterface } from "node:readline";

const execFileAsync = promisify(execFile);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = "127.0.0.1";
const PORT = Number(process.env.ASTRA_VOICE_PORT || 11435);
const MODEL_DIR = process.env.ASTRA_VOICE_MODEL_DIR || path.join(homedir(), ".cache", "astra-med", "voice");
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(MODEL_DIR, "ggml-base.en.bin");
const KOKORO_MODEL = process.env.KOKORO_MODEL || path.join(MODEL_DIR, "kokoro-v1.0.onnx");
const KOKORO_VOICES = process.env.KOKORO_VOICES || path.join(MODEL_DIR, "voices-v1.0.bin");
const KOKORO_PYTHON = process.env.KOKORO_PYTHON || path.join(MODEL_DIR, ".venv", "bin", "python");
const WHISPER_BIN = process.env.WHISPER_BIN || "whisper-cli";
const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const ALLOWED_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "app://astra"]);
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_TTS_TEXT = 700;
const THREADS = Math.max(2, Math.min(8, Number(process.env.ASTRA_VOICE_THREADS || 6)));
let transcribing = false;
let kokoroWorker = null;
let kokoroReady = false;
let workerQueue = Promise.resolve();
let workerRequestId = 0;
const workerPending = new Map();

function send(res, status, body, origin = "", extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    ...extraHeaders,
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function available(command, args) {
  try {
    await execFileAsync(command, args, { timeout: 2500, maxBuffer: 64 * 1024 });
    return true;
  } catch (error) {
    return Boolean(error && typeof error === "object" && (("stdout" in error && error.stdout) || ("stderr" in error && error.stderr)));
  }
}

async function readBody(req, maxBytes = MAX_AUDIO_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error(`Request is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    chunks.push(chunk);
  }
  if (!size) throw new Error("No request body was received.");
  return Buffer.concat(chunks);
}

function startKokoroWorker() {
  if (!process.env.KOKORO_DISABLE && process.platform === "darwin") {
    void Promise.all([access(KOKORO_MODEL), access(KOKORO_VOICES)]).then(() => {
      kokoroWorker = spawn(KOKORO_PYTHON, [path.join(ROOT, "kokoro-worker.py"), KOKORO_MODEL, KOKORO_VOICES], {
        cwd: ROOT,
        stdio: ["pipe", "pipe", "inherit"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });
      const lines = createInterface({ input: kokoroWorker.stdout });
      lines.on("line", (line) => {
        let message;
        try { message = JSON.parse(line); } catch { return; }
        if (message.ready === true) {
          kokoroReady = true;
          console.log("Kokoro ONNX worker ready (voice am_adam).");
          return;
        }
        const pending = workerPending.get(message.id);
        if (!pending) return;
        workerPending.delete(message.id);
        if (message.error) pending.reject(new Error(String(message.error)));
        else if (typeof message.audio === "string") pending.resolve(Buffer.from(message.audio, "base64"));
        else pending.reject(new Error("Kokoro worker returned no audio."));
      });
      kokoroWorker.once("error", (error) => {
        kokoroReady = false;
        console.warn(`Kokoro worker could not start: ${error.message}`);
      });
      kokoroWorker.once("exit", (code) => {
        kokoroReady = false;
        kokoroWorker = null;
        for (const pending of workerPending.values()) pending.reject(new Error(`Kokoro worker exited (${code ?? "unknown"}).`));
        workerPending.clear();
        console.warn(`Kokoro worker stopped (${code ?? "unknown"}); using system voice fallback.`);
      });
    }).catch(() => {
      console.log("Kokoro model files not found; neural TTS unavailable, system voice fallback enabled.");
    });
  }
}

function generateKokoro(text, voice) {
  const task = workerQueue.then(() => new Promise((resolve, reject) => {
    if (!kokoroReady || !kokoroWorker?.stdin.writable) return reject(new Error("Kokoro worker is not ready."));
    const id = ++workerRequestId;
    workerPending.set(id, { resolve, reject });
    kokoroWorker.stdin.write(`${JSON.stringify({ id, text, voice })}\n`, (error) => {
      if (error) {
        workerPending.delete(id);
        reject(error);
      }
    });
  }));
  workerQueue = task.then(() => undefined, () => undefined);
  return task;
}

async function transcribe(req, res, origin) {
  if (transcribing) return send(res, 429, { error: "Tuesday is already transcribing a clip." }, origin);
  transcribing = true;
  let workDir;
  try {
    const mime = String(req.headers["content-type"] || "audio/webm").split(";")[0].toLowerCase();
    const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
    const audio = await readBody(req);
    workDir = await mkdtemp(path.join(tmpdir(), "astra-voice-"));
    const source = path.join(workDir, `capture.${extension}`);
    const wav = path.join(workDir, "capture.wav");
    await writeFile(source, audio);
    try {
      await execFileAsync(FFMPEG_BIN, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", source, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], { timeout: 15000, maxBuffer: 256 * 1024 });
    } catch (decodeError) {
      const stderr = decodeError && typeof decodeError === "object" && "stderr" in decodeError ? String(decodeError.stderr).trim() : String(decodeError);
      console.warn(`Could not decode a ${mime} clip of ${audio.length} bytes (first bytes ${audio.subarray(0, 4).toString("hex")}): ${stderr.slice(0, 400)}`);
      throw new Error("That audio clip could not be read. Please say it again.");
    }
    const result = await execFileAsync(WHISPER_BIN, ["--no-prints", "--no-timestamps", "--language", "en", "--threads", String(THREADS), "--model", WHISPER_MODEL, "--file", wav], { timeout: 45000, maxBuffer: 1024 * 1024 });
    const transcript = result.stdout.trim().replace(/^\[[^\]]+\]\s*/gm, "").trim();
    return send(res, 200, { transcript }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local transcription failed.";
    return send(res, 503, { error: message.slice(0, 220) }, origin);
  } finally {
    transcribing = false;
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function synthesize(req, res, origin) {
  if (!kokoroReady) return send(res, 503, { fallback: true, error: "Local Kokoro TTS is not installed or ready." }, origin);
  try {
    const raw = await readBody(req, 16 * 1024);
    let body;
    try { body = JSON.parse(raw.toString("utf8")); } catch { return send(res, 400, { error: "Expected a JSON request." }, origin); }
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" && /^[a-z0-9_]{2,32}$/i.test(body.voice) ? body.voice : "am_adam";
    if (!text) return send(res, 400, { error: "Text is required." }, origin);
    if (text.length > MAX_TTS_TEXT) return send(res, 413, { error: `Text is limited to ${MAX_TTS_TEXT} characters.` }, origin);
    const audio = await generateKokoro(text, voice);
    res.writeHead(200, {
      "Content-Type": "audio/wav",
      "Content-Length": audio.length,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
    });
    res.end(audio);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kokoro synthesis failed.";
    return send(res, 503, { fallback: true, error: message.slice(0, 220) }, origin);
  }
}

startKokoroWorker();
const server = createServer(async (req, res) => {
  const origin = String(req.headers.origin || "");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { error: "Origin is not allowed." });
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" });
    return res.end();
  }
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  if (req.method === "GET" && url.pathname === "/health") {
    const [whisper, ffmpeg, model, ollama] = await Promise.all([
      available(WHISPER_BIN, ["--version"]),
      available(FFMPEG_BIN, ["-version"]),
      access(WHISPER_MODEL).then(() => true, () => false),
      fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(1200) }).then((response) => response.ok, () => false),
    ]);
    return send(res, 200, { ready: whisper && ffmpeg && model, whisper: whisper && ffmpeg && model, ffmpeg, model, ollama, tts: kokoroReady ? "kokoro" : "system", engine: "whisper.cpp base.en" }, origin);
  }
  if (req.method === "POST" && url.pathname === "/transcribe") return transcribe(req, res, origin);
  if (req.method === "POST" && url.pathname === "/tts") return synthesize(req, res, origin);
  return send(res, 404, { error: "Not found." }, origin);
});

server.listen(PORT, HOST, () => {
  console.log(`ASTRA-MED local voice listening on http://${HOST}:${PORT}`);
  console.log(`Whisper model: ${WHISPER_MODEL}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      kokoroWorker?.kill("SIGTERM");
      process.exit(0);
    });
  });
}
