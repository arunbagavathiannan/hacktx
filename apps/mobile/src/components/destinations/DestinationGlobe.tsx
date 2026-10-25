import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { GlobeArc, GlobePoint, ScreenProjection } from "@/components/globe/GlobeScene";
import { SafeGlobe } from "@/components/globe/SafeGlobe";
import { StopLabels } from "@/components/route/StopLabels";
import type { DestinationSuggestion } from "@/mocks/destinations";
import type { TripBrief } from "@/mocks/types";
import { colors } from "@/theme";

type Props = {
  origin: TripBrief["origin"];
  ideas: DestinationSuggestion[];
  selectedId: string;
  height: number;
  // Hold the swing-in at its end (reduced motion, screenshots).
  frozen: boolean;
  onFail: () => void;
};

const RING = 22; // dp: hugs the marker, inside the gap StopLabels leaves before a label

// The ideas on the globe: home (AUS) plus every candidate city, with a flight arc to each.
// The overview camera frames all of them (it ignores `focus`, see GlobeScene), so "focusing" a
// city is done on top of the canvas: a ring on its marker and its label lit, the others dimmed.
export function DestinationGlobe({ origin, ideas, selectedId, height, frozen, onFail }: Props) {
  const [width, setWidth] = useState(0);
  const [projection, setProjection] = useState<ScreenProjection | null>(null);

  // Built once per set of ideas: the globe never rebuilds on a selection change.
  const globe = useMemo(() => {
    const home = { lat: origin.lat, lng: origin.lng };
    const points: GlobePoint[] = [
      { kind: "origin", ...home, code: origin.airport, name: origin.city },
      ...ideas.map((d) => ({
        kind: "stop" as const,
        lat: d.lat,
        lng: d.lng,
        code: d.airport,
        name: d.city,
      })),
    ];
    const arcs: GlobeArc[] = ideas.map((d) => ({
      from: home,
      to: { lat: d.lat, lng: d.lng },
      mode: "fly",
    }));
    const focus = {
      lat: ideas.reduce((s, d) => s + d.lat, 0) / Math.max(1, ideas.length),
      lng: ideas.reduce((s, d) => s + d.lng, 0) / Math.max(1, ideas.length),
    };
    return { points, arcs, focus };
  }, [origin, ideas]);

  const selectedIndex = ideas.findIndex((d) => d.id === selectedId);
  const pointIndex = selectedIndex >= 0 ? selectedIndex + 1 : undefined; // +1: home is first
  const at = pointIndex !== undefined ? projection?.points[pointIndex] : undefined;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <SafeGlobe
        variant="overview"
        focus={globe.focus}
        points={globe.points}
        arcs={globe.arcs}
        durationMs={1800}
        frozenAt={frozen ? 1 : undefined}
        ambient={false}
        onProject={setProjection}
        onFail={onFail}
      />
      {projection && width > 0 ? (
        <StopLabels
          points={globe.points}
          projection={projection}
          width={width}
          height={height}
          bottomInset={8}
          activeIndex={pointIndex}
        />
      ) : null}
      {at?.visible ? <FocusRing x={at.x} y={at.y} still={frozen} /> : null}
    </View>
  );
}

// Pulses outward from the focused city (holds still with reduced motion).
function FocusRing({ x, y, still }: { x: number; y: number; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }), -1);
  }, [t, still]);
  const pulse = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - t.value),
    transform: [{ scale: 1 + 0.7 * t.value }],
  }));

  const box = { position: "absolute" as const, left: x - RING / 2, top: y - RING / 2 };
  const circle = { width: RING, height: RING, borderRadius: RING / 2, borderColor: colors.accent };
  return (
    <View pointerEvents="none" style={[box, { width: RING, height: RING }]}>
      <View style={[circle, { position: "absolute", borderWidth: 2 }]} />
      {still ? null : (
        <Animated.View style={[circle, { position: "absolute", borderWidth: 2 }, pulse]} />
      )}
    </View>
  );
}
