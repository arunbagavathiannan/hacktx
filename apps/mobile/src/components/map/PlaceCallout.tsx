import { CaretRight, Check, Plus, Star } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AvatarStack } from "@/components/ui";
import type { Member, Place } from "@/mocks/types";
import { colors } from "@/theme";
import { categoryMeta } from "./categories";

type Props = {
  place: Place;
  picked: boolean;
  pickers: Member[];
  anchor: { x: number; y: number }; // pin center, in map px
  pinRadius: number;
  mapSize: { width: number; height: number };
  // The card stays between these (map px) when it can: below the top fade/chips, above the
  // flights row. It never covers its own pin.
  safeTop: number;
  safeBottom: number;
  onToggle: () => void;
  onDetails: () => void;
};

const WIDTH = 292;
const MARGIN = 10; // from the map's edges
const GAP = 8; // between the tail tip and the pin
const TAIL = 14; // side of the rotated square that makes the tail
const BELOW_EXTRA = 10; // the friends' faces hang under a pin

const TABULAR = { fontVariant: ["tabular-nums" as const] };

const formatCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : `${n}`;

// Above the pin if it fits between the safe edges, else below, else whichever side keeps the
// card on the map. Never clamped over the pin itself.
function placeCard(p: {
  anchorY: number;
  pinRadius: number;
  height: number;
  safeTop: number;
  safeBottom: number;
}) {
  const aboveTop = p.anchorY - p.pinRadius - GAP - TAIL / 2 - p.height;
  const belowTop = p.anchorY + p.pinRadius + BELOW_EXTRA + GAP + TAIL / 2;
  if (aboveTop >= p.safeTop) return { top: aboveTop, below: false };
  if (belowTop + p.height <= p.safeBottom) return { top: belowTop, below: true };
  if (aboveTop >= MARGIN) return { top: aboveTop, below: false };
  return { top: belowTop, below: true };
}

// The small popup over a tapped pin: enough to decide, with the full sheet one tap away.
export function PlaceCallout({
  place,
  picked,
  pickers,
  anchor,
  pinRadius,
  mapSize,
  safeTop,
  safeBottom,
  onToggle,
  onDetails,
}: Props) {
  const meta = categoryMeta[place.category];
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(0);
  const summary = `${place.name}, ${meta.label}. ${place.rating.toFixed(1)} stars, ${formatCount(
    place.reviews,
  )} reviews, ${place.price}.`;

  // Wait for the first layout so it animates in at its real position, not from (0, 0).
  useEffect(() => {
    if (height > 0) {
      progress.value = withTiming(1, { duration: 170, easing: Easing.out(Easing.cubic) });
    }
  }, [height, progress]);

  // Screen readers: say what opened (the card is keyed by place, so this runs per pin).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  const width = Math.min(WIDTH, mapSize.width - MARGIN * 2);
  const { top, below } = placeCard({
    anchorY: anchor.y,
    pinRadius,
    height,
    safeTop,
    safeBottom,
  });
  const left = Math.min(Math.max(anchor.x - width / 2, MARGIN), mapSize.width - width - MARGIN);
  const tailX = Math.min(Math.max(anchor.x - left, 22), width - 22);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * (below ? -6 : 6) }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={[
        {
          position: "absolute",
          left,
          top,
          width,
          zIndex: 50,
          transformOrigin: `${tailX}px ${below ? 0 : height}px`,
        },
        animated,
      ]}
    >
      <View
        accessibilityLiveRegion="polite"
        className="gap-2.5 rounded-card border border-line bg-surface p-3.5"
        style={{ boxShadow: "0 12px 32px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.4)" }}
      >
        {/* The pin under the tail already shows the category icon; here it's just a word. */}
        <View accessible accessibilityLabel={summary} className="gap-0.5">
          <Text numberOfLines={1} className="font-display-medium text-headline text-ink">
            {place.name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Star size={14} color={colors.gold} weight="fill" />
            <Text
              numberOfLines={1}
              className="flex-1 font-body text-small text-muted"
              style={TABULAR}
            >
              <Text className="font-body-semibold text-ink">{place.rating.toFixed(1)}</Text> (
              {formatCount(place.reviews)}) · {place.price} ·{" "}
              <Text className="font-body-medium" style={{ color: meta.color }}>
                {meta.label}
              </Text>
            </Text>
          </View>
        </View>

        <Text numberOfLines={2} className="font-body text-small text-muted">
          {place.blurb}
        </Text>

        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            {pickers.length > 0 ? (
              <AvatarStack members={pickers} size="sm" max={3} />
            ) : (
              <Text className="font-body text-caption text-faint">No picks yet</Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: picked }}
            accessibilityLabel={picked ? `Remove ${place.name} from plan` : `Add ${place.name}`}
            onPress={onToggle}
            className={`h-12 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-80 ${
              picked ? "border border-line bg-raised" : "bg-accent"
            }`}
          >
            {picked ? (
              <Check size={15} color={colors.good} weight="regular" />
            ) : (
              <Plus size={15} color={colors.bg} weight="regular" />
            )}
            <Text className={`font-body-semibold text-small ${picked ? "text-ink" : "text-bg"}`}>
              {picked ? "Added" : "Add"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Details for ${place.name}`}
            onPress={onDetails}
            className="h-12 flex-row items-center gap-0.5 rounded-full border border-line pl-4 pr-3 active:opacity-80"
          >
            <Text className="font-body-semibold text-small text-ink">Details</Text>
            <CaretRight size={13} color={colors.muted} weight="regular" />
          </Pressable>
        </View>
      </View>

      {/* Tail: a rotated square straddling the card's edge, bordered on its two outer sides. */}
      <View
        pointerEvents="none"
        className="absolute border-line bg-surface"
        style={{
          width: TAIL,
          height: TAIL,
          left: tailX - TAIL / 2,
          ...(below ? { top: -TAIL / 2 + 0.5 } : { bottom: -TAIL / 2 + 0.5 }),
          transform: [{ rotate: "45deg" }],
          ...(below
            ? { borderLeftWidth: 1, borderTopWidth: 1 }
            : { borderRightWidth: 1, borderBottomWidth: 1 }),
        }}
      />
    </Animated.View>
  );
}
