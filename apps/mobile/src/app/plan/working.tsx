import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, PaperPlaneTilt, ShieldCheck } from "phosphor-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, type ScrollViewInstance, TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { destinationSteps } from "@/components/timeline/destinationSteps";
import { LiveDot, ProgressBar } from "@/components/timeline/ProgressBar";
import { ReadyRow, StepRow } from "@/components/timeline/StepRow";
import { type PlaybackStep, useStepPlayback } from "@/components/timeline/useStepPlayback";
import { AvatarStack, Button, Caption, Muted, Screen, Title } from "@/components/ui";
import { LIVE, toPlaybackStep } from "@/lib/live";
import { brief } from "@/mocks";
import { destinationSuggestions } from "@/mocks/destinations";
import { useLive } from "@/store/live";
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
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  return LIVE && plan ? <LiveWorking planId={plan} /> : <MockWorking />;
}

// Live mode (lib/live.ts): the same timeline, one row per real agent_steps row as it streams
// in over Supabase Realtime. It ends on the plan (map), a question, or an error.
function LiveWorking({ planId }: { planId: string }) {
  useEffect(() => useLive.getState().watch(planId), [planId]);
  const rows = useLive((s) => s.steps);
  const phase = useLive((s) => s.phase);
  const question = useLive((s) => s.question);
  const error = useLive((s) => s.error);
  const steps = useMemo(() => rows.map(toPlaybackStep), [rows]);
  const scroll = useRef<ScrollViewInstance>(null);

  const ended = rows.filter((r) => r.status !== "running").length;
  const done = phase === "ready" || phase === "needs_input" || phase === "failed";
  // A full run is about 10 steps; the bar fills as they finish and completes at the end.
  const progress = done ? 1 : ended / Math.max(rows.length + 1, 10);
  const trip = rows.find((r) => r.tool === "extract_trip" && r.status === "done")?.result_summary;
  const verified = [...rows].reverse().find((r) => r.tool === "verify" && r.status === "done");

  return (
    <Screen
      className="gap-0 px-0 pt-0"
      footer={
        phase === "ready" ? (
          <Animated.View entering={fadeIn()}>
            <Button
              label="See the plan"
              onPress={() => router.push("/plan/map")}
              icon={<ArrowRight size={20} color={colors.bg} />}
            />
          </Animated.View>
        ) : phase === "needs_input" ? (
          <AnswerBox question={question} />
        ) : phase === "failed" ? (
          <View className="gap-3">
            <Muted className="text-center">{error ?? "Huddle hit a snag."}</Muted>
            <Button label="Back to the chat" onPress={() => router.back()} />
          </View>
        ) : (
          <View className="h-14 flex-row items-center justify-center gap-2">
            <ShieldCheck size={18} color={colors.faint} />
            <Muted className="text-faint">Huddle checks every price before you see it</Muted>
          </View>
        )
      }
    >
      <View className="gap-4 px-5 pb-3 pt-4">
        <View className="gap-1">
          <Title>Planning the {brief.sourceChat.name} trip</Title>
          <Muted numeric>{trip ?? "Reading the chat…"}</Muted>
        </View>
        <View className="gap-2">
          <ProgressBar value={progress} />
          <View className="h-4 flex-row items-center gap-2">
            {done ? null : <LiveDot />}
            <Caption
              numeric
              accessibilityLiveRegion="polite"
              className={done ? "text-muted" : "font-body-semibold text-accent"}
            >
              {done ? `${ended} steps done` : `Working · ${ended} done`}
            </Caption>
          </View>
        </View>
      </View>

      <View className="flex-1">
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="px-5 pb-6 pt-4"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          {steps.map((step, i) => (
            <StepRow
              key={step.id}
              step={step}
              status={rows[i]?.status === "running" ? "running" : (step.outcome ?? "done")}
            />
          ))}
          {phase === "ready" ? (
            <ReadyRow summary={verified?.result_summary ?? "Checked against the sources"} animate />
          ) : null}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.bg, `${colors.bg}00`]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24 }}
        />
      </View>
    </Screen>
  );
}

// Huddle asked the group something (ask_user). The answer joins the chat and the same plan
// keeps going, live. City chips cover the usual question, "where to?".
const CITY_CHIPS = destinationSuggestions.map((d) => d.city);

function AnswerBox({ question }: { question: string | null }) {
  const [text, setText] = useState("");
  const send = (answer: string) => {
    const value = answer.trim();
    if (!value) return;
    const { vibes, budget, food, maxTravel } = usePreferences.getState();
    useLive.getState().reply(value, { vibes, budget, food, maxTravel });
    setText("");
  };
  return (
    <View className="gap-3">
      <Muted className="text-center">{question ?? "Huddle needs one more detail."}</Muted>
      <View className="flex-row flex-wrap justify-center gap-2">
        {CITY_CHIPS.map((city) => (
          <Pressable
            key={city}
            accessibilityRole="button"
            accessibilityLabel={`Answer ${city}`}
            onPress={() => send(`Let's do ${city}`)}
            className="min-h-11 justify-center rounded-full border border-line bg-surface px-4 active:bg-raised"
          >
            <Caption className="text-ink">{city}</Caption>
          </Pressable>
        ))}
      </View>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => send(text)}
          placeholder="Or type an answer"
          placeholderTextColor={colors.faint}
          accessibilityLabel="Answer Huddle"
          returnKeyType="send"
          className="h-11 flex-1 rounded-full border border-line bg-surface px-4 font-body text-sm text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send answer"
          onPress={() => send(text)}
          className="h-11 w-11 items-center justify-center rounded-full bg-raised active:opacity-80"
        >
          <PaperPlaneTilt size={20} color={text.trim() ? colors.accent : colors.faint} />
        </Pressable>
      </View>
    </View>
  );
}

function MockWorking() {
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
      {/* Status is said once: the bar and the line under it. The ready row below is the payoff. */}
      <View className="gap-4 px-5 pb-3 pt-4">
        <View className="gap-1">
          {/* No city yet: the group picks one on /plan/destinations. */}
          <Title>Planning the {brief.sourceChat.name} trip</Title>
          <View className="flex-row items-center gap-3">
            <Muted numeric className="flex-1">
              {brief.dates.label} · {brief.members.length} people
            </Muted>
            <AvatarStack members={brief.members} size="sm" max={5} />
          </View>
        </View>

        <View className="gap-2">
          <ProgressBar value={total === 0 ? 1 : ended / total} />
          <View className="h-4 flex-row items-center gap-2">
            {ready ? null : <LiveDot />}
            <Caption
              numeric
              accessibilityLiveRegion="polite"
              className={ready ? "text-muted" : "font-body-semibold text-accent"}
            >
              {ready ? `${ended} of ${total} steps done` : `Working · ${ended} of ${total}`}
            </Caption>
          </View>
        </View>
      </View>

      <View className="flex-1">
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="px-5 pb-6 pt-4"
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
        {/* Rows scroll under the header through a short fade instead of a hard cut. */}
        <LinearGradient
          pointerEvents="none"
          colors={[colors.bg, `${colors.bg}00`]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24 }}
        />
      </View>
    </Screen>
  );
}
