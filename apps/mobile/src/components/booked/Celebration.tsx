import { CheckFat } from "phosphor-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { members } from "@/mocks";
import { colors, icon } from "@/theme";

const SIZE = 88;
const pieces = Array.from({ length: 14 }, (_, i) => ({ id: `piece-${i}`, index: i }));
const pieceColors = [colors.accent, colors.gold, ...members.map((m) => m.color)];

// Reanimated views ignore NativeWind className here, so these use inline styles.
// Check mark that springs in with a one-time burst of the group's colors around it.
export function Celebration() {
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withDelay(120, withSpring(1, { damping: 11, stiffness: 160 }));
  }, [pop]);

  const badge = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    opacity: Math.min(pop.value * 2, 1),
  }));

  return (
    <View className="h-44 items-center justify-center">
      <Halo />
      {pieces.map((p) => (
        <Piece key={p.id} index={p.index} />
      ))}
      <Animated.View
        style={[
          badge,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
          },
        ]}
      >
        <CheckFat size={42} color={colors.bg} weight={icon.activeWeight} />
      </Animated.View>
    </View>
  );
}

function Halo() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(200, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.9 }],
    opacity: t.value === 0 ? 0 : 0.45 * (1 - t.value),
  }));
  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: colors.accent,
        },
      ]}
    />
  );
}

function Piece({ index }: { index: number }) {
  const t = useSharedValue(0);
  const angle = (index / pieces.length) * Math.PI * 2 + (index % 2 ? 0.2 : 0);
  const dist = 62 + (index % 3) * 12;
  const size = index % 3 === 0 ? 8 : 6;

  useEffect(() => {
    t.value = withDelay(
      180 + (index % 4) * 30,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }),
    );
  }, [t, index]);

  // Pieces fly out, then settle at a soft resting opacity so the hero isn't empty afterwards.
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle) * dist * t.value },
      { translateY: Math.sin(angle) * dist * t.value },
      { rotate: `${t.value * 180}deg` },
    ],
    opacity: t.value === 0 ? 0 : 1 - t.value * 0.55,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: size,
          height: index % 2 ? size : size * 1.8,
          borderRadius: index % 2 ? size / 2 : 2,
          backgroundColor: pieceColors[index % pieceColors.length],
        },
      ]}
    />
  );
}
