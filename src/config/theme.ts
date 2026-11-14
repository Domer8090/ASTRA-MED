/**
 * Colour tokens for code that needs hex values (Recharts, inline SVG).
 * These mirror tailwind.config.js and must stay identical to it.
 */
import type { HealthStatus } from "../types/health";

export const COLORS = {
  space: "#060B14",
  panel: "#0D1526",
  raised: "#111D31",
  line: "#1D344B",
  lineSoft: "#16283B",
  lineStrong: "#2A4A68",
  ink: "#E8F0FA",
  ink2: "#91A4BA",
  ink3: "#647A93",
  cyan: "#42D9F5",
  blue: "#4C8DFF",
  nominal: "#22C55E",
  caution: "#F59E0B",
  critical: "#F43F5E",
} as const;

export const STATUS_COLOR: Record<HealthStatus, string> = {
  NOMINAL: COLORS.nominal,
  CAUTION: COLORS.caution,
  CRITICAL: COLORS.critical,
};

export const STATUS_TEXT_CLASS: Record<HealthStatus, string> = {
  NOMINAL: "text-nominal",
  CAUTION: "text-caution",
  CRITICAL: "text-critical",
};
