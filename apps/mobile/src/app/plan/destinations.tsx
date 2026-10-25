import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CaretLeft } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { AccessibilityInfo, Platform, ScrollView, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type Choice,
  DestinationRow,
  DestinationTicket,
} from "@/components/destinations/DestinationChoices";
import { DestinationGlobe } from "@/components/destinations/DestinationGlobe";
import { prefetchMapTiles } from "@/components/map/MapCanvas";
import { gasPerPerson, planLegs } from "@/components/route/legs";
import { AvatarStack, Button, Display, IconButton, Label, Muted } from "@/components/ui";
import { brief } from "@/mocks";
import { destinationSuggestions, leadingDestination } from "@/mocks/destinations";
import { defaultEstimateFor, defaultPicksFor, useDriving, usePlan } from "@/store/plan";
import { colors } from "@/theme";

const GLOBE_HEIGHT = 250;

// Step 6b of the demo: the destination ideas on the globe. Huddle suggested them; the group
// picks. Home (AUS) and every idea sit on the globe with an arc each; the focused idea is the
// ticket below it, and every idea is a row in the radio list (the focused one marked).
// "Plan [City]" saves the pick and opens its map.
// MOCK: friends' votes are seeded (mocks/destinations.ts).
// Dev: ?demo=destinations holds the globe settled (screenshots); ?focus=msy|bna|den starts
// with that idea focused. Neither is linked from the app.
export default function Destinations() {
  const { demo, focus } = useLocalSearchParams<{ demo?: string; focus?: string }>();
  const reduceMotion = useReducedMotion();
  const frozen = reduceMotion || demo === "destinations";
  const chosenId = usePlan((s) => s.destinationId);
  const chooseDestination = usePlan((s) => s.chooseDestination);

  // Start on the city the group already picked, else the one with the most votes. Focusing
  // is local: nothing is saved until "Plan [City]".
  const [selectedId, setSelectedId] = useState(
    () =>
      destinationSuggestions.find((d) => d.id === focus)?.id ?? chosenId ?? leadingDestination.id,
  );
  const [globeFailed, setGlobeFailed] = useState(false);

  // Same estimate as the map footer, following the "Fly or drive?" answer.
  const driving = useDriving();
  const choices: Choice[] = useMemo(
    () =>
      destinationSuggestions.map((d) => {
        const picks = defaultPicksFor(d);
        const flight = d.flights.find((f) => picks.includes(f.id));
        const out = d.trip.legs[0];
        return {
          destination: d,
          perPerson: defaultEstimateFor(d, driving),
          travel: driving
            ? {
                mode: "drive" as const,
                hours: out?.driveHours ?? null,
                gas: gasPerPerson(planLegs(d.trip, d.flights, picks, true)),
              }
            : { mode: "fly" as const, roundTrip: flight?.pricePerPerson ?? null },
          voters: brief.members.filter((m) => d.votes.includes(m.id)),
          leader: d.id === leadingDestination.id,
        };
      }),
    [driving],
  );
  const selectedIndex = Math.max(
    0,
    choices.findIndex((c) => c.destination.id === selectedId),
  );
  const selected = choices[selectedIndex] ?? choices[0];
  const allFit = choices.every((c) => c.perPerson <= brief.budgetPerPerson);

  const focusOn = (c: Choice) => {
    setSelectedId(c.destination.id);
    prefetchMapTiles(c.destination.places); // no-op if the summary already cached it
    if (Platform.OS !== "web") {
      AccessibilityInfo.announceForAccessibility(`${c.destination.city} selected`);
    }
  };

  const plan = () => {
    if (!selected) return;
    chooseDestination(selected.destination.id);
    router.push("/plan/map");
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
        <IconButton
          icon={CaretLeft}
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/plan/summary"))}
        />
        <View className="flex-1">
          <Display accessibilityRole="header" className="text-[30px] leading-9">
            Where to?
          </Display>
          <Muted numberOfLines={1}>
            {choices.length} ideas
            {allFit ? ` · all under $${brief.budgetPerPerson}` : ""}
          </Muted>
        </View>
        <AvatarStack members={brief.members} size="sm" max={3} />
      </View>

      {globeFailed ? null : (
        <View
          className="border-y border-line"
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Globe: ${brief.origin.city} with a ${driving ? "drive" : "flight"} to ${choices
            .map((c) => c.destination.city)
            .join(", ")}. ${selected?.destination.city} is highlighted.`}
        >
          <DestinationGlobe
            origin={brief.origin}
            ideas={destinationSuggestions}
            selectedId={selected?.destination.id ?? ""}
            driving={driving}
            height={GLOBE_HEIGHT}
            frozen={frozen}
            onFail={() => setGlobeFailed(true)}
          />
        </View>
      )}

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6 pt-5">
        {selected ? (
          <DestinationTicket
            choice={selected}
            index={selectedIndex}
            total={choices.length}
            animate={!reduceMotion}
          />
        ) : null}
        <View accessibilityRole="radiogroup" accessibilityLabel="Destination ideas">
          <Label className="pb-1">Pick one for the group</Label>
          {choices.map((c) => (
            <DestinationRow
              key={c.destination.id}
              choice={c}
              selected={c === selected}
              onPress={() => focusOn(c)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="border-t border-line px-5 pb-2 pt-3">
        <Button
          label={selected ? `Plan ${selected.destination.city}` : "Plan it"}
          disabled={!selected}
          icon={<ArrowRight size={20} color={colors.bg} weight="regular" />}
          onPress={plan}
        />
      </View>
    </SafeAreaView>
  );
}
