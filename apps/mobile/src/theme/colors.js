// Single source of truth for colors: used by tailwind.config.js (classNames) and by
// src/theme/index.ts (icons, three.js, anything that needs a raw value).
// Warm dark gray (not black) + one "sunset" accent.
const colors = {
  bg: "#1A1917",
  surface: "#232120",
  raised: "#2D2A27",
  line: "#3B3834",
  ink: "#F5F1EC",
  muted: "#A9A196",
  faint: "#9A9288", // 5.7:1 on bg, 5.2 on surface, 4.7 on raised
  accent: "#FF7A3D",
  "accent-soft": "#46291B",
  gold: "#FFB547",
  good: "#5BD68A",
  bad: "#FF5A5F",
};

module.exports = { colors };
