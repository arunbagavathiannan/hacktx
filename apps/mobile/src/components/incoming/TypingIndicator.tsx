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
import type { Member } from "@/mocks/types";
import { imessage, Monogram } from "./ChatBubble";

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
    opacity: 0.35 + lift.value * 0.65,
  }));

  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: imessage.name }, style]}
    />
  );
}

// iMessage's "someone is typing" bubble, shown between messages so the chat feels live.
export function TypingIndicator({ member }: { member: Member }) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      accessibilityLabel={`${member.name} is typing`}
      style={{ marginTop: 10 }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Monogram name={member.name} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: imessage.bubble,
            borderRadius: 19,
            paddingHorizontal: 14,
            paddingVertical: 13,
          }}
        >
          <Dot delay={0} />
          <Dot delay={130} />
          <Dot delay={260} />
        </View>
      </View>
    </Animated.View>
  );
}
