import { CaretRight, Check, Plus, Star } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
  minTop: number; // above this the card would sit under the filter chips, so it flips below
  onToggle: () => void;
  onDetails: () => void;
};

const WIDTH = 276;
const MARGIN = 10; // from the map's edges
const GAP = 8; // between the tail tip and the pin
const TAIL = 14; // side of the rotated square that makes the tail
const BELOW_EXTRA = 10; // the friends' faces hang under a pin

const formatCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : `${n}`;

// The small popup over a tapped pin: enough to decide, with the full sheet one tap away.
export function PlaceCallout({
  place,
  picked,
  pickers,
  anchor,
  pinRadius,
  mapSize,
  minTop,
  onToggle,
  onDetails,
}: Props) {
  const meta = categoryMeta[place.category];
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(0);

  // Wait for the first layout so it animates in at its real position, not from (0, 0).
  useEffect(() => {
    if (height > 0) {
      progress.value = withTiming(1, { duration: 170, easing: Easing.out(Easing.cubic) });
    }
  }, [height, progress]);

  const width = Math.min(WIDTH, mapSize.width - MARGIN * 2);
  const aboveTop = anchor.y - pinRadius - GAP - TAIL / 2 - height;
  const below = aboveTop < minTop;
  const top = below
    ? Math.min(
        anchor.y + pinRadius + GAP + TAIL / 2 + BELOW_EXTRA,
        mapSize.height - height - MARGIN,
      )
    : aboveTop;
  const left = Math.min(Math.max(anchor.x - width / 2, MARGIN), mapSize.width - width - MARGIN);
  const tailX = Math.min(Math.max(anchor.x - left, 22), width - 22);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * (below ? -6 : 6) },
      { scale: 0.92 + progress.value * 0.08 },
    ],
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
        className="gap-2.5 rounded-card border border-line bg-surface p-3.5"
        style={{ boxShadow: "0 12px 32px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.4)" }}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: `${meta.color}22` }}
          >
            <meta.Icon size={18} color={meta.color} weight="fill" />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-display text-[17px] leading-6 text-ink">
              {place.name}
            </Text>
            <View className="flex-row items-center gap-1">
              <Star size={12} color={colors.gold} weight="fill" />
              <Text className="font-body-bold text-xs text-ink">{place.rating.toFixed(1)}</Text>
              <Text numberOfLines={1} className="flex-1 font-body text-xs text-muted">
                ({formatCount(place.reviews)}) · {place.price}
              </Text>
            </View>
          </View>
        </View>

        <Text numberOfLines={2} className="font-body text-[13px] leading-[18px] text-muted">
          {place.blurb}
        </Text>

        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            {pickers.length > 0 ? (
              <AvatarStack members={pickers} size="sm" max={3} />
            ) : (
              <Text className="font-body text-xs text-faint">No picks yet</Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={picked ? `Remove ${place.name} from plan` : `Add ${place.name}`}
            onPress={onToggle}
            hitSlop={4}
            className={`h-8 flex-row items-center gap-1 rounded-full px-3 active:opacity-80 ${
              picked ? "border border-line bg-raised" : "bg-accent"
            }`}
          >
            {picked ? (
              <Check size={13} color={colors.good} weight="fill" />
            ) : (
              <Plus size={13} color={colors.bg} weight="fill" />
            )}
            <Text className={`font-body-bold text-xs ${picked ? "text-ink" : "text-bg"}`}>
              {picked ? "Added" : "Add"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Details for ${place.name}`}
            onPress={onDetails}
            hitSlop={4}
            className="h-8 flex-row items-center gap-0.5 rounded-full border border-line pl-3 pr-2 active:opacity-80"
          >
            <Text className="font-body-bold text-xs text-ink">Details</Text>
            <CaretRight size={12} color={colors.muted} weight="regular" />
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
