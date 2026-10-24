import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";

// Thin bar under the header. `to` is 0..1; it eases there over `durationMs`, so it creeps
// forward while a step runs instead of jumping when it finishes.
export function ProgressBar({ to, durationMs }: { to: number; durationMs: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(to, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [to, durationMs, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-raised">
      <Animated.View
        style={[{ height: "100%", borderRadius: 999, backgroundColor: colors.accent }, fillStyle]}
      />
    </View>
  );
}
