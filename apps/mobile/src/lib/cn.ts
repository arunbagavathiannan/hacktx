import { extendTailwindMerge } from "tailwind-merge";

// Merge Tailwind classes so a caller's className overrides a component's defaults
// (e.g. <Heading className="text-base"> really ends up text-base, not text-xl).
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
      "font-size": [{ text: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"] }],
    },
  },
});

export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}
