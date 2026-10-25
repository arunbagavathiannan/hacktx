import { extendTailwindMerge } from "tailwind-merge";

// Type-role font sizes from tailwind.config.js (`text-title`, `text-body`, ...).
// tailwind-merge doesn't know them, and would read `text-title` as a text *color* and drop it
// next to `text-ink`. Registering them as font sizes keeps both, and lets a caller's
// `className="text-lg"` still override a component's default role.
export const TYPE_ROLES = [
  "display-xl",
  "display",
  "title",
  "headline",
  "body",
  "small",
  "label",
  "caption",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-family": [
        "font-display",
        "font-display-medium",
        "font-body",
        "font-body-medium",
        "font-body-semibold",
        "font-body-bold",
      ],
      "font-size": [
        { text: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", ...TYPE_ROLES] },
      ],
    },
  },
});

// The app's one class-merge helper; @/lib/cn re-exports it.
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}
