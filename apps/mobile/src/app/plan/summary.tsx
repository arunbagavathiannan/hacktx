import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Sparkle } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { prefetchMapTiles } from "@/components/map/MapCanvas";
import { ClarificationCard } from "@/components/summary/ClarificationCard";
import { DestinationTeaser } from "@/components/summary/DestinationTeaser";
import {
  demoPrefs,
  inferAnswer,
  preferenceHint,
  preferenceLines,
  tripContext,
} from "@/components/summary/personalize";
import { TripFacts } from "@/components/summary/TripFacts";
import { Badge, Body, Button, Label, Muted, Screen, Title } from "@/components/ui";
import { brief, clarifications } from "@/mocks";
import { destinationSuggestions } from "@/mocks/destinations";
import type { Preferences } from "@/mocks/types";
import { destinationEstimates, usePlan } from "@/store/plan";
import { usePreferences } from "@/store/preferences";
import { colors, icon } from "@/theme";

const appName = { whatsapp: "WhatsApp", instagram: "Instagram" } as const;
// Every idea's flights, so "Short flight (<3h)" can answer fly-or-drive before the pick.
const travel = tripContext(destinationSuggestions.flatMap((d) => d.flights));
const ideas = destinationEstimates();

const enter = (i: number) => FadeInDown.delay(i * 70).duration(320);

// Clarification ids whose saved answer was filled in from onboarding (not tapped by the user).
// Module-level so it lasts as long as the in-memory plan store, across visits to this screen.
const autoFilled = new Set<string>();

// What the agent understood from the chat, plus the one or two things it still needs, and a
// look at the destination ideas. The group picks the city next, on the globe.
export default function Summary() {
  useEffect(() => {
    // Cache every idea's map tiles now, so whichever city the group picks has streets.
    for (const d of destinationSuggestions) prefetchMapTiles(d.places);
  }, []);
  // MOCK: `?demo=prefs` renders with sample preferences (PR screenshots, demo rehearsal).
  // Display-only: its answers live in local state and never reach usePlan.
  const isDemo = useLocalSearchParams<{ demo?: string }>().demo === "prefs";
  const vibes = usePreferences((s) => s.vibes);
  const budget = usePreferences((s) => s.budget);
  const food = usePreferences((s) => s.food);
  const maxTravel = usePreferences((s) => s.maxTravel);
  const prefs: Preferences = useMemo(
    () => (isDemo ? demoPrefs : { vibes, budget, food, maxTravel }),
    [isDemo, vibes, budget, food, maxTravel],
  );

  const storeAnswers = usePlan((s) => s.answers);
  const answer = usePlan((s) => s.answer);
  const [demoAnswers, setDemoAnswers] = useState<Record<string, string>>({});
  const saved = isDemo ? demoAnswers : storeAnswers;

  const inferred = useMemo(
    () => Object.fromEntries(clarifications.map((c) => [c.id, inferAnswer(c, prefs, travel)])),
    [prefs],
  );

  // Computed during render (not after an effect) so the footer is right on the first frame.
  // An auto-filled answer that no longer matches the preferences (edited in Settings) is stale:
  // ignore it so it never looks user-chosen. The effect below re-infers or clears it.
  const stale = (id: string) => !isDemo && autoFilled.has(id) && saved[id] !== inferred[id];
  const shown = (id: string) => (stale(id) ? undefined : saved[id]) ?? inferred[id] ?? undefined;
  const fromPreferences = (id: string) =>
    inferred[id] != null &&
    shown(id) === inferred[id] &&
    (saved[id] === undefined || (!isDemo && autoFilled.has(id)));

  // Real flow: save what onboarding answered so later screens see it. Never overwrite a choice
  // the user tapped; only answers we auto-filled get re-inferred or cleared.
  useEffect(() => {
    if (isDemo) return;
    for (const c of clarifications) {
      const auto = inferred[c.id];
      const current = usePlan.getState().answers[c.id];
      if (current === undefined) {
        if (auto) {
          autoFilled.add(c.id);
          answer(c.id, auto);
        }
      } else if (autoFilled.has(c.id) && current !== auto) {
        if (auto) answer(c.id, auto);
        else {
          autoFilled.delete(c.id);
          usePlan.setState((s) => {
            const { [c.id]: _, ...rest } = s.answers;
            return { answers: rest };
          });
        }
      }
    }
  }, [isDemo, inferred, answer]);

  const onAnswer = (id: string, option: string) => {
    if (isDemo) {
      setDemoAnswers((a) => ({ ...a, [id]: option }));
      return;
    }
    autoFilled.delete(id);
    answer(id, option);
  };

  // The group picks the city on the globe (/plan/destinations), not here. Coming back after a
  // pick, the summary names it.
  const destinationId = usePlan((s) => s.destinationId);
  const destination = isDemo
    ? null
    : (destinationSuggestions.find((d) => d.id === destinationId) ?? null);

  const remaining = clarifications.filter((c) => !shown(c.id)).length;
  const lines = preferenceLines(prefs);
  const blocker =
    remaining > 0
      ? `Answer ${remaining} quick question${remaining === 1 ? "" : "s"} to see where to go`
      : null;

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          {blocker ? <Muted className="text-center">{blocker}</Muted> : null}
          <Button
            label="Find where to go"
            icon={<ArrowRight size={20} color={colors.bg} weight={icon.weight} />}
            disabled={blocker !== null}
            onPress={() => router.push("/plan/destinations")}
          />
        </View>
      }
    >
      <Animated.View entering={enter(0)}>
        <View className="gap-3 pt-4">
          <Badge
            label={`From ${brief.sourceChat.name} on ${appName[brief.sourceChat.app]}`}
            tone="accent"
          />
          <Title className="text-4xl leading-[44px]">
            {destination ? destination.trip.title : brief.title}
          </Title>
          <View className="flex-row items-center gap-2">
            <Sparkle size={18} color={colors.gold} weight={icon.activeWeight} />
            <Body className="flex-1 text-muted">
              {destination ? destination.trip.why : brief.why}
            </Body>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <TripFacts trip={brief} destination={destination} ideas={destinationSuggestions.length} />
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
                answer={shown(c.id)}
                fromPreferences={fromPreferences(c.id)}
                hint={preferenceHint(c, prefs)}
                onAnswer={(o) => onAnswer(c.id, o)}
              />
            ))}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(4)}>
        <DestinationTeaser ideas={ideas} budgetPerPerson={brief.budgetPerPerson} />
      </Animated.View>
    </Screen>
  );
}
