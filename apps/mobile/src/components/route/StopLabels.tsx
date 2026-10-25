import { useMemo } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { GlobePoint, ScreenPoint, ScreenProjection } from "@/components/globe/GlobeScene";
import { colors } from "@/theme";
import { fadeIn, stagger } from "@/theme/motion";

type Panel = {
  width: number; // panel size, to keep labels inside it
  height: number;
  bottomInset: number; // the legend's strip along the bottom
};

type Props = Panel & {
  points: GlobePoint[];
  projection: ScreenProjection; // from the globe once it settles; points in `points` order
  // Optional: index in `points` of the one stop to emphasize (the destination picker); other
  // stops dim. Labels keep their places, so nothing jumps when it changes.
  activeIndex?: number;
};

// Above this many labels the exhaustive search (4^n) gets slow, so every label just takes
// its first-choice side, with no collision checks. Routes in the app have 2-4 points.
const MAX_SEARCHED = 6;
const ARC_HIT_COST = 3; // per arc sample a label would cover

const PILL_H = 26;
const GAP = 11; // between the marker's middle and the pill
const EDGE = 8;
const BOX_W = 240; // wrapper the pill aligns in; wider than any label

// Rough width so labels can dodge each other before they've laid out.
const estimateWidth = (p: GlobePoint) =>
  24 + (p.code ? p.code.length * 9.5 + 6 : 0) + (p.name?.length ?? 0) * 7.6;

type Side = "above" | "below" | "left" | "right";
type Box = { left: number; top: number; right: number; bottom: number; side: Side };
type Option = { box: Box; cost: number };
const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

function boxFor(side: Side, s: ScreenPoint, w: number, width: number): Box {
  if (side === "left" || side === "right") {
    const left = side === "right" ? s.x + GAP : s.x - GAP - w;
    return { left, right: left + w, top: s.y - PILL_H / 2, bottom: s.y + PILL_H / 2, side };
  }
  const cx = Math.min(Math.max(s.x, EDGE + w / 2), width - EDGE - w / 2);
  const top = side === "above" ? s.y - GAP - PILL_H : s.y + GAP;
  return { left: cx - w / 2, right: cx + w / 2, top, bottom: top + PILL_H, side };
}

// Where the pill's wrapper goes so the pill (whose real width we don't know yet) hugs the
// marker on its side.
function wrapperStyle(box: Box) {
  if (box.side === "right") return { left: box.left, alignItems: "flex-start" as const };
  if (box.side === "left") return { left: box.right - BOX_W, alignItems: "flex-end" as const };
  return { left: (box.left + box.right) / 2 - BOX_W / 2, alignItems: "center" as const };
}

// Picks a side for every label at once: not on another label, a marker, or off the panel,
// covering as little of the arcs as it can, and otherwise on the side facing away from the
// rest of the route. Tries every combination; a route has a handful of stops.
function layoutLabels(points: GlobePoint[], projection: ScreenProjection, panel: Panel) {
  const { width, height, bottomInset } = panel;
  const screen = projection.points;
  const arcSamples = projection.arcs.flat().filter((s) => s.visible);
  const inBox = (b: Box, s: ScreenPoint) =>
    s.x > b.left - 2 && s.x < b.right + 2 && s.y > b.top - 2 && s.y < b.bottom + 2;
  const shown = points.flatMap((p, i) => {
    const s = screen[i];
    return s?.visible && (p.code || p.name) ? [{ i, s, w: estimateWidth(p) }] : [];
  });
  const mid = {
    x: shown.reduce((sum, l) => sum + l.s.x, 0) / Math.max(shown.length, 1),
    y: shown.reduce((sum, l) => sum + l.s.y, 0) / Math.max(shown.length, 1),
  };
  const markers: Box[] = shown.map(({ s }) => ({
    left: s.x - 8,
    right: s.x + 8,
    top: s.y - 8,
    bottom: s.y + 8,
    side: "above",
  }));
  // Each label's options, best first. Every step down the list costs a little.
  const options: Option[][] = shown.map(({ s, w }) => {
    const vertical: Side[] = s.y <= mid.y ? ["above", "below"] : ["below", "above"];
    const sideways: Side[] = s.x <= mid.x ? ["left", "right"] : ["right", "left"];
    return [...vertical.slice(0, 1), ...sideways, ...vertical.slice(1)].map((side, rank) => {
      const box = boxFor(side, s, w, width);
      const outside =
        box.left < EDGE ||
        box.right > width - EDGE ||
        box.top < 4 ||
        box.bottom > height - bottomInset;
      const onMarker = markers.some((m) => overlaps(m, box));
      const arcHits = arcSamples.filter((s) => inBox(box, s)).length;
      return {
        box,
        cost: rank + (outside ? 50 : 0) + (onMarker ? 50 : 0) + arcHits * ARC_HIT_COST,
      };
    });
  });

  let best: Box[] = options.flatMap((o) => o.slice(0, 1).map((x) => x.box));
  let bestCost = Number.POSITIVE_INFINITY;
  const chosen: Box[] = [];
  const search = (k: number, cost: number) => {
    if (cost >= bestCost) return;
    if (k === options.length) {
      bestCost = cost;
      best = [...chosen];
      return;
    }
    for (const o of options[k] ?? []) {
      const clash = chosen.some((b) => overlaps(b, o.box));
      chosen.push(o.box);
      search(k + 1, cost + o.cost + (clash ? 100 : 0));
      chosen.pop();
    }
  };
  if (options.length <= MAX_SEARCHED) search(0, 0);

  const out: Array<Box | null> = points.map(() => null);
  shown.forEach((l, n) => {
    out[l.i] = best[n] ?? null;
  });
  return out;
}

// City + airport labels drawn over the route globe (plain RN text: sharp on a projector,
// no textures in the GL scene).
export function StopLabels({ points, projection, width, height, bottomInset, activeIndex }: Props) {
  // Only redo the search when the globe reports new positions or the panel changes, not on
  // every RouteView render (a flight pick re-renders it).
  const boxes = useMemo(
    () => layoutLabels(points, projection, { width, height, bottomInset }),
    [points, projection, width, height, bottomInset],
  );
  return (
    <>
      {points.map((p, i) => {
        const box = boxes[i];
        if (!box) return null;
        const tint = p.kind === "origin" ? colors.gold : colors.accent;
        const dim = activeIndex !== undefined && p.kind === "stop" && i !== activeIndex;
        const lit = activeIndex !== undefined && i === activeIndex;
        return (
          <Animated.View
            key={`${p.kind}-${p.code ?? p.name}`}
            entering={fadeIn(stagger(i))}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: box.top,
              width: BOX_W,
              height: PILL_H,
              ...wrapperStyle(box),
            }}
          >
            <View
              className="h-full flex-row items-center gap-1.5 rounded-full border bg-bg/90 px-2.5"
              style={{ borderColor: lit ? tint : `${tint}66`, opacity: dim ? 0.5 : 1 }}
            >
              {p.code ? (
                <Text className="font-body-bold text-[13px] tracking-wide" style={{ color: tint }}>
                  {p.code}
                </Text>
              ) : null}
              {p.name ? (
                <Text numberOfLines={1} className="font-body-semibold text-[13px] text-ink">
                  {p.name}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </>
  );
}
