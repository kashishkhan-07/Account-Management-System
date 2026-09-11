/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0f172a",
        cardBg: "#1e293b",
        accentBlue: "#38bdf8",
        accentGreen: "#22c55e",
      },
    },
  },
  plugins: [],
}