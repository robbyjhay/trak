import type { Config } from "tailwindcss";

/**
 * Design tokens for Trak (extracted from trakprototype).
 * Tailwind v4 primarily consumes these via @theme in globals.css;
 * this file remains the single source of truth for token values and is
 * referenced with @config so theme.extend stays discoverable.
 */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        aztec: {
          DEFAULT: "#0d1d1a",
          2: "#122b26",
          3: "#193b34",
        },
        saffron: {
          DEFAULT: "#f6c642",
          dim: "#8a6a1f",
        },
        paper: "#fbfaf6",
        card: "#ffffff",
        ink: {
          DEFAULT: "#12211d",
          soft: "#5f7069",
          faint: "#93a29b",
        },
        line: "#e6e3d9",
        good: {
          DEFAULT: "#2e7d5b",
          bg: "#eaf6f0",
        },
        warning: {
          DEFAULT: "#c99f2f",
          bg: "#fdf3d8",
          ink: "#8a6a1f",
        },
        critical: {
          DEFAULT: "#b5453a",
          bg: "#fbeceb",
        },
        neutral: {
          DEFAULT: "#3a4a44",
          bg: "#eef0ec",
        },
        cat: {
          meeting: "#3b82f6",
          project: "#8b5cf6",
          program: "#0ea5e9",
          task: "#6366f1",
        },
        wa: "#25d366",
      },
      fontFamily: {
        // Fraunces — display / headings
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        // Archivo — interface sans
        sans: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
        // JetBrains Mono — metadata / technical values
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Common prototype scales (optional helpers)
      },
      borderRadius: {
        card: "18px",
        rail: "12px",
      },
      width: {
        rail: "76px",
      },
      height: {
        topbar: "68px",
      },
      maxWidth: {
        content: "1360px",
      },
      boxShadow: {
        toast: "0 20px 40px rgba(0,0,0,.3)",
        modal: "0 30px 60px rgba(0,0,0,.3)",
        rail: "0 4px 12px rgba(0,0,0,.3)",
        card: "0 1px 3px rgba(13,29,26,.04), 0 12px 28px -14px rgba(13,29,26,.14)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
