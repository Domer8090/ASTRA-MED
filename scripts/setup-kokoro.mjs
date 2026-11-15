import { createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const modelDir = process.env.ASTRA_VOICE_MODEL_DIR || path.join(homedir(), ".cache", "astra-med", "voice");
const venvPython = path.join(modelDir, ".venv", "bin", "python");
const files = [
  ["kokoro-v1.0.onnx", "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx", 100_000_000],
  ["voices-v1.0.bin", "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin", 1_000_000],
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code ?? "no status"}.`)));
  });
}

await mkdir(modelDir, { recursive: true });
try { await stat(venvPython); } catch { await run(process.env.PYTHON || "python3.12", ["-m", "venv", path.join(modelDir, ".venv")]); }
await run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"]);
await run(venvPython, ["-m", "pip", "install", "kokoro-onnx", "soundfile"]);

for (const [filename, url, minSize] of files) {
  const output = path.join(modelDir, filename);
  let installed = false;
  try { installed = (await stat(output)).size > minSize; } catch { /* Fetch below. */ }
  if (installed) {
    console.log(`Kokoro asset already installed: ${output}`);
    continue;
  }
  const temp = `${output}.download`;
  console.log(`Downloading ${filename}…`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`${filename} download failed (HTTP ${response.status}).`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temp));
  const downloaded = await stat(temp);
  if (downloaded.size < minSize) throw new Error(`${filename} download is incomplete.`);
  await rename(temp, output);
}

console.log("Kokoro ONNX is ready. Start the helper with: npm run voice:local");
