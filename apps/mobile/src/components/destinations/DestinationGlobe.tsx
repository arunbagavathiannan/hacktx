import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, {
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
import { PULSE } from "@/theme/motion";

type Props = {
  origin: TripBrief["origin"];
  ideas: DestinationSuggestion[];
  selectedId: string;
  driving: boolean; // the group answered "Drive": arcs are drawn as drives
  height: number;
  // Hold the swing-in at its end (reduced motion, screenshots).
  frozen: boolean;
  onFail: () => void;
};

const RING = 22; // dp: hugs the marker, inside the gap StopLabels leaves before a label

// The ideas on the globe: home (AUS) plus every candidate city, with an arc to each.
// The overview camera frames all of them (it ignores `focus`, see GlobeScene), so "focusing" a
// city is done on top of the canvas: a ring on its marker and its label lit, the others dimmed.
export function DestinationGlobe({
  origin,
  ideas,
  selectedId,
  driving,
  height,
  frozen,
  onFail,
}: Props) {
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
      mode: driving ? ("drive" as const) : ("fly" as const),
    }));
    const focus = {
      lat: ideas.reduce((s, d) => s + d.lat, 0) / Math.max(1, ideas.length),
      lng: ideas.reduce((s, d) => s + d.lng, 0) / Math.max(1, ideas.length),
    };
    return { points, arcs, focus };
  }, [origin, ideas, driving]);

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

// A ring on the focused city that breathes (opacity only, no scaling). Holds still with
// reduced motion.
function FocusRing({ x, y, still }: { x: number; y: number; still: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    o.value = withRepeat(withTiming(PULSE.min, { duration: PULSE.duration }), -1, true);
  }, [o, still]);
  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x - RING / 2,
          top: y - RING / 2,
          width: RING,
          height: RING,
          borderRadius: RING / 2,
          borderWidth: 2,
          borderColor: colors.accent,
        },
        still ? null : pulse,
      ]}
    />
  );
}
