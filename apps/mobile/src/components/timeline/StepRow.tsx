import { Check, WarningCircle } from "phosphor-react-native";
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

const TABULAR = { fontVariant: ["tabular-nums" as const] };

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
        <View key={r.label} className="flex-row items-baseline gap-2 border-b border-line py-2">
          <Text className="font-body-semibold text-small text-ink">{r.label}</Text>
          {r.note ? (
            <Text numberOfLines={1} className="flex-1 font-body text-small text-muted">
              {r.note}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {r.value ? (
            <Text className="font-body-bold text-small text-ink" style={TABULAR}>
              {r.value}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// One tool call in the "Huddle is working" timeline. Every step connects down to the next
// one, and the last one to the closing "Plan ready" row. Only the running step is in accent:
// a finished step drops to a small outlined node with a muted icon, so the eye lands on what
// is happening now. The connector carries the progress color.
export function StepRow({ step, status }: Props) {
  const Icon = toolIcons[step.tool];
  const running = status === "running";
  const failed = status === "failed";
  const iconColor = running ? colors.accent : failed ? colors.gold : colors.muted;

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
                "items-center justify-center rounded-full border",
                running ? "h-11 w-11 border-accent bg-surface" : "h-8 w-8 bg-bg",
                !running && (failed ? "border-gold" : "border-line"),
              )}
            >
              <Icon
                size={running ? 20 : 16}
                color={iconColor}
                weight={running ? "fill" : "regular"}
              />
            </View>
          </View>
          <Connector filled={!running} color={failed ? colors.gold : colors.accent} />
        </View>

        <View className="flex-1 gap-1 pb-6 pt-2.5">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 font-body-semibold text-body text-ink">{step.label}</Text>
            {running ? (
              <Text className="font-body-semibold text-caption text-accent">Working</Text>
            ) : (
              <Animated.View entering={fadeIn()}>
                {failed ? (
                  <WarningCircle size={18} color={colors.gold} />
                ) : (
                  <Check size={16} color={colors.good} weight="bold" />
                )}
              </Animated.View>
            )}
          </View>
          {running ? (
            <Skeleton className="mt-1 h-3.5 w-3/4" />
          ) : (
            <Animated.View entering={fadeIn()}>
              <Text
                className={cn("font-body text-small", failed ? "text-gold" : "text-muted")}
                style={TABULAR}
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

// Closing row: the last connector lands on an accent node with a check, then "Plan ready".
// The payoff stays sunset-colored; green is only the small per-step checks. Fades in, no pop.
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
        <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
          <Check size={22} color={colors.bg} weight="bold" />
        </View>
        <View className="flex-1 gap-1 pt-2.5">
          <Text className="font-display text-headline text-accent" style={TABULAR}>
            {title}
          </Text>
          <Text className="font-body text-small text-muted">{summary}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
