const { colors } = require("./src/theme/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: ["BricolageGrotesque_700Bold"],
        "display-medium": ["BricolageGrotesque_500Medium"],
        body: ["Manrope_400Regular"],
        "body-medium": ["Manrope_500Medium"],
        "body-semibold": ["Manrope_600SemiBold"],
        "body-bold": ["Manrope_700Bold"],
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};
