/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves the app from /ASTRA-MED/; local builds stay at the root.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
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
