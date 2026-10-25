import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CheckCircle, ShieldCheck } from "phosphor-react-native";
import { useRef, useState } from "react";
import { ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { destinationSteps } from "@/components/timeline/destinationSteps";
import { LiveDot, ProgressBar } from "@/components/timeline/ProgressBar";
import { ReadyRow, StepRow } from "@/components/timeline/StepRow";
import { type PlaybackStep, useStepPlayback } from "@/components/timeline/useStepPlayback";
import { AvatarStack, Button, Label, Muted, Screen, Title } from "@/components/ui";
import { cn } from "@/lib/cn";
import { brief } from "@/mocks";
import { destinationSuggestions } from "@/mocks/destinations";
import { usePreferences } from "@/store/preferences";
import { colors } from "@/theme";
import { fadeIn } from "@/theme/motion";

// Dev only: the same run with the flights tool failing, to review the fallback row.
const withFallback = (steps: PlaybackStep[]): PlaybackStep[] =>
  steps.map((s) =>
    s.tool === "search_flights"
      ? { ...s, outcome: "failed", fallback: "Couldn't reach flights, using cached results" }
      : s,
  );

// Step 2 of the demo: the live "Huddle is working" timeline, one row per agent tool call.
// It ends with three destination ideas; the group picks one on /plan/destinations.
// MOCK: plays mocks/agentSteps (numbers filled in by destinationSteps) on a timer, all
// succeeding, until the agent_steps Realtime feed exists. Dev: ?demo=done shows the finished
// timeline, ?demo=fallback the same with a failed tool.
export default function Working() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const reduceMotion = useReducedMotion();
  const instant = demo === "done" || demo === "fallback" || reduceMotion;
  // Built once per visit from the saved onboarding answers, so a late store update can't
  // restart the playback.
  const [steps] = useState(() => {
    const built = destinationSteps(usePreferences.getState());
    return demo === "fallback" ? withFallback(built) : built;
  });

  const { visible, status, ended, failed, ready, finished } = useStepPlayback(steps, instant);
  const scroll = useRef<ScrollViewInstance>(null);
  const total = steps.length;
  const summary =
    failed > 0
      ? `${total - failed} of ${total} steps done · ${failed} used a fallback`
      : `${destinationSuggestions.map((d) => d.city).join(", ")} · prices checked against sources`;

  return (
    <Screen
      className="gap-0 px-0 pt-0"
      footer={
        finished ? (
          <Animated.View entering={instant ? undefined : fadeIn()}>
            <Button
              label="See the ideas"
              onPress={() => router.push("/plan/summary")}
              icon={<ArrowRight size={20} color={colors.bg} />}
            />
          </Animated.View>
        ) : (
          <View className="h-14 flex-row items-center justify-center gap-2">
            <ShieldCheck size={18} color={colors.faint} />
            <Muted className="text-faint">Huddle checks every price before you see it</Muted>
          </View>
        )
      }
    >
      <View className="gap-3 px-5 pb-4 pt-4">
        <View className="flex-row items-center gap-2">
          {ready ? (
            <Animated.View entering={instant ? undefined : fadeIn()}>
              <CheckCircle size={16} color={colors.good} weight="fill" />
            </Animated.View>
          ) : (
            <LiveDot />
          )}
          <Label
            accessibilityLiveRegion="polite"
            className={cn("flex-1", ready ? "text-good" : "text-accent")}
          >
            {ready ? "Ideas ready" : "Huddle is working"}
          </Label>
          <AvatarStack members={brief.members} size="sm" max={5} />
        </View>

        <View className="gap-1">
          {/* No city yet: the group picks one on /plan/destinations. */}
          <Title>Planning the {brief.sourceChat.name} trip</Title>
          <Muted>
            {brief.dates.label} · {brief.members.length} people
          </Muted>
        </View>

        <View className="gap-2 pt-2">
          <ProgressBar value={total === 0 ? 1 : ended / total} />
          <Text accessibilityLiveRegion="polite" className="font-body-semibold text-xs text-faint">
            {ended} of {total} steps
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName="px-5 pb-6"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {visible.map((step, i) => (
          <StepRow key={step.id} step={step} status={status(i)} />
        ))}
        {ready ? (
          <ReadyRow
            title={`${destinationSuggestions.length} destination ideas`}
            summary={summary}
            animate={!instant}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
