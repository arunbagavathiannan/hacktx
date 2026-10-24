import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { TimelineResult, TimelineStep } from "@/mocks/timeline";
import { colors } from "@/theme";
import { NODE, StepNode } from "./StepNode";
import type { StepStatus } from "./useTimelinePlayback";

type Props = {
  step: TimelineStep;
  status: StepStatus;
  index: number;
  last: boolean;
};

// One step on the rail: node + connector on the left, label / live activity / result on the right.
// Reanimated views only get `style` (NativeWind classes are dropped on them on web), so the
// classes live on plain Views inside.
export function TimelineRow({ step, status, index, last }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(80 * index).duration(380)}>
      <View className="flex-row gap-4">
        <View className="items-center" style={{ width: NODE }}>
          <StepNode tool={step.tool} status={status} />
          {last ? null : <Connector filled={status === "done"} />}
        </View>

        <View className={`flex-1 gap-1 pt-1.5 ${last ? "pb-2" : "pb-7"}`}>
          <Text
            className={`font-body-bold text-[15px] leading-5 ${
              status === "pending" ? "text-faint" : "text-ink"
            }`}
          >
            {step.label}
          </Text>
          {status === "pending" ? null : (
            <Text
              className={`font-body-medium text-[11px] leading-4 ${
                status === "running" ? "text-accent" : "text-faint"
              }`}
            >
              {step.tool}
              {status === "done" ? ` · ${(step.durationMs / 1000).toFixed(1)}s` : " · running"}
            </Text>
          )}

          {status === "running" ? <Activity text={step.activity} /> : null}

          {status === "done" ? (
            <Animated.View entering={FadeIn.duration(320)}>
              <Text className="font-body text-sm leading-5 text-muted">{step.detail}</Text>
            </Animated.View>
          ) : null}

          {status === "done" && step.results ? (
            <Animated.View entering={FadeInDown.delay(120).duration(360)}>
              {step.tool === "suggest_destinations" ? (
                <Destinations results={step.results} />
              ) : (
                <ResultTable results={step.results} />
              )}
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function Connector({ filled }: { filled: boolean }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(filled ? 1 : 0, { duration: 450 });
  }, [filled, fill]);
  const style = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }));

  return (
    <View className="my-1 w-0.5 flex-1 overflow-hidden rounded-full bg-line">
      <Animated.View style={[{ width: "100%", backgroundColor: colors.accent }, style]} />
    </View>
  );
}

// The "what it's doing right now" line, breathing while the tool call is in flight.
function Activity({ text }: { text: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 650 }), withTiming(1, { duration: 650 })),
      -1,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View entering={FadeIn.duration(250)} style={style}>
      <Text className="font-body text-sm leading-5 text-accent">{text}…</Text>
    </Animated.View>
  );
}

// Destination ideas as a short ranked list (three columns truncate "New Orleans" at phone width).
function Destinations({ results }: { results: TimelineResult[] }) {
  return (
    <View className="mt-2 gap-2">
      {results.map((r, i) => (
        <View
          key={r.label}
          className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5"
        >
          <View className="h-6 w-6 items-center justify-center rounded-full bg-accent-soft">
            <Text className="font-body-bold text-[11px] text-accent">{i + 1}</Text>
          </View>
          <Text className="font-display text-[15px] leading-5 text-ink">{r.label}</Text>
          {r.note ? (
            <Text className="flex-1 text-right font-body text-xs text-muted" numberOfLines={1}>
              {r.note}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function ResultTable({ results }: { results: TimelineResult[] }) {
  return (
    <View className="mt-2 rounded-2xl border border-line bg-surface px-3">
      {results.map((r, i) => (
        <View
          key={r.label}
          className={`flex-row items-center gap-3 py-2 ${i > 0 ? "border-t border-line" : ""}`}
        >
          <View className="flex-1">
            <Text className="font-body-semibold text-[13px] text-ink">{r.label}</Text>
            {r.note ? <Text className="font-body text-[11px] text-faint">{r.note}</Text> : null}
          </View>
          {r.value ? <Text className="font-body-bold text-sm text-gold">{r.value}</Text> : null}
        </View>
      ))}
    </View>
  );
}
