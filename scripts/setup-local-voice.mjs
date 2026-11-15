import { createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const modelDir = process.env.ASTRA_VOICE_MODEL_DIR || path.join(homedir(), ".cache", "astra-med", "voice");
const modelPath = path.join(modelDir, "ggml-base.en.bin");
const tempPath = `${modelPath}.download`;
const modelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code ?? "no status"}.`)));
  });
}

await mkdir(modelDir, { recursive: true });
let modelExists = false;
try { modelExists = (await stat(modelPath)).size > 100_000_000; } catch { /* download below */ }
if (!modelExists) {
  console.log("Downloading the 142 MB English Whisper base model…");
  const response = await fetch(modelUrl, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`Whisper model download failed (HTTP ${response.status}).`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath));
  const downloaded = await stat(tempPath);
  if (downloaded.size < 100_000_000) throw new Error("Downloaded Whisper model is incomplete.");
  await rename(tempPath, modelPath);
  console.log(`Whisper model saved to ${modelPath}`);
} else {
  console.log(`Whisper model already installed at ${modelPath}`);
}

await run("ollama", ["pull", "qwen3:4b"]);
console.log("Local voice models are ready. Start the helper with: npm run voice:local");
