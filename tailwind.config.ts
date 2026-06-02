import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "Segoe UI", "Arial", "sans-serif"]
      },
      boxShadow: {
        flow: "0 18px 80px rgba(0, 0, 0, 0.34)"
      }
    }
  },
  plugins: []
};


export default config;
