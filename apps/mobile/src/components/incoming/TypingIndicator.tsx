import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Avatar } from "@/components/ui";
import type { Member } from "@/mocks/types";
import { colors } from "@/theme";

function Dot({ delay }: { delay: number }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 260 })),
        -1,
      ),
    );
  }, [delay, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + lift.value * 0.6,
    transform: [{ translateY: -3 * lift.value }],
  }));

  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted }, style]}
    />
  );
}

// "Someone is typing" bubble shown between messages so the chat feels live.
export function TypingIndicator({ member }: { member: Member }) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      accessibilityLabel={`${member.name} is typing`}
    >
      <View className="flex-row items-end gap-2.5">
        <Avatar member={member} size="sm" />
        <View className="flex-row items-center gap-1.5 rounded-card rounded-bl-md border border-line bg-surface px-4 py-3.5">
          <Dot delay={0} />
          <Dot delay={130} />
          <Dot delay={260} />
        </View>
      </View>
    </Animated.View>
  );
}
