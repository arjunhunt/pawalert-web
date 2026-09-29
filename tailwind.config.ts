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
        darkBg: "#0B0C10",
        darkCard: "#13151C",
        darkCardHover: "#1A1D27",
        darkBorder: "#222634",
        pawAmber: {
          light: "#FEF3C7",
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          dark: "#B45309",
        },
        status: {
          open: "#EF4444",
          inProgress: "#F59E0B",
          resolved: "#10B981",
        },
      },
    },
  },
  plugins: [],
};
export default config;
