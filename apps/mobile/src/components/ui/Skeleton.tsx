import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";

// Pulsing placeholder for loading states (never a spinner on a blank screen).
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 800 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  // NativeWind className is ignored on Reanimated views on web, so the classes go on an
  // inner View and the Animated.View only animates opacity.
  return (
    <Animated.View style={style}>
      <View className={cn("rounded-lg bg-raised", className)} />
    </Animated.View>
  );
}
