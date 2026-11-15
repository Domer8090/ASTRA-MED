/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Serves and bundles the MediaPipe WebAssembly runtime from node_modules at
 * /mediapipe/, so camera hand tracking works with no network. Only the SIMD
 * build is shipped; every current browser supports WebAssembly SIMD.
 */
function mediapipeWasm(): Plugin {
  const dir = resolve(__dirname, "node_modules/@mediapipe/tasks-vision/wasm");
  const files = ["vision_wasm_internal.js", "vision_wasm_internal.wasm"];
  return {
    name: "astra-mediapipe-wasm",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0]?.split("/mediapipe/")[1];
        if (!name || !files.includes(name)) return next();
        res.setHeader("Content-Type", name.endsWith(".wasm") ? "application/wasm" : "text/javascript");
        res.end(readFileSync(resolve(dir, name)));
      });
    },
    generateBundle() {
      for (const name of files) this.emitFile({ type: "asset", fileName: `mediapipe/${name}`, source: readFileSync(resolve(dir, name)) });
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the app from /ASTRA-MED/; local builds stay at the root.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), mediapipeWasm()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: false },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/._*", "node_modules/**", "dist/**"],
    environment: "node",
    // Tests describe the default DEMO_KEY behaviour, whatever key a developer has in .env.local.
    env: { VITE_NASA_API_KEY: "DEMO_KEY" },
  },
});
