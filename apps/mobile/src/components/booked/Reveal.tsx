import type { ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { fadeIn } from "@/theme/motion";

// Staggered fade-in for a block of the confirmation screen (pass `stagger(i)` from
// theme/motion as the delay). NativeWind classes go on an inner View: on web, className on
// Animated.View with a layout animation is dropped.
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
    <Animated.View entering={fadeIn(delay)}>
      <View className={className}>{children}</View>
    </Animated.View>
  );
}
