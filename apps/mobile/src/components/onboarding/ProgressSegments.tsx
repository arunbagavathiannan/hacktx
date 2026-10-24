import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";

// One segment per step. The current step fills in with an eased sweep.
export function ProgressSegments({ total, current }: { total: number; current: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${total}`}
      className="flex-1 flex-row gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length list of identical segments
        <Segment key={i} filled={i <= current} />
      ))}
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(filled ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [filled, fill]);

  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
      {/* Style only: NativeWind classes are ignored on Reanimated views on web. */}
      <Animated.View
        style={[{ height: "100%", borderRadius: 999, backgroundColor: colors.accent }, style]}
      />
    </View>
  );
}
