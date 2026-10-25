// Single source of truth for colors: used by tailwind.config.js (classNames) and by
// src/theme/index.ts (icons, three.js, anything that needs a raw value).
// Dark + one warm "sunset" accent.
const colors = {
  bg: "#0B0A09",
  surface: "#161412",
  raised: "#201D1A",
  line: "#2C2824",
  ink: "#F5F1EC",
  muted: "#A39B91",
  faint: "#8F877D", // 5.6:1 on bg, 5.2 on surface, 4.7 on raised
  accent: "#FF7A3D",
  "accent-soft": "#3A2216",
  gold: "#FFB547",
  good: "#5BD68A",
  bad: "#FF5A5F",
};

module.exports = { colors };
