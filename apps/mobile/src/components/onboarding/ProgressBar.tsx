import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors } from "@/theme";

function Segment({ filled }: { filled: boolean }) {
  const progress = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(filled ? 1 : 0, { duration: 280 });
  }, [filled, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
      <Animated.View
        style={[{ height: "100%", borderRadius: 999, backgroundColor: colors.accent }, fill]}
      />
    </View>
  );
}

// One segment per question; segments up to the current step fill in.
export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View
      className="flex-1 flex-row gap-1.5"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} filled={i <= step} />
      ))}
    </View>
  );
}
