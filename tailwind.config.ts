import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // NewsTrail brand — refined maroon
        brand: {
          DEFAULT: "#9a1750",
          dark: "#7c0f3f",
          light: "#c23a78",
          50: "#fdf2f7",
          100: "#fbe4ee",
        },
        ink: {
          DEFAULT: "#191512",
          soft: "#4a4540",
          muted: "#8a827b",
        },
        paper: "#faf8f5",
        line: "#e9e4dd",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(25,21,18,0.04), 0 4px 16px rgba(25,21,18,0.06)",
        "card-hover": "0 4px 8px rgba(25,21,18,0.06), 0 12px 32px rgba(25,21,18,0.12)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
      maxWidth: {
        content: "76rem",
      },
    },
  },
  plugins: [],
};

export default config;
