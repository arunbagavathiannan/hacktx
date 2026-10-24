import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CheckCircle, ShieldCheck } from "phosphor-react-native";
import { useEffect, useMemo, useRef } from "react";
import { ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ProgressBar } from "@/components/timeline/ProgressBar";
import { TimelineRow } from "@/components/timeline/TimelineRow";
import { useTimelinePlayback } from "@/components/timeline/useTimelinePlayback";
import { AvatarStack, Button, Label, Muted, Screen, Title } from "@/components/ui";
import { trip } from "@/mocks";
import {
  fallbackPreferencesDetail,
  type TimelineStep,
  timelineOutcome,
  timelineSteps,
} from "@/mocks/timeline";
import type { Preferences } from "@/mocks/types";
import { usePreferences } from "@/store/preferences";
import { colors } from "@/theme";

const budgetWords: Record<NonNullable<Preferences["budget"]>, string> = {
  $: "budget stays",
  $$: "mid-range stays",
  $$$: "nicer stays",
};

// Turns onboarding answers into the "Applying your preferences" detail line.
function preferencesDetail(p: Preferences): string {
  const parts: string[] = [];
  if (p.vibes.length) parts.push(p.vibes.slice(0, 2).join(", "));
  if (p.budget) parts.push(budgetWords[p.budget]);
  if (p.maxTravel) parts.push(p.maxTravel);
  return parts.length ? parts.join(" · ") : fallbackPreferencesDetail;
}

// Step 2 of the demo: the agent's tool calls play out live. Huddle hasn't picked a city yet;
// it suggests three and checks each one before the group decides.
export default function Working() {
  const vibes = usePreferences((s) => s.vibes);
  const budget = usePreferences((s) => s.budget);
  const food = usePreferences((s) => s.food);
  const maxTravel = usePreferences((s) => s.maxTravel);

  const steps: TimelineStep[] = useMemo(() => {
    const detail = preferencesDetail({ vibes, budget, food, maxTravel });
    return timelineSteps.map((s) => (s.tool === "apply_preferences" ? { ...s, detail } : s));
  }, [vibes, budget, food, maxTravel]);

  // Timing comes from the static script, so preferences hydrating late can't restart playback.
  // Dev-only: /plan/working?step=3 starts with the first 3 steps done (PR screenshots, rehearsal).
  const { step } = useLocalSearchParams<{ step?: string }>();
  const startAt = Math.max(0, Math.min(Number(step) || 0, timelineSteps.length));
  const { active, statusOf, doneCount, finished } = useTimelinePlayback(timelineSteps, startAt);
  const scroll = useRef<ScrollViewInstance>(null);

  const total = steps.length;
  const running = steps[active];
  // Ease toward the end of the running step over its duration; snap to 100% when finished.
  const progressTo = finished ? 1 : active < 0 ? 0.03 : (active + 0.92) / total;
  const progressMs = running ? running.durationMs : 400;
  const others = trip.members.filter((m) => !m.isYou);

  return (
    <Screen
      className="gap-4"
      footer={
        finished ? (
          <Animated.View entering={FadeInDown.duration(380)}>
            <Button
              label="See the plan"
              icon={<ArrowRight size={20} color={colors.bg} weight="bold" />}
              onPress={() => router.push("/plan/summary")}
            />
          </Animated.View>
        ) : (
          <View className="h-14 flex-row items-center justify-center gap-2 px-2">
            <ShieldCheck size={18} color={colors.faint} />
            <Muted className="flex-1 text-[13px] leading-[18px] text-faint">
              Huddle suggests, your group decides. Nothing gets booked without you.
            </Muted>
          </View>
        )
      }
    >
      <View className="gap-3 pt-4">
        <StatusLabel finished={finished} />
        <Title className="text-[28px] leading-8">
          Planning a weekend for {trip.sourceChat.name}
        </Title>
        <View className="flex-row items-center gap-3">
          <AvatarStack members={trip.members} size="sm" max={5} />
          <Muted className="flex-1" numberOfLines={1}>
            {others.length + 1} people · Nov 13–15
          </Muted>
        </View>
      </View>

      <View className="gap-2">
        <ProgressBar to={progressTo} durationMs={progressMs} />
        <View className="flex-row justify-between">
          <Text className="font-body-medium text-xs text-faint">
            {finished ? "All steps done" : `Step ${Math.max(1, active + 1)} of ${total}`}
          </Text>
          <Text className="font-body-medium text-xs text-faint">
            {doneCount} / {total} checked
          </Text>
        </View>
      </View>

      <View className="-mx-5 flex-1">
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="px-5 pb-6 pt-2"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          {steps.map((step, i) => (
            <TimelineRow
              key={step.id}
              step={step}
              status={statusOf(i)}
              index={i}
              last={i === total - 1}
            />
          ))}

          {finished ? (
            <Animated.View entering={FadeInDown.delay(150).duration(420)}>
              <View className="mt-5 flex-row items-center gap-3 rounded-card border border-accent/40 bg-accent-soft p-4">
                <CheckCircle size={26} color={colors.accent} weight="fill" />
                <View className="flex-1 gap-0.5">
                  <Text className="font-body-bold text-[15px] text-ink">
                    {timelineOutcome.title}
                  </Text>
                  <Muted>{timelineOutcome.body}</Muted>
                </View>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>
        {/* Fade the list out under the fixed header instead of a hard cut */}
        <LinearGradient
          pointerEvents="none"
          colors={[colors.bg, `${colors.bg}00`]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }}
        />
      </View>
    </Screen>
  );
}

function StatusLabel({ finished }: { finished: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = finished
      ? withTiming(1)
      : withRepeat(
          withSequence(withTiming(0.25, { duration: 600 }), withTiming(1, { duration: 600 })),
          -1,
        );
  }, [finished, pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View key={finished ? "done" : "working"} entering={FadeIn.duration(300)}>
      <View className="flex-row items-center gap-2">
        <Animated.View style={dotStyle}>
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: finished ? colors.good : colors.accent }}
          />
        </Animated.View>
        <Label className={finished ? "text-good" : "text-accent"}>
          {finished ? "Plan ready" : "Huddle is working"}
        </Label>
      </View>
    </Animated.View>
  );
}
