import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

// Staggered entrance for a block of the confirmation screen. NativeWind classes go on an inner
// View: on web, className on Animated.View with a layout animation is dropped.
export function Reveal({
  delay,
  className,
  children,
}: {
  delay: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)}>
      <View className={className}>{children}</View>
    </Animated.View>
  );
}
