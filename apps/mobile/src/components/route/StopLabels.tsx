import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { GlobePoint, ScreenPoint } from "@/components/globe/GlobeScene";
import { colors } from "@/theme";

type Panel = {
  width: number; // panel size, to keep labels inside it
  height: number;
  bottomInset: number; // the legend's strip along the bottom
};

type Props = Panel & {
  points: GlobePoint[];
  screen: ScreenPoint[]; // same order as `points`, from the globe once it settles
};

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
// and otherwise on the side facing away from the rest of the route (so labels don't sit on
// the arcs). Tries every combination; a route has a handful of stops.
function layoutLabels(points: GlobePoint[], screen: ScreenPoint[], panel: Panel) {
  const { width, height, bottomInset } = panel;
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
      return { box, cost: rank + (outside ? 50 : 0) + (onMarker ? 50 : 0) };
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
  if (options.length <= 6) search(0, 0);

  const out: Array<Box | null> = points.map(() => null);
  shown.forEach((l, n) => {
    out[l.i] = best[n] ?? null;
  });
  return out;
}

// City + airport labels drawn over the route globe (plain RN text: sharp on a projector,
// no textures in the GL scene).
export function StopLabels({ points, screen, ...panel }: Props) {
  const boxes = layoutLabels(points, screen, panel);
  return (
    <>
      {points.map((p, i) => {
        const box = boxes[i];
        if (!box) return null;
        const tint = p.kind === "origin" ? colors.gold : colors.accent;
        return (
          <Animated.View
            key={`${p.kind}-${p.code ?? p.name}`}
            entering={FadeIn.duration(350).delay(80 * i)}
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
              style={{ borderColor: `${tint}66` }}
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
