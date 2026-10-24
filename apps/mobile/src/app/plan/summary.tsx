import { router, useLocalSearchParams } from "expo-router";
import { MapTrifold, Sparkle } from "phosphor-react-native";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ClarificationCard } from "@/components/summary/ClarificationCard";
import { demoPrefs, inferAnswer, preferenceLines } from "@/components/summary/personalize";
import { TripFacts } from "@/components/summary/TripFacts";
import { Badge, Body, Button, Label, Muted, Screen, Title } from "@/components/ui";
import { clarifications, trip } from "@/mocks";
import type { Preferences } from "@/mocks/types";
import { usePlan } from "@/store/plan";
import { usePreferences } from "@/store/preferences";
import { colors, icon } from "@/theme";

const appName = { whatsapp: "WhatsApp", instagram: "Instagram" } as const;

const enter = (i: number) => FadeInDown.delay(i * 70).duration(320);

// What the agent understood from the chat, plus the one or two things it still needs.
export default function Summary() {
  // `?demo=prefs` shows the screen as if onboarding was filled in (PR screenshots).
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const vibes = usePreferences((s) => s.vibes);
  const budget = usePreferences((s) => s.budget);
  const food = usePreferences((s) => s.food);
  const maxTravel = usePreferences((s) => s.maxTravel);
  const prefs: Preferences = useMemo(
    () => (demo === "prefs" ? demoPrefs : { vibes, budget, food, maxTravel }),
    [demo, vibes, budget, food, maxTravel],
  );

  const answers = usePlan((s) => s.answers);
  const answer = usePlan((s) => s.answer);

  // Pre-answer what onboarding already told us. Never overwrite a choice the user made.
  useEffect(() => {
    for (const c of clarifications) {
      if (usePlan.getState().answers[c.id]) continue;
      const inferred = inferAnswer(c, prefs);
      if (inferred) answer(c.id, inferred);
    }
  }, [prefs, answer]);

  const remaining = clarifications.filter((c) => !answers[c.id]).length;
  const lines = preferenceLines(prefs);

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          {remaining > 0 ? (
            <Muted className="text-center">
              Answer {remaining} quick question{remaining === 1 ? "" : "s"} to open the map
            </Muted>
          ) : null}
          <Button
            label="Open the map"
            icon={<MapTrifold size={20} color={colors.bg} weight={icon.activeWeight} />}
            disabled={remaining > 0}
            onPress={() => router.push("/plan/map")}
          />
        </View>
      }
    >
      <Animated.View entering={enter(0)}>
        <View className="gap-3 pt-4">
          <Badge
            label={`From ${trip.sourceChat.name} on ${appName[trip.sourceChat.app]}`}
            tone="accent"
          />
          <Title className="text-4xl leading-[44px]">{trip.title}</Title>
          <View className="flex-row items-center gap-2">
            <Sparkle size={18} color={colors.gold} weight={icon.activeWeight} />
            <Body className="flex-1 text-muted">{trip.why}</Body>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <TripFacts trip={trip} />
      </Animated.View>

      {lines.length > 0 ? (
        <Animated.View entering={enter(2)}>
          <View className="gap-1.5 px-1">
            {lines.map((line) => (
              <View key={line} className="flex-row items-center gap-2">
                <Sparkle size={14} color={colors.accent} weight={icon.weight} />
                <Muted className="flex-1">{line}</Muted>
              </View>
            ))}
          </View>
        </Animated.View>
      ) : null}

      {clarifications.length > 0 ? (
        <Animated.View entering={enter(3)}>
          <View className="gap-3">
            <Label>
              {clarifications.length === 1 ? "One quick question" : "A few quick questions"}
            </Label>
            {clarifications.map((c) => (
              <ClarificationCard
                key={c.id}
                clarification={c}
                answer={answers[c.id]}
                fromPreferences={
                  answers[c.id] !== undefined && answers[c.id] === inferAnswer(c, prefs)
                }
                onAnswer={(o) => answer(c.id, o)}
              />
            ))}
          </View>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
