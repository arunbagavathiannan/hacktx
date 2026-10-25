import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CaretLeft } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlobeIntro } from "@/components/globe/GlobeIntro";
import { categoryMeta, type Filter, filters } from "@/components/map/categories";
import { FlightsRow } from "@/components/map/FlightsRow";
import { MapCanvas } from "@/components/map/MapCanvas";
import { PlaceSheet } from "@/components/map/PlaceSheet";
import { DriveCard } from "@/components/route/DriveCard";
import {
  airportFor,
  gasPerPerson,
  globeRoute,
  type LegPlan,
  planLegs,
} from "@/components/route/legs";
import { RouteView } from "@/components/route/RouteView";
import { type MapView, ViewToggle } from "@/components/route/ViewToggle";
import { AvatarStack, Button, Chip, Heading, Muted } from "@/components/ui";
import { groupSize } from "@/lib/pricing";
import { places as denverPlaces, members } from "@/mocks";
import { destinationSuggestions } from "@/mocks/destinations";
import { multiFlights, multiTrip } from "@/mocks/multi";
import {
  isDriving,
  planPerPerson,
  togglePlace,
  useDestination,
  usePlan,
  withFlight,
} from "@/store/plan";
import { colors } from "@/theme";
import { fadeIn, MAX_STAGGER_MS } from "@/theme/motion";

// Room on the map for the overlays: filter chips on top, the flights row at the bottom.
const MAP_INSETS = { top: 96, right: 52, bottom: 132, left: 52 };

// Every flight id any trip on this screen knows, so flight picks never count as places.
const ALL_FLIGHT_IDS = new Set(
  [...destinationSuggestions.flatMap((d) => d.flights), ...multiFlights].map((f) => f.id),
);

// Step 7 of the demo: globe zooms into the city the group picked on /plan/destinations, then
// the group picks options from the map.
// MOCK: demo-only screenshot states, not linked from anywhere in the app:
// ?demo=globe (globe mid-zoom), ?demo=map (skip the intro), ?demo=callout (pin callout
// open), ?demo=sheet (headline place's callout + details sheet open), ?demo=route (Route
// tab), ?demo=multi (two-city Denver route, mocks/multi.ts), ?demo=drive (as if the group
// answered "Drive"). multi and drive are sandboxed: picks live in local state, never in
// usePlan, and booking is off there (the booked screen only knows the real plan).
// Before the group picks a city there's no map to show, so it sends you to the picker. The
// ?demo= states above skip that and show the leading idea (Denver).
export default function MapRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const chosen = usePlan((s) => s.destinationId);
  if (!chosen && !demo) return <Redirect href="/plan/destinations" />;
  return <MapScreen />;
}

function MapScreen() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const reduceMotion = useReducedMotion();
  const skipIntro =
    reduceMotion || ["map", "callout", "sheet", "route", "multi", "drive"].includes(demo ?? "");

  const destination = useDestination();
  const isMulti = demo === "multi";
  const sandboxed = isMulti || demo === "drive";
  const activeTrip = isMulti ? multiTrip : destination.trip;
  const tripFlights = isMulti ? multiFlights : destination.flights;
  const places = isMulti ? denverPlaces : destination.places;
  // MOCK: demo-only. The callout demo opens a food pin (Sushi Den in Denver).
  const calloutId =
    places.find((p) => p.id === "d3")?.id ?? places.find((p) => p.category === "food")?.id;

  const [introDone, setIntroDone] = useState(false);
  const revealed = skipIntro || introDone;
  const [view, setView] = useState<MapView>(
    demo === "route" || demo === "multi" ? "route" : "city",
  );
  const [filter, setFilter] = useState<Filter>("all");
  // selectedId shows a pin's callout; detailsId opens the full PlaceSheet (from the callout).
  // MOCK: demo-only initial states for ?demo=callout and ?demo=sheet.
  const [selectedId, setSelectedId] = useState<string | null>(
    demo === "sheet"
      ? destination.headlinePlaceId
      : demo === "callout"
        ? (calloutId ?? null)
        : null,
  );
  const [detailsId, setDetailsId] = useState<string | null>(
    demo === "sheet" ? destination.headlinePlaceId : null,
  );

  const storePicks = usePlan((s) => s.picks);
  const answers = usePlan((s) => s.answers);
  const storeTogglePick = usePlan((s) => s.togglePick);
  const storePickFlight = usePlan((s) => s.pickFlight);
  const driving = demo === "drive" || isDriving(answers);

  // MOCK: demo-only. Sandboxed demos copy the real picks once and change only the copy.
  // The two-city route starts with the group's favorite flight on each flying leg.
  const [demoPicks, setDemoPicks] = useState<string[] | null>(() => {
    if (!sandboxed) return null;
    const placesOnly = usePlan.getState().picks.filter((id) => !ALL_FLIGHT_IDS.has(id));
    if (!isMulti) return usePlan.getState().picks;
    const seeded = multiTrip.legs.flatMap((l) =>
      l.mode === "fly" ? (l.flightIds ?? []).slice(0, 1) : [],
    );
    return [...placesOnly, ...seeded];
  });
  const picks = demoPicks ?? storePicks;
  const togglePick = (id: string) =>
    demoPicks ? setDemoPicks(togglePlace(demoPicks, id)) : storeTogglePick(id);

  const legs = useMemo(
    () => planLegs(activeTrip, tripFlights, picks, driving),
    [activeTrip, tripFlights, picks, driving],
  );
  const firstLeg = legs[0];
  const pickLegFlight = (leg: LegPlan, id: string) =>
    demoPicks
      ? setDemoPicks(withFlight(demoPicks, id, leg.leg.flightIds ?? []))
      : storePickFlight(id, leg.leg.flightIds);

  // The Route globe swings in once; after that (or with reduced motion) it opens settled.
  const [routeGlobeSettled, setRouteGlobeSettled] = useState(false);

  const shownPlaces = useMemo(
    () => (filter === "all" ? places : places.filter((p) => p.category === filter)),
    [filter, places],
  );
  const sheetPlace = places.find((p) => p.id === detailsId) ?? null;
  const sheetPicked = sheetPlace ? picks.includes(sheetPlace.id) : false;
  const you = members.find((m) => m.isYou);
  const sheetPickers = sheetPlace
    ? [
        ...(sheetPicked && you ? [you] : []),
        ...members.filter((m) => sheetPlace.pickedBy.includes(m.id)),
      ]
    : [];

  // The shared estimate (store/plan planPerPerson): places and hotel, plus each leg's flight
  // or gas. The destination cards, summary and home card show the same number.
  const placePicks = picks.filter((id) => !ALL_FLIGHT_IDS.has(id));
  const people = groupSize(activeTrip);
  const perPerson = planPerPerson(
    { trip: activeTrip, flights: tripFlights, places },
    picks,
    driving,
  );
  const driveMiles = legs.reduce(
    (s, l) => s + (l.mode === "drive" ? (l.leg.driveMiles ?? 0) : 0),
    0,
  );
  const pickCount = placePicks.length + legs.filter((l) => l.picked).length;
  const fitsBudget = perPerson <= activeTrip.budgetPerPerson;

  // Only modes matter to the globe; leaving picks out keeps it from rebuilding on a pick.
  const intro = useMemo(
    () => globeRoute(activeTrip, planLegs(activeTrip, tripFlights, [], driving)),
    [activeTrip, tripFlights, driving],
  );
  const introTitle =
    activeTrip.stops.length === 1
      ? `${activeTrip.stops[0]?.city}, ${activeTrip.stops[0]?.region}`
      : activeTrip.stops.map((s) => s.city).join(" + ");
  const routeCodes = [
    activeTrip.origin.airport,
    ...activeTrip.stops.map((s) => s.airport ?? s.city),
  ].join(" → ");

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/plan/destinations")
            }
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface active:opacity-80"
          >
            <CaretLeft size={18} color={colors.ink} weight="regular" />
          </Pressable>
          <View className="flex-1">
            <Heading className="text-lg leading-6">{activeTrip.title}</Heading>
            <Muted className="text-xs leading-4">
              {activeTrip.dates.label} · {activeTrip.members.length} friends
            </Muted>
          </View>
          <AvatarStack members={activeTrip.members} size="sm" max={3} />
        </View>

        <View className="px-5 pb-3">
          <ViewToggle value={view} onChange={setView} />
        </View>

        <View className="flex-1 overflow-hidden border-y border-line">
          {view === "route" ? (
            <RouteView
              trip={activeTrip}
              legs={legs}
              members={members}
              onPickFlight={pickLegFlight}
              // MOCK: demo-only for route/multi (screenshots catch the settled globe).
              globeFrozenAt={
                reduceMotion || routeGlobeSettled || demo === "route" || isMulti ? 1 : undefined
              }
              onGlobeSettled={() => setRouteGlobeSettled(true)}
            />
          ) : (
            <>
              <MapCanvas
                places={shownPlaces}
                boundsFrom={places}
                members={members}
                pickedIds={picks}
                selectedId={selectedId}
                onSelect={setSelectedId}
                insets={MAP_INSETS}
                revealed={revealed}
                onTogglePick={togglePick}
                onOpenDetails={(id) => setDetailsId(id)}
                onDismiss={() => setSelectedId(null)}
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
              {revealed && firstLeg ? (
                <Animated.View
                  entering={fadeIn(MAX_STAGGER_MS)}
                  style={{ position: "absolute", bottom: 12, left: 0, right: 0 }}
                >
                  {firstLeg.mode === "drive" ? (
                    <View className="px-5">
                      {/* Whole-trip gas, the same number the footer and booked screen use. */}
                      <DriveCard
                        from={firstLeg.leg.from}
                        hours={firstLeg.leg.driveHours}
                        miles={driveMiles || undefined}
                        perPerson={gasPerPerson(legs)}
                        people={people}
                        scope="round trip"
                      />
                    </View>
                  ) : (
                    <FlightsRow
                      flights={firstLeg.options}
                      members={members}
                      pickedId={firstLeg.picked?.id ?? null}
                      onPick={(id) => pickLegFlight(firstLeg, id)}
                      route={`${airportFor(activeTrip, firstLeg.leg.from)} → ${airportFor(
                        activeTrip,
                        firstLeg.leg.to,
                      )}`}
                    />
                  )}
                </Animated.View>
              ) : null}
            </>
          )}
        </View>

        <View className="gap-3 px-5 pb-2 pt-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 rounded-full bg-raised px-3.5 py-2">
              <Text className="font-body-bold text-sm text-ink">
                {pickCount} {pickCount === 1 ? "pick" : "picks"} · ${perPerson}/person est.
              </Text>
            </View>
            <Text className={`font-body-semibold text-xs ${fitsBudget ? "text-good" : "text-bad"}`}>
              {fitsBudget
                ? `Under the $${activeTrip.budgetPerPerson} budget`
                : `Over the $${activeTrip.budgetPerPerson} budget`}
            </Text>
          </View>
          <Button
            label="Book the plan"
            disabled={pickCount === 0 || sandboxed}
            icon={<ArrowRight size={20} color={colors.bg} weight="regular" />}
            onPress={() => router.push("/plan/booked")}
          />
          {sandboxed ? (
            // MOCK: demo-only preview; its picks never reach the real plan.
            <Muted className="text-center text-xs">Preview only. Booking is off here.</Muted>
          ) : null}
        </View>
      </SafeAreaView>

      <PlaceSheet
        place={sheetPlace}
        picked={sheetPicked}
        pickers={sheetPickers}
        onToggle={() => sheetPlace && togglePick(sheetPlace.id)}
        // Closing details goes back to the pin's callout.
        onDismiss={() => setDetailsId(null)}
      />

      {revealed ? null : (
        <GlobeIntro
          title={introTitle || `${activeTrip.destination.city}, ${activeTrip.destination.region}`}
          focus={intro.focus}
          points={intro.points}
          arcs={intro.arcs}
          eyebrow={`Huddle found ${places.length + tripFlights.length} options`}
          subtitle={`${routeCodes} · ${activeTrip.dates.label}`}
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
