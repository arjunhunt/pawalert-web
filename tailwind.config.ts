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
        // Swiggy & Zomato Consumer Theme
        brandOrange: {
          light: "#FFF3E6",
          DEFAULT: "#FC8019",
          hover: "#E86F0C",
          dark: "#D15D00",
        },
        brandRed: {
          light: "#FFEBEB",
          DEFAULT: "#E23744",
          hover: "#C92633",
        },
        brandBg: "#F4F5F8",
        brandCard: "#FFFFFF",
        brandBorder: "#E9ECEF",
        brandText: "#1C1C28",
        brandTextMuted: "#686B78",

        // Backward-compatible mappings
        darkBg: "#F4F5F8",
        darkCard: "#FFFFFF",
        darkCardHover: "#FDFDFE",
        darkBorder: "#E9ECEF",
        pawAmber: {
          light: "#FFF3E6",
          DEFAULT: "#FC8019",
          hover: "#E86F0C",
          dark: "#D15D00",
        },
        status: {
          open: "#E23744",
          inProgress: "#FC8019",
          resolved: "#1BA672",
        },
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(28, 28, 40, 0.06)",
        cardHover: "0 8px 24px 0 rgba(28, 28, 40, 0.12)",
        bottomBar: "0 -4px 16px 0 rgba(28, 28, 40, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
