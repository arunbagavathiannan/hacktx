import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";

// One short, quiet burst of sunset-colored paper behind the confirmation seal. Plays once,
// then fades out. Skipped when the OS asks for reduced motion.

const PIECES = 18;
const PALETTE = [colors.accent, colors.gold, colors.ink];

// Deterministic "random" so every run (and every screenshot) looks the same.
function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Piece({ i }: { i: number }) {
  const t = useSharedValue(0);
  // Fan out over the top half (plus a little below the sides) so nothing lands on the title.
  const angle = -Math.PI - 0.35 + (i / (PIECES - 1)) * (Math.PI + 0.7) + (rand(i, 1) - 0.5) * 0.3;
  const distance = 70 + rand(i, 2) * 70;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance * 0.7;
  const spin = (rand(i, 3) - 0.5) * 540;
  const wide = rand(i, 4) > 0.5;

  useEffect(() => {
    t.value = withDelay(
      120 + rand(i, 5) * 160,
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }),
    );
  }, [i, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? Math.min(1, t.value * 6) : 1 - (t.value - 0.7) / 0.3,
    transform: [
      { translateX: dx * t.value },
      // A little gravity: up and out, then drifting down.
      { translateY: dy * t.value + 60 * t.value * t.value },
      { rotate: `${spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: wide ? 9 : 5,
          height: wide ? 4 : 9,
          borderRadius: 2,
          backgroundColor: PALETTE[i % PALETTE.length],
        },
        style,
      ]}
    />
  );
}

export function Confetti() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      {Array.from({ length: PIECES }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed set of decorative pieces
        <Piece key={i} i={i} />
      ))}
    </View>
  );
}
