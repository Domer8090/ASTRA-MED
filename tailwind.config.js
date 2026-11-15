/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/[!._]*.{ts,tsx}"],
  theme: {
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
    extend: {
      colors: {
        space: "#060B14",
        panel: "#0D1526",
        raised: "#111D31",
        line: { DEFAULT: "#1D344B", soft: "#16283B", strong: "#2A4A68" },
        ink: { DEFAULT: "#E8F0FA", 2: "#91A4BA", 3: "#647A93" },
        cyan: { DEFAULT: "#42D9F5", deep: "#1B8FA6" },
        blue: { DEFAULT: "#4C8DFF" },
        /* Tuesday, the crew companion. Kept apart from status colours and the clinical cyan. */
        tue: { DEFAULT: "#B9A6FF", deep: "#7461D8" },
        nominal: "#22C55E",
        caution: "#F59E0B",
        critical: "#F43F5E",
      },
      fontFamily: {
        sans: ['"Barlow"', "system-ui", "sans-serif"],
        cond: ['"Barlow Semi Condensed"', '"Barlow"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "21px" }],
        md: ["16px", { lineHeight: "24px" }],
        lg: ["20px", { lineHeight: "26px" }],
        xl: ["28px", { lineHeight: "32px" }],
        "2xl": ["40px", { lineHeight: "42px" }],
      },
      borderRadius: { DEFAULT: "6px", badge: "6px", control: "8px", tile: "12px", panel: "16px" },
      letterSpacing: { label: "0.06em", status: "0.08em" },
      transitionTimingFunction: {
        "smooth-out": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
