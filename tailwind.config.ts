import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111313",
        manuscript: "#1C1B18",
        ivory: "#F2E8D2",
        sepia: "#7A5634",
        seal: "#8F2F2B",
        gold: "#C49A45",
        sage: "#6F8061",
        impact: "#2F6F73",
        feasibility: "#6B6E66",
        graphite: "#3A3A36",
        margin: "#B8B0A0",
        laurel: "#3F7A54",
        carmine: "#C14B3E",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
