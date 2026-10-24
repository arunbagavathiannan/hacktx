import { CheckCircle } from "phosphor-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import type { AgentStep } from "@/mocks/types";
import { colors } from "@/theme";
import { toolIcons } from "./toolIcons";
import { LINE_FILL_MS, type PlaybackStatus } from "./useStepPlayback";

// Expanding ring around the node while the tool call is running.
function PulseRing() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.ease) }), -1);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - t.value),
    transform: [{ scale: 1 + 0.55 * t.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: colors.accent,
        },
        style,
      ]}
    />
  );
}

// Pulsing placeholder where the result will appear. Style-based (not className) because
// NativeWind classes don't reach Reanimated's Animated.View on web.
function PendingLine() {
  const o = useSharedValue(0.35);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.8, { duration: 800 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { marginTop: 4, height: 14, width: "75%", borderRadius: 8, backgroundColor: colors.raised },
        style,
      ]}
    />
  );
}

// Line from this step down to the next one. Draws itself once the step is done.
function Connector({ filled }: { filled: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(filled ? 1 : 0, {
      duration: LINE_FILL_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [filled, p]);
  const style = useAnimatedStyle(() => ({ height: `${p.value * 100}%` }));
  return (
    <View className="my-1.5 w-0.5 flex-1 overflow-hidden rounded-full bg-line">
      <Animated.View
        style={[{ width: "100%", borderRadius: 999, backgroundColor: colors.accent }, style]}
      />
    </View>
  );
}

type Props = {
  step: AgentStep;
  status: PlaybackStatus;
  last: boolean; // no connector under the final step
};

// One tool call in the "Huddle is working" timeline.
export function StepRow({ step, status, last }: Props) {
  const Icon = toolIcons[step.tool];
  const done = status === "done";

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(160)}
      accessibilityLabel={done ? `${step.label}, done: ${step.detail}` : `${step.label}, running`}
    >
      <View className="flex-row gap-4">
        <View className="w-11 items-center">
          <View className="h-11 w-11 items-center justify-center">
            {done ? null : <PulseRing />}
            <View
              className={cn(
                "h-11 w-11 items-center justify-center rounded-full border",
                done ? "border-accent-soft bg-accent-soft" : "border-accent bg-surface",
              )}
            >
              <Icon size={20} color={colors.accent} weight={done ? "regular" : "fill"} />
            </View>
          </View>
          {last ? null : <Connector filled={done} />}
        </View>

        <View className={cn("flex-1 gap-1.5 pt-1", last ? "pb-2" : "pb-7")}>
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 font-body-semibold text-base text-ink">{step.label}</Text>
            {done ? (
              <Animated.View entering={ZoomIn.springify().damping(12)}>
                <CheckCircle size={20} color={colors.good} weight="fill" />
              </Animated.View>
            ) : (
              <Text className="font-body-semibold text-xs text-accent">Working</Text>
            )}
          </View>
          {done ? (
            <Animated.View entering={FadeIn.duration(260)}>
              <Text className="font-body text-sm leading-5 text-muted">{step.detail}</Text>
            </Animated.View>
          ) : (
            <PendingLine />
          )}
        </View>
      </View>
    </Animated.View>
  );
}
