import { Bed, ForkKnife, Martini, Ticket } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import type { Member, Place, PlaceCategory } from "@/mocks/types";
import { colors } from "@/theme";

export const categoryIcon: Record<PlaceCategory, typeof Bed> = {
  hotel: Bed,
  food: ForkKnife,
  activity: Ticket,
  nightlife: Martini,
};

type Props = {
  place: Place;
  x: number;
  y: number;
  index: number;
  picked: boolean;
  selected: boolean;
  pickers: Member[];
  onPress: () => void;
};

const SIZE = 40;

// A map marker: category icon in a circle (accent when it's in the plan), friends who picked
// it as tiny dots underneath, and the name when selected.
export function PlacePin({ place, x, y, index, picked, selected, pickers, onPress }: Props) {
  const Icon = categoryIcon[place.category];
  return (
    <Animated.View
      entering={ZoomIn.delay(120 + index * 70).springify()}
      style={{
        position: "absolute",
        left: x - SIZE / 2,
        top: y - SIZE / 2,
        zIndex: selected ? 3 : picked ? 2 : 1,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${place.name}${picked ? ", in your plan" : ""}`}
        onPress={onPress}
        hitSlop={8}
        className="items-center"
      >
        <View
          className={`items-center justify-center rounded-full border-2 ${
            picked ? "border-gold bg-accent" : "border-line bg-raised"
          }`}
          style={{
            width: SIZE,
            height: SIZE,
            transform: [{ scale: selected ? 1.18 : 1 }],
            shadowColor: colors.accent,
            shadowOpacity: picked ? 0.7 : 0,
            shadowRadius: 12,
            elevation: picked ? 8 : 0,
          }}
        >
          <Icon
            size={20}
            color={picked ? colors.bg : colors.ink}
            weight={picked ? "fill" : "regular"}
          />
        </View>
        {pickers.length > 0 ? (
          <View className="mt-1 flex-row">
            {pickers.slice(0, 4).map((m, i) => (
              <View
                key={m.id}
                className="h-2.5 w-2.5 rounded-full border border-bg"
                style={{ backgroundColor: m.color, marginLeft: i === 0 ? 0 : -3 }}
              />
            ))}
          </View>
        ) : null}
        {selected ? (
          <View className="mt-1 rounded-full bg-bg/90 px-2 py-0.5">
            <Text numberOfLines={1} className="font-body-bold text-xs text-ink">
              {place.name}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
