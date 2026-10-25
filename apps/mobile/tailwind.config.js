const { colors } = require("./src/theme/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      // Type roles (DESIGN.md). Size + line height (+ tracking at display sizes) in one class,
      // e.g. `text-title`. Pair with a family: Bricolage (`font-display`) for display/title,
      // `font-display-medium` (Bricolage 500) for headline (place names, questions, fact
      // values), Manrope for body/small/label/caption. Keep the names in sync with
      // TYPE_ROLES in src/components/ui/cn.ts so cn() merges them as font sizes.
      fontSize: {
        "display-xl": ["52px", { lineHeight: "56px", letterSpacing: "-1px" }],
        display: ["36px", { lineHeight: "42px", letterSpacing: "-0.7px" }],
        title: ["24px", { lineHeight: "30px", letterSpacing: "-0.3px" }],
        headline: ["18px", { lineHeight: "24px" }],
        body: ["16px", { lineHeight: "24px" }],
        small: ["14px", { lineHeight: "20px" }],
        label: ["14px", { lineHeight: "20px" }],
        caption: ["12px", { lineHeight: "16px" }],
      },
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
