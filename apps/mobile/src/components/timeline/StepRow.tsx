import { CheckCircle, Sparkle, WarningCircle } from "phosphor-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AgentStepResult } from "@/mocks/types";
import { colors } from "@/theme";
import { fadeIn, PULSE } from "@/theme/motion";
import { toolIcons } from "./toolIcons";
import {
  LINE_FILL_MS,
  type PlaybackStatus,
  type PlaybackStep,
  stepSummary,
} from "./useStepPlayback";

// NativeWind className doesn't reach Reanimated views on web, so animated pieces use style.

// The running node's ring breathes (opacity only, no scaling) while the tool call runs.
function PulseRing() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(PULSE.min, { duration: PULSE.duration }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
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

// Line from this step down to the next one. Draws itself once the step has ended.
function Connector({ filled, color }: { filled: boolean; color: string }) {
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
        style={[{ width: "100%", borderRadius: 999, backgroundColor: color }, style]}
      />
    </View>
  );
}

type Props = {
  step: PlaybackStep;
  status: PlaybackStatus;
};

// One line per option the tool found (e.g. per destination idea), hairline-separated.
function Results({ results }: { results: AgentStepResult[] }) {
  return (
    <View className="mt-2 border-t border-line">
      {results.map((r) => (
        <View key={r.label} className="flex-row items-baseline gap-2 border-b border-line py-1.5">
          <Text className="font-body-semibold text-sm text-ink">{r.label}</Text>
          {r.note ? (
            <Text numberOfLines={1} className="flex-1 font-body text-sm text-muted">
              {r.note}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {r.value ? (
            <Text
              className="font-body-bold text-sm text-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {r.value}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// One tool call in the "Huddle is working" timeline. Every step connects down to the next
// one, and the last one to the closing "Plan ready" row.
export function StepRow({ step, status }: Props) {
  const Icon = toolIcons[step.tool];
  const running = status === "running";
  const failed = status === "failed";
  const tint = failed ? colors.gold : colors.accent;

  return (
    <Animated.View entering={fadeIn()}>
      <View
        accessible
        accessibilityLabel={running ? `${step.label}, working` : stepSummary(step)}
        className="flex-row gap-4"
      >
        <View className="w-11 items-center">
          <View className="h-11 w-11 items-center justify-center">
            {running ? <PulseRing /> : null}
            <View
              className={cn(
                "h-11 w-11 items-center justify-center rounded-full border",
                running ? "border-accent bg-surface" : "border-accent-soft bg-accent-soft",
              )}
            >
              <Icon size={20} color={tint} weight={running ? "fill" : "regular"} />
            </View>
          </View>
          <Connector filled={!running} color={tint} />
        </View>

        <View className="flex-1 gap-1 pb-5 pt-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 font-body-semibold text-base text-ink">{step.label}</Text>
            {running ? (
              <Text className="font-body-semibold text-xs text-accent">Working</Text>
            ) : (
              <Animated.View entering={fadeIn()}>
                {failed ? (
                  <WarningCircle size={20} color={colors.gold} weight="fill" />
                ) : (
                  <CheckCircle size={20} color={colors.good} weight="fill" />
                )}
              </Animated.View>
            )}
          </View>
          {running ? (
            <Skeleton className="mt-1 h-3.5 w-3/4" />
          ) : (
            <Animated.View entering={fadeIn()}>
              <Text
                className={cn("font-body text-sm leading-5", failed ? "text-gold" : "text-muted")}
              >
                {failed ? (step.fallback ?? "Skipped. Huddle kept going without it.") : step.detail}
              </Text>
              {!failed && step.results?.length ? <Results results={step.results} /> : null}
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// Closing row: the last connector lands on a green node, then "Plan ready". It fades in; no pop.
export function ReadyRow({
  summary,
  animate,
  title = "Plan ready",
}: {
  summary: string;
  animate: boolean;
  title?: string;
}) {
  return (
    <Animated.View entering={animate ? fadeIn() : undefined}>
      <View accessible accessibilityLabel={`${title}. ${summary}`} className="flex-row gap-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-good">
          <Sparkle size={20} color={colors.bg} weight="fill" />
        </View>
        <View className="flex-1 gap-1 pt-1">
          <Text className="font-display text-lg leading-6 text-ink">{title}</Text>
          <Text className="font-body text-sm leading-5 text-muted">{summary}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
