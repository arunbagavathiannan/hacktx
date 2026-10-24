import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";

// Thin overall progress bar under the timeline header. `value` is 0..1.
export function ProgressBar({ value }: { value: number }) {
  const p = useSharedValue(value);
  useEffect(() => {
    p.value = withTiming(value, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [value, p]);
  const style = useAnimatedStyle(() => ({ width: `${Math.min(Math.max(p.value, 0), 1) * 100}%` }));
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-raised">
      <Animated.View
        style={[{ height: "100%", borderRadius: 999, backgroundColor: colors.accent }, style]}
      />
    </View>
  );
}

// Small pulsing dot next to "Huddle is working".
export function LiveDot() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.25, { duration: 700 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }, style]}
    />
  );
}
