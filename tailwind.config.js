/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF4FF",
          100: "#DBE7FE",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E3A8A",
          900: "#172554",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      keyframes: {
        floatA: {
          "0%, 100%": { transform: "translateY(0) rotate(-3deg)" },
          "50%": { transform: "translateY(-14px) rotate(-3deg)" },
        },
        floatB: {
          "0%, 100%": { transform: "translateY(0) rotate(2deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
        floatC: {
          "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%": { transform: "translateY(-8px) rotate(-1deg)" },
        },
        heartBurst: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "15%": { transform: "scale(1.15)", opacity: "1" },
          "30%": { transform: "scale(0.95)", opacity: "1" },
          "45%": { transform: "scale(1.05)", opacity: "1" },
          "80%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
      },
      animation: {
        floatA: "floatA 6s ease-in-out infinite",
        floatB: "floatB 7s ease-in-out infinite .5s",
        floatC: "floatC 5.5s ease-in-out infinite 1s",
        heartBurst: "heartBurst 850ms ease-out forwards",
      },
    },
  },
  plugins: [],
};
