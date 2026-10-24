import { ChatsCircle } from "phosphor-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AvatarStack, Button } from "@/components/ui";
import type { Member } from "@/mocks/types";
import { colors } from "@/theme";

type Props = {
  visible: boolean;
  members: Member[];
  message: string; // "Sounds like a trip with Sam, Maya +2. Plan it?"
  summary: string; // "Fri–Sun, Nov 13–15 · under $400 each"
  onPlan: () => void;
  onDismiss: () => void;
};

const HIDDEN_Y = -340;

// Huddle's heads-up banner: drops in from the top over the chat with a spring, like a system
// notification, and slides back up on "Not now".
export function PlanBanner({ visible, members, message, summary, onPlan, onDismiss }: Props) {
  const y = useSharedValue(HIDDEN_Y);
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      y.value = withSpring(0, { damping: 16, stiffness: 170, mass: 0.9 });
      scale.value = withSpring(1, { damping: 14, stiffness: 160 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      y.value = withTiming(HIDDEN_Y, { duration: 260, easing: Easing.in(Easing.cubic) });
      scale.value = withTiming(0.96, { duration: 260 });
      opacity.value = withTiming(0, { duration: 260 });
    }
  }, [visible, y, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          top: 6,
          left: 10,
          right: 10,
          zIndex: 10,
          shadowColor: "#000",
          shadowOpacity: 0.55,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        },
        style,
      ]}
    >
      <View
        accessibilityRole="alert"
        className="gap-3 rounded-[26px] border border-line bg-raised p-4"
      >
        <View className="flex-row items-center gap-2">
          <View className="h-6 w-6 items-center justify-center rounded-lg bg-accent">
            <ChatsCircle size={16} color={colors.bg} weight="fill" />
          </View>
          <Text className="font-body-bold text-[13px] text-ink">Huddle</Text>
          <Text className="font-body text-[13px] text-faint">· now</Text>
          <View className="flex-1" />
          <AvatarStack members={members} size="sm" max={3} />
        </View>

        <View className="gap-1">
          <Text className="font-display text-[19px] leading-6 text-ink">{message}</Text>
          <Text className="font-body text-[13px] leading-[18px] text-muted">{summary}</Text>
        </View>

        <View className="flex-row gap-2">
          <Button
            label="Not now"
            variant="secondary"
            onPress={onDismiss}
            className="h-11 flex-1 px-4"
          />
          <Button label="Plan it" onPress={onPlan} className="h-11 flex-1 px-4" />
        </View>
      </View>
    </Animated.View>
  );
}
