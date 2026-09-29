import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Linear & Raycast Pro Design System
        obsidian: {
          bg: "#08090A",
          surface: "#101114",
          surfaceHover: "#15171C",
          surfaceElevated: "#191B22",
        },
        linearBorder: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(255, 255, 255, 0.16)",
          active: "rgba(255, 255, 255, 0.25)",
        },
        linearText: {
          DEFAULT: "#F7F8F8",
          muted: "#8A8F98",
          subtle: "#565A61",
        },
        linearAccent: {
          coral: "#F55F44",
          coralHover: "#E0482D",
          amber: "#F59E0B",
          emerald: "#10B981",
          indigo: "#5E6AD2",
        },

        // Backward compatibility mappings
        darkBg: "#08090A",
        darkCard: "#101114",
        darkCardHover: "#15171C",
        darkBorder: "rgba(255, 255, 255, 0.08)",
        pawAmber: {
          light: "#FFF1EE",
          DEFAULT: "#F55F44",
          hover: "#E0482D",
          dark: "#C0351D",
        },
        brandOrange: {
          light: "#FFF1EE",
          DEFAULT: "#F55F44",
          hover: "#E0482D",
          dark: "#C0351D",
        },
        brandBg: "#08090A",
        brandCard: "#101114",
        brandBorder: "rgba(255, 255, 255, 0.08)",
        brandText: "#F7F8F8",
        brandTextMuted: "#8A8F98",
        status: {
          open: "#F43F5E",
          inProgress: "#F59E0B",
          resolved: "#10B981",
        },
      },
      boxShadow: {
        linear: "0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 16px -2px rgba(0, 0, 0, 0.6)",
        linearHover: "0 0 0 1px rgba(255, 255, 255, 0.18), 0 8px 24px -4px rgba(0, 0, 0, 0.75)",
        linearInset: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
