import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CaretLeft } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlobeIntro } from "@/components/globe/GlobeIntro";
import { categoryMeta, type Filter, filters } from "@/components/map/categories";
import { estimatePerPerson, nightsBetween } from "@/components/map/estimate";
import { FlightsRow } from "@/components/map/FlightsRow";
import { MapCanvas } from "@/components/map/MapCanvas";
import { PlaceSheet } from "@/components/map/PlaceSheet";
import { AvatarStack, Button, Chip, Heading, Muted } from "@/components/ui";
import { flights, members, places, trip } from "@/mocks";
import { usePlan } from "@/store/plan";
import { colors } from "@/theme";

// Austin–Bergstrom, where the arc on the globe starts. The trip mock only has the airport code.
const ORIGIN = { lat: 30.1975, lng: -97.6664, airport: trip.origin.airport };

// Room on the map for the overlays: filter chips on top, the flights row at the bottom.
const MAP_INSETS = { top: 96, right: 52, bottom: 132, left: 52 };

const NIGHTS = nightsBetween(trip.dates.start, trip.dates.end);

// Step 7 of the demo: globe zooms into Denver, then the group picks options from the map.
// Dev-only screenshot states: ?demo=globe (globe mid-zoom), ?demo=map (skip the intro),
// ?demo=sheet (map with the Red Rocks sheet open).
export default function MapScreen() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const reduceMotion = useReducedMotion();
  const skipIntro = demo === "map" || demo === "sheet" || reduceMotion;

  const [introDone, setIntroDone] = useState(false);
  const revealed = skipIntro || introDone;
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(demo === "sheet" ? "a1" : null);

  const picks = usePlan((s) => s.picks);
  const togglePick = usePlan((s) => s.togglePick);

  const shownPlaces = useMemo(
    () => (filter === "all" ? places : places.filter((p) => p.category === filter)),
    [filter],
  );
  const selected = places.find((p) => p.id === selectedId) ?? null;
  const selectedPicked = selected ? picks.includes(selected.id) : false;
  const you = members.find((m) => m.isYou);
  const selectedPickers = selected
    ? [
        ...(selectedPicked && you ? [you] : []),
        ...members.filter((m) => selected.pickedBy.includes(m.id)),
      ]
    : [];

  const perPerson = estimatePerPerson(picks, places, flights, {
    nights: NIGHTS,
    people: trip.members.length,
  });
  const fitsBudget = perPerson <= trip.budgetPerPerson;

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/plan/summary"))}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface active:opacity-80"
          >
            <CaretLeft size={18} color={colors.ink} weight="regular" />
          </Pressable>
          <View className="flex-1">
            <Heading className="text-lg leading-6">{trip.title}</Heading>
            <Muted className="text-xs leading-4">
              {trip.dates.label} · {trip.members.length} friends
            </Muted>
          </View>
          <AvatarStack members={trip.members} size="sm" max={3} />
        </View>

        <View className="flex-1 overflow-hidden border-y border-line">
          <MapCanvas
            places={shownPlaces}
            boundsFrom={places}
            members={members}
            pickedIds={picks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            insets={MAP_INSETS}
            revealed={revealed}
          />

          <LinearGradient
            colors={[colors.bg, "transparent"]}
            style={[styles.fade, { top: 0 }]}
            pointerEvents="none"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="absolute left-0 right-0 top-0"
            contentContainerClassName="gap-2 px-5 pt-3"
          >
            {filters.map((f) => {
              const meta = f.id === "all" ? null : categoryMeta[f.id];
              const active = filter === f.id;
              return (
                <Chip
                  key={f.id}
                  label={f.label}
                  selected={active}
                  onPress={() => setFilter(f.id)}
                  icon={
                    meta ? (
                      <meta.Icon
                        size={14}
                        color={active ? colors.accent : meta.color}
                        weight={active ? "fill" : "regular"}
                      />
                    ) : null
                  }
                />
              );
            })}
          </ScrollView>

          <LinearGradient
            colors={["transparent", colors.bg]}
            style={[styles.fade, { bottom: 0, height: 150 }]}
            pointerEvents="none"
          />
          {revealed ? (
            <Animated.View
              entering={FadeIn.delay(300)}
              style={{ position: "absolute", bottom: 12, left: 0, right: 0 }}
            >
              <FlightsRow
                flights={flights}
                members={members}
                pickedIds={picks}
                onToggle={togglePick}
                route={`${trip.origin.airport} → DEN`}
              />
            </Animated.View>
          ) : null}
        </View>

        <View className="gap-3 px-5 pb-2 pt-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 rounded-full bg-raised px-3.5 py-2">
              <Text className="font-body-bold text-sm text-ink">
                {picks.length} {picks.length === 1 ? "pick" : "picks"} · ${perPerson}/person est.
              </Text>
            </View>
            <Text className={`font-body-semibold text-xs ${fitsBudget ? "text-good" : "text-bad"}`}>
              {fitsBudget
                ? `Under the $${trip.budgetPerPerson} budget`
                : `Over the $${trip.budgetPerPerson} budget`}
            </Text>
          </View>
          <Button
            label="Book the plan"
            disabled={picks.length === 0}
            icon={<ArrowRight size={20} color={colors.bg} weight="regular" />}
            onPress={() => router.push("/plan/booked")}
          />
        </View>
      </SafeAreaView>

      <PlaceSheet
        place={selected}
        picked={selectedPicked}
        pickers={selectedPickers}
        onToggle={() => selected && togglePick(selected.id)}
        onDismiss={() => setSelectedId(null)}
      />

      {revealed ? null : (
        <GlobeIntro
          destination={trip.destination}
          origin={ORIGIN}
          eyebrow={`Huddle found ${places.length + flights.length} options`}
          subtitle={`${trip.origin.airport} → ${trip.destination.city} · ${trip.dates.label}`}
          frozenAt={demo === "globe" ? 0.55 : undefined}
          onDone={() => setIntroDone(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: "absolute", left: 0, right: 0, height: 72 },
});
