import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CheckCircle, ShieldCheck } from "phosphor-react-native";
import { useRef } from "react";
import { ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import Animated, { FadeInUp, useReducedMotion, ZoomIn } from "react-native-reanimated";
import { LiveDot, ProgressBar } from "@/components/timeline/ProgressBar";
import { ReadyRow, StepRow } from "@/components/timeline/StepRow";
import { type PlaybackStep, useStepPlayback } from "@/components/timeline/useStepPlayback";
import { AvatarStack, Button, Label, Muted, Screen, Title } from "@/components/ui";
import { cn } from "@/lib/cn";
import { agentSteps, trip } from "@/mocks";
import { colors } from "@/theme";

// Dev only: the same run with the flights tool failing, to review the fallback row.
const fallbackSteps: PlaybackStep[] = agentSteps.map((s) =>
  s.tool === "search_flights"
    ? { ...s, outcome: "failed", fallback: "Couldn't reach flights, using cached results" }
    : s,
);

// Step 2 of the demo: the live "Huddle is working" timeline, one row per agent tool call.
// MOCK: plays mocks/agentSteps on a timer (all succeed) until the agent_steps Realtime feed
// exists. Dev: ?demo=done shows the finished timeline, ?demo=fallback the same with a
// failed tool.
export default function Working() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const reduceMotion = useReducedMotion();
  const instant = demo === "done" || demo === "fallback" || reduceMotion;
  const steps = demo === "fallback" ? fallbackSteps : agentSteps;

  const { visible, status, ended, failed, ready, finished } = useStepPlayback(steps, instant);
  const scroll = useRef<ScrollViewInstance>(null);
  const total = steps.length;
  const summary =
    failed > 0
      ? `${total - failed} of ${total} steps done · ${failed} used a fallback`
      : `${total} steps done · prices checked against sources`;

  return (
    <Screen
      className="gap-0 px-0 pt-0"
      footer={
        finished ? (
          <Animated.View entering={instant ? undefined : FadeInUp.duration(300)}>
            <Button
              label="See the plan"
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
            <Animated.View entering={instant ? undefined : ZoomIn.duration(200)}>
              <CheckCircle size={16} color={colors.good} weight="fill" />
            </Animated.View>
          ) : (
            <LiveDot />
          )}
          <Label
            accessibilityLiveRegion="polite"
            className={cn("flex-1", ready ? "text-good" : "text-accent")}
          >
            {ready ? "Plan ready" : "Huddle is working"}
          </Label>
          <AvatarStack members={trip.members} size="sm" max={5} />
        </View>

        <View className="gap-1">
          {/* No city yet: the group picks one on the summary screen. */}
          <Title>Planning the {trip.sourceChat.name} trip</Title>
          <Muted>
            {trip.dates.label} · from {trip.sourceChat.name}
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
        {ready ? <ReadyRow summary={summary} animate={!instant} /> : null}
      </ScrollView>
    </Screen>
  );
}
