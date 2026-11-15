import { defineConfig } from "vite";

/**
 * Builds the ASTRA-MED core (engines only, no UI) as one self-contained
 * script. Output: dist-core/astra-core.js, which defines `globalThis.AstraCore`.
 * The iPad app bundles this file; the CLI loads it in Node.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist-core",
    emptyOutDir: true,
    target: "es2020",
    minify: false,
    lib: {
      entry: "src/core/bundle.ts",
      name: "AstraCoreBundle",
      formats: ["iife"],
      fileName: () => "astra-core.js",
    },
  },
});
