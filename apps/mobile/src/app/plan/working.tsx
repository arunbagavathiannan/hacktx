import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CheckCircle, ShieldCheck } from "phosphor-react-native";
import { useRef } from "react";
import { ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp, useReducedMotion } from "react-native-reanimated";
import { LiveDot, ProgressBar } from "@/components/timeline/ProgressBar";
import { StepRow } from "@/components/timeline/StepRow";
import { useStepPlayback } from "@/components/timeline/useStepPlayback";
import { AvatarStack, Button, Label, Muted, Screen, Title } from "@/components/ui";
import { agentSteps, trip } from "@/mocks";
import { colors } from "@/theme";

// Step 2 of the demo: the live "Huddle is working" timeline, one row per agent tool call.
// MOCK: plays mocks/agentSteps on a timer until the agent_steps Realtime feed exists.
// Dev: /plan/working?demo=done shows the finished timeline.
export default function Working() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const reduceMotion = useReducedMotion();
  const instant = demo === "done" || reduceMotion;

  const { visible, status, done, finished } = useStepPlayback(agentSteps, instant);
  const scroll = useRef<ScrollViewInstance>(null);
  const total = agentSteps.length;

  return (
    <Screen
      className="gap-0 px-0 pt-0"
      footer={
        finished ? (
          <Animated.View entering={instant ? undefined : FadeInUp.springify().damping(16)}>
            <Button
              label="See the plan"
              onPress={() => router.push("/plan/summary")}
              icon={<ArrowRight size={20} color={colors.bg} weight="bold" />}
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
      <View className="gap-3 px-5 pb-5 pt-6">
        <View className="flex-row items-center gap-2">
          {finished ? (
            <Animated.View entering={instant ? undefined : FadeIn}>
              <CheckCircle size={16} color={colors.good} weight="fill" />
            </Animated.View>
          ) : (
            <LiveDot />
          )}
          <Label className={finished ? "text-good" : "text-accent"}>
            {finished ? "Plan ready" : "Huddle is working"}
          </Label>
        </View>

        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1 gap-1">
            <Title>{trip.title}</Title>
            <Muted>
              {trip.dates.label} · from {trip.sourceChat.name}
            </Muted>
          </View>
          <AvatarStack members={trip.members} size="sm" max={5} />
        </View>

        <View className="gap-2 pt-2">
          <ProgressBar value={total === 0 ? 1 : done / total} />
          <Text className="font-body-semibold text-xs text-faint">
            {done} of {total} steps
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
          <StepRow key={step.id} step={step} status={status(i)} last={i === total - 1} />
        ))}
      </ScrollView>
    </Screen>
  );
}
