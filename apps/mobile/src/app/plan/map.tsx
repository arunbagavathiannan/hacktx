import { router } from "expo-router";
import { AirplaneTilt, CaretLeft } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { CityMap } from "@/components/map/CityMap";
import { Globe } from "@/components/map/Globe";
import { PlaceSheet } from "@/components/map/PlaceSheet";
import { Button, Chip } from "@/components/ui";
import { places, trip } from "@/mocks";
import { destinationSuggestions } from "@/mocks/destinations";
import type { PlaceCategory } from "@/mocks/types";
import { usePlan } from "@/store/plan";
import { colors } from "@/theme";

// Austin, where the group is. Origin of the globe arcs.
const ORIGIN = { lat: 30.2672, lng: -97.7431 };

const filters: { key: PlaceCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hotel", label: "Stay" },
  { key: "food", label: "Eat" },
  { key: "activity", label: "Do" },
  { key: "nightlife", label: "Night out" },
];

// Overlay heights the city map keeps pins clear of.
const TOP_OVERLAY = 150;
const BOTTOM_OVERLAY = 110;

type Stage = "choose" | "dive" | "map";

// Where to? Huddle suggests destinations from the chat + preferences on a globe, the user
// picks one, the camera dives in, then options are chosen from the city map.
export default function MapScreen() {
  const [stage, setStage] = useState<Stage>("choose");
  const [destinationId, setDestinationId] = useState(destinationSuggestions[0].id);
  const [filter, setFilter] = useState<PlaceCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { picks, togglePick } = usePlan();

  const destination =
    destinationSuggestions.find((d) => d.id === destinationId) ?? destinationSuggestions[0];
  // MOCK: only Denver has mock places.
  const cityPlaces = destination.city === trip.destination.city ? places : [];
  const visible = useMemo(
    () => (filter === "all" ? cityPlaces : cityPlaces.filter((p) => p.category === filter)),
    [filter, cityPlaces],
  );
  const selected = cityPlaces.find((p) => p.id === selectedId) ?? null;
  const placePicks = picks.filter((id) => cityPlaces.some((p) => p.id === id)).length;
  const onDiveDone = useCallback(() => setStage("map"), []);

  const title =
    stage === "choose"
      ? "Where to?"
      : stage === "dive"
        ? `Flying to ${destination.city}`
        : "Pick from the map";
  const subtitle =
    stage === "choose"
      ? "Suggested from your chat and preferences"
      : stage === "dive"
        ? `From Austin · ${destination.flightTime}`
        : visible.length > 0
          ? `${visible.length} spots in ${destination.city} · tap one to see what's there`
          : `Huddle is still finding spots in ${destination.city}`;

  return (
    <View className="flex-1 bg-bg">
      {stage === "map" ? (
        <CityMap
          places={visible}
          members={trip.members}
          picks={picks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          insets={{ top: TOP_OVERLAY, bottom: BOTTOM_OVERLAY }}
        />
      ) : (
        <Animated.View exiting={FadeOut.duration(400)} style={{ flex: 1 }}>
          <Globe
            origin={ORIGIN}
            destinations={destinationSuggestions}
            selectedId={destinationId}
            phase={stage === "dive" ? "dive" : "choose"}
            onDiveDone={onDiveDone}
          />
        </Animated.View>
      )}

      {/* Top overlay: back, title, filters */}
      <SafeAreaView
        edges={["top"]}
        className="absolute left-0 right-0 top-0"
        pointerEvents="box-none"
      >
        <View className="flex-row items-center gap-3 px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (stage === "map" ? setStage("choose") : router.back())}
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/90"
          >
            <CaretLeft size={18} color={colors.ink} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-xl text-ink">{title}</Text>
            <Text className="font-body text-sm text-muted">{subtitle}</Text>
          </View>
          {stage === "dive" ? (
            <Pressable accessibilityRole="button" onPress={onDiveDone} hitSlop={10}>
              <Text className="font-body-bold text-sm text-accent">Skip</Text>
            </Pressable>
          ) : null}
        </View>

        {stage === "map" ? (
          <Animated.View entering={FadeIn.delay(200)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 px-5 pt-3"
            >
              {filters.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={filter === f.key}
                  onPress={() => {
                    setFilter(f.key);
                    setSelectedId(null);
                  }}
                />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}
      </SafeAreaView>

      {/* Bottom overlay: destination cards (choose) or book (map) */}
      {stage === "choose" ? (
        <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0 gap-3 pb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 px-5"
          >
            {destinationSuggestions.map((d) => {
              const active = d.id === destinationId;
              return (
                <Pressable
                  key={d.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setDestinationId(d.id)}
                  className={`w-64 gap-1.5 rounded-3xl border p-4 ${
                    active ? "border-accent bg-accent-soft" : "border-line bg-surface/95"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-display text-lg text-ink">{d.city}</Text>
                    <Text
                      className={`font-body-bold text-sm ${active ? "text-accent" : "text-muted"}`}
                    >
                      {d.match}% match
                    </Text>
                  </View>
                  <Text numberOfLines={2} className="font-body text-sm leading-5 text-muted">
                    {d.why}
                  </Text>
                  <Text className="font-body-semibold text-xs text-faint">
                    ~${d.estPerPerson}/person · {d.flightTime} flight
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View className="px-5">
            <Button
              label={`Plan ${destination.city}`}
              icon={<AirplaneTilt size={18} color={colors.bg} weight="fill" />}
              onPress={() => setStage("dive")}
            />
          </View>
        </SafeAreaView>
      ) : null}

      {stage === "map" ? (
        <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0 px-5 pb-2">
          <Animated.View entering={FadeIn.delay(300)}>
            <Button
              label={`Book the plan · ${placePicks} ${placePicks === 1 ? "spot" : "spots"}`}
              disabled={placePicks === 0}
              onPress={() => router.push("/plan/booked")}
            />
          </Animated.View>
        </SafeAreaView>
      ) : null}

      <PlaceSheet
        place={selected}
        members={trip.members}
        picked={selected ? picks.includes(selected.id) : false}
        onTogglePick={() => selected && togglePick(selected.id)}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}
