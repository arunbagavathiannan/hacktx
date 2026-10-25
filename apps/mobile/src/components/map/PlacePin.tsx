import { CaretLeft, Check } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Member, Place } from "@/mocks/types";
import { colors } from "@/theme";
import { fadeIn, stagger } from "@/theme/motion";
import { categoryMeta } from "./categories";

export const PIN_SIZE = 40;

type Props = {
  place: Place;
  x: number;
  y: number;
  picked: boolean;
  selected: boolean;
  pickers: Member[];
  index: number; // stagger order for the drop-in
  onPress: () => void;
  // Set when the place is off the map: the direction (radians, screen space) it lies in.
  offMapAngle?: number;
  offMapLabel?: string; // "Red Rocks · 30 min drive"
};

// Tiny face dots for friends' picks; the ui Avatar is too big for a map pin.
function Faces({ members }: { members: Member[] }) {
  const shown = members.slice(0, 3);
  const extra = members.length - shown.length;
  return (
    <View className="flex-row items-center rounded-full bg-bg/90 px-0.5 py-0.5">
      {shown.map((m, i) => (
        <View
          key={m.id}
          accessibilityLabel={m.name}
          className="h-4 w-4 items-center justify-center rounded-full border border-bg"
          style={{ backgroundColor: m.color, marginLeft: i === 0 ? 0 : -5 }}
        >
          <Text className="font-body-bold text-[8px] text-bg">{m.name.slice(0, 1)}</Text>
        </View>
      ))}
      {extra > 0 ? <Text className="px-1 font-body-bold text-[9px] text-ink">+{extra}</Text> : null}
    </View>
  );
}

export function PlacePin({
  place,
  x,
  y,
  picked,
  selected,
  pickers,
  index,
  onPress,
  offMapAngle,
  offMapLabel,
}: Props) {
  const meta = categoryMeta[place.category];
  const { Icon } = meta;
  const size = selected ? PIN_SIZE + 6 : PIN_SIZE;
  const offMap = offMapAngle !== undefined;

  return (
    <Animated.View
      entering={fadeIn(stagger(index))}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        zIndex: selected ? 20 : picked ? 10 : 1,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${meta.label}${picked ? ", in your plan" : ""}`}
        onPress={onPress}
        hitSlop={6}
        className="active:opacity-80"
      >
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: picked ? meta.color : colors.surface,
            borderWidth: selected ? 3 : 2,
            borderColor: selected ? colors.ink : meta.color,
            shadowColor: "#000",
            shadowOpacity: 0.5,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        >
          <Icon
            size={selected ? 22 : 19}
            color={picked ? colors.bg : meta.color}
            weight={picked ? "fill" : "regular"}
          />
        </View>

        {picked ? (
          <View
            className="absolute h-4 w-4 items-center justify-center rounded-full border border-bg bg-ink"
            style={{ top: -3, right: -3 }}
          >
            <Check size={9} color={colors.bg} weight="fill" />
          </View>
        ) : null}

        {pickers.length > 0 ? (
          <View className="absolute" style={{ top: size - 9, left: size / 2 - 8 }}>
            <Faces members={pickers} />
          </View>
        ) : null}
      </Pressable>

      {offMap ? (
        <View
          pointerEvents="none"
          className="absolute items-center justify-center"
          style={{
            width: 18,
            height: 18,
            left: size / 2 - 9 + Math.cos(offMapAngle) * (size / 2 + 12),
            top: size / 2 - 9 + Math.sin(offMapAngle) * (size / 2 + 12),
            transform: [{ rotate: `${offMapAngle + Math.PI}rad` }],
          }}
        >
          <CaretLeft size={16} color={meta.color} weight="fill" />
        </View>
      ) : null}

      {offMapLabel ? (
        <View
          pointerEvents="none"
          className="absolute rounded-full border border-line bg-surface/95 px-2.5 py-1"
          style={{
            top: size / 2 - 12,
            ...(offMapAngle !== undefined && Math.cos(offMapAngle) > 0
              ? { right: size + 8 }
              : { left: size + 8 }),
          }}
        >
          <Text numberOfLines={1} className="font-body-semibold text-xs text-ink">
            {offMapLabel}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
