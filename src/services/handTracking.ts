/**
 * MediaPipe Hand Landmarker, loaded only when the crew member turns on hand
 * control. Camera frames are processed in this browser and never leave the
 * device. The WebAssembly runtime (copied from node_modules by vite.config.ts)
 * and the model (public/models, from `npm run assets:fetch`) ship with the
 * app, so hand control needs no network.
 */
import type { HandLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE = `${import.meta.env.BASE_URL}mediapipe`;
const MODEL_URL = `${import.meta.env.BASE_URL}models/hand_landmarker.task`;

export async function createHandLandmarker(numHands: 1 | 2 = 1): Promise<HandLandmarker> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numHands,
    minHandDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  try {
    return await HandLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    return HandLandmarker.createFromOptions(fileset, options("CPU"));
  }
}
