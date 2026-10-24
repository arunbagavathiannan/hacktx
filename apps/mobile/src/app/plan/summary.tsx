import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, ChatCircleDots } from "phosphor-react-native";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  type LayoutChangeEvent,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ClarificationCard,
  DestinationTeaser,
  FactRow,
  PreferenceChips,
} from "@/components/summary";
import { Button, Card, Label, Muted, Screen, Skeleton, Title } from "@/components/ui";
import { chat, trip } from "@/mocks";
import {
  answeredByPreferences,
  demoPreferences,
  destinationTeaser,
  facts,
  summaryClarifications,
} from "@/mocks/summary";
import type { Preferences } from "@/mocks/types";
import { usePlan } from "@/store/plan";
import { usePreferences, usePreferencesHydrated } from "@/store/preferences";
import { colors, icon } from "@/theme";

const MAX_QUESTIONS = 2;

// Staggered fade-in per section. className stays on the inner View (NativeWind classes are
// ignored on Animated views on web).
function Section({
  index,
  children,
  onLayout,
}: {
  index: number;
  children: ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 70).duration(380)} onLayout={onLayout}>
      <View className="gap-3">{children}</View>
    </Animated.View>
  );
}

// Step 3: what Huddle understood from the chat, before a destination is picked, plus at most
// two tap-to-answer questions the chat and saved preferences didn't cover.
export default function Summary() {
  // ?demo=prefs shows sample preferences without saving them (PR screenshots only).
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const hydrated = usePreferencesHydrated();
  const vibes = usePreferences((s) => s.vibes);
  const budget = usePreferences((s) => s.budget);
  const food = usePreferences((s) => s.food);
  const maxTravel = usePreferences((s) => s.maxTravel);
  const prefs = useMemo<Preferences>(
    () => (demo === "prefs" ? demoPreferences : { vibes, budget, food, maxTravel }),
    [demo, vibes, budget, food, maxTravel],
  );

  const answers = usePlan((s) => s.answers);
  const answer = usePlan((s) => s.answer);

  const { toAsk, skipped } = useMemo(() => {
    const resolved = summaryClarifications.map((c) => ({
      c,
      fromPrefs: hydrated ? answeredByPreferences(c.id, prefs) : null,
    }));
    return {
      toAsk: resolved
        .filter((r) => !r.fromPrefs)
        .map((r) => r.c)
        .slice(0, MAX_QUESTIONS),
      skipped: resolved.flatMap((r) => (r.fromPrefs ? [{ c: r.c, ...r.fromPrefs }] : [])),
    };
  }, [hydrated, prefs]);

  // Preferences that answer a question count as the group's answer, unless someone already
  // picked something else.
  useEffect(() => {
    for (const s of skipped) {
      if (!usePlan.getState().answers[s.c.id]) answer(s.c.id, s.option);
    }
  }, [skipped, answer]);

  // After a tap, bring the remaining questions into view; once all are answered, scroll to the
  // destination teaser so the next step is obvious.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const questionsY = useRef(0);
  const onAnswer = (id: string, option: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    answer(id, option);
    const stillOpen = toAsk.some((c) => c.id !== id && !answers[c.id]);
    if (stillOpen) scrollRef.current?.scrollTo({ y: Math.max(0, questionsY.current - 12) });
    else scrollRef.current?.scrollToEnd();
  };

  const left = hydrated ? toAsk.filter((c) => !answers[c.id]).length : 0;
  const ctaLabel = left > 0 ? `Find where to go · ${left} left` : "Find where to go";

  return (
    <Screen
      className="px-0 pt-0"
      footer={
        <Button
          label={ctaLabel}
          icon={<ArrowRight size={20} color={colors.bg} weight={icon.weight} />}
          onPress={() => router.push("/plan/map")}
        />
      }
    >
      <ScrollView ref={scrollRef} contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        <Section index={0}>
          <View className="flex-row items-center gap-2 pt-3">
            <ChatCircleDots size={18} color={colors.accent} weight={icon.activeWeight} />
            <Muted className="font-body-semibold">
              {chat.length} messages in {trip.sourceChat.name}
            </Muted>
          </View>
          <Title>Here's the plan so far</Title>
          <Muted>Every detail points back to the message it came from.</Muted>
        </Section>

        <Section index={1}>
          <Card className="gap-3.5">
            {facts.map((fact, i) => (
              <View key={fact.kind} className={i > 0 ? "border-t border-line pt-3.5" : undefined}>
                <FactRow fact={fact} />
              </View>
            ))}
          </Card>
        </Section>

        {!hydrated || toAsk.length > 0 ? (
          <Section
            index={2}
            onLayout={(e) => {
              questionsY.current = e.nativeEvent.layout.y;
            }}
          >
            <View className="flex-row items-baseline justify-between gap-2">
              <Label>
                {hydrated
                  ? `${toAsk.length} quick question${toAsk.length === 1 ? "" : "s"}`
                  : "Quick questions"}
              </Label>
              {left > 0 ? <Muted className="text-xs">Skipped ones count as “Either”</Muted> : null}
            </View>
            {hydrated ? (
              toAsk.map((c) => (
                <ClarificationCard
                  key={c.id}
                  clarification={c}
                  answer={answers[c.id]}
                  onAnswer={(option) => onAnswer(c.id, option)}
                />
              ))
            ) : (
              <Skeleton className="h-40 w-full rounded-card" />
            )}
          </Section>
        ) : null}

        <Section index={3}>
          <Label>Using your preferences</Label>
          <PreferenceChips
            prefs={prefs}
            loading={!hydrated}
            skipped={skipped.map((s) => ({ question: s.c.question, because: s.because }))}
          />
        </Section>

        <Section index={4}>
          <DestinationTeaser
            count={destinationTeaser.count}
            line={destinationTeaser.line}
            onPress={() => router.push("/plan/map")}
          />
        </Section>
      </ScrollView>
    </Screen>
  );
}
