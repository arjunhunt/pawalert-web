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
        darkBg: "#141210",
        darkCard: "#1F1B18",
        darkCardHover: "#2B2521",
        darkBorder: "#38312B",
        pawAmber: {
          light: "#FFE0B2",
          DEFAULT: "#EF6C00",
          hover: "#E65100",
          dark: "#BF360C"
        },
        status: {
          open: "#E53935",
          inProgress: "#FFB300",
          resolved: "#43A047"
        }
      }
    },
  },
  plugins: [],
};
export default config;
