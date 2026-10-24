import { type ReactNode, useLayoutEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type Props = {
  stepKey: number;
  direction: 1 | -1; // 1 = forward (slides in from the right), -1 = back
  children: ReactNode;
};

// Slides and fades each new step in from the side the user is moving toward.
export function StepTransition({ stepKey, direction, children }: Props) {
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  const shown = useRef(stepKey);

  useLayoutEffect(() => {
    if (shown.current === stepKey) return; // first render: no animation
    shown.current = stepKey;
    const ease = Easing.out(Easing.cubic);
    x.value = withSequence(
      withTiming(direction * 36, { duration: 0 }),
      withTiming(0, { duration: 360, easing: ease }),
    );
    opacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 280, easing: ease }),
    );
  }, [stepKey, direction, x, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <View className="flex-1 gap-6">{children}</View>
    </Animated.View>
  );
}
