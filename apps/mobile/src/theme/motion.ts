import { Easing, FadeIn, FadeOut, Keyframe } from "react-native-reanimated";

// One set of motion values for every screen (DESIGN.md, "Motion"). Calm, not bouncy:
// opacity fades with an ease-out curve, at most an 8px nudge where it helps you see where
// something came from, no springs, no overshoot, no scale-from-zero, no pops.

export const DURATION = { fast: 150, base: 200, slow: 220 } as const;
// Material "emphasized decelerate"-ish ease-out: starts quick, settles without overshoot.
export const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);
export const STAGGER_MS = 40; // between items in a list
export const MAX_STAGGER_MS = 120; // last item starts by then, so a cascade ends under ~320ms
export const NUDGE_PX = 8; // largest translate allowed on enter

// Looping "live" indicators: a gentle opacity pulse, never a scaling ring.
export const PULSE = { duration: 900, min: 0.35 } as const;

// Delay for the i-th item of a cascade, capped so long lists don't drag.
export const stagger = (i: number) => Math.min(Math.max(0, i) * STAGGER_MS, MAX_STAGGER_MS);

// Plain fade in / out with the shared timing.
export const fadeIn = (delay = 0, duration: number = DURATION.base) =>
  FadeIn.duration(duration).delay(delay).easing(EASE_OUT);
export const fadeOut = (duration: number = DURATION.fast) =>
  FadeOut.duration(duration).easing(EASE_OUT);

// Fade plus a small nudge from one side, for things whose direction means something:
// onboarding pages slide the way you're going. Use it for a single view that replaces another
// (keyed page), not for items in a list: on web, list items entering with this Keyframe ended
// up stacked on top of each other, so lists use fadeIn.
export function nudgeIn(from: "below" | "right" | "left", delay = 0) {
  const offset =
    from === "below"
      ? { translateY: NUDGE_PX }
      : { translateX: from === "right" ? NUDGE_PX : -NUDGE_PX };
  const rest = from === "below" ? { translateY: 0 } : { translateX: 0 };
  return new Keyframe({
    0: { opacity: 0, transform: [offset] },
    100: { opacity: 1, transform: [rest], easing: EASE_OUT },
  })
    .duration(DURATION.slow)
    .delay(delay);
}
