import { AirplaneTilt, Car } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { DRIVE_ARC_COLOR, type ScreenProjection } from "@/components/globe/GlobeScene";
import { SafeGlobe } from "@/components/globe/SafeGlobe";
import { FlightsRow } from "@/components/map/FlightsRow";
import { groupSize } from "@/lib/pricing";
import type { Member, Trip } from "@/mocks/types";
import { colors } from "@/theme";
import { DriveCard } from "./DriveCard";
import { airportFor, globeRoute, type LegPlan } from "./legs";
import { StopLabels } from "./StopLabels";

type Props = {
  trip: Trip;
  legs: LegPlan[];
  members: Member[];
  onPickFlight: (leg: LegPlan, flightId: string) => void;
  // Hold the globe at this progress: 1 after its first play, with reduced motion, or for
  // screenshots.
  globeFrozenAt?: number;
  onGlobeSettled?: () => void; // the swing-in finished
};

const GLOBE_HEIGHT = 340;
const LEGEND_INSET = 48; // the legend pill's strip at the bottom of the globe panel

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// The day a leg leaves: arrival day of the first stop when leaving home, else the day the
// group leaves that stop.
function legDay(trip: Trip, leg: LegPlan) {
  if (leg.leg.from === trip.origin.city) return trip.stops[0]?.arrive ?? trip.dates.start;
  return trip.stops.find((s) => s.city === leg.leg.from)?.depart ?? trip.dates.end;
}

// "Route map: Austin to Denver by plane, Denver to Austin included in the round-trip fare"
function routeSummary(legs: LegPlan[]) {
  const parts = legs.map((l) => {
    const how =
      l.mode === "drive"
        ? "by car"
        : l.options.length > 0
          ? "by plane"
          : "included in the round-trip fare";
    return `${l.leg.from} to ${l.leg.to} ${how}`;
  });
  return `Route map: ${parts.join(", ")}`;
}

// Route tab of the map screen: the globe with every stop and leg, then each leg with its
// own single-select flight picker (or the drive card when the group drives it).
export function RouteView({
  trip,
  legs,
  members,
  onPickFlight,
  globeFrozenAt,
  onGlobeSettled,
}: Props) {
  const [globeFailed, setGlobeFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  const [panelWidth, setPanelWidth] = useState(0);
  // Where the stops and arcs landed on screen, reported by the globe once it settles.
  const [projection, setProjection] = useState<ScreenProjection | null>(null);
  // Memoized on the legs' modes so the globe doesn't rebuild when a flight is picked.
  const modes = legs.map((l) => l.mode).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuild only when modes change
  const globe = useMemo(() => globeRoute(trip, legs), [trip, modes]);
  const people = groupSize(trip);

  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-6">
      {globeFailed ? null : (
        <View
          style={{ height: GLOBE_HEIGHT }}
          className="border-b border-line"
          onLayout={(e) => setPanelWidth(e.nativeEvent.layout.width)}
          // One spoken summary instead of TalkBack reading the labels and legend piece by piece.
          accessible
          accessibilityRole="image"
          accessibilityLabel={routeSummary(legs)}
        >
          <SafeGlobe
            variant="overview"
            focus={globe.focus}
            points={globe.points}
            arcs={globe.arcs}
            durationMs={1600}
            frozenAt={globeFrozenAt}
            ambient={!reduceMotion}
            onProject={setProjection}
            onDone={onGlobeSettled}
            onFail={() => setGlobeFailed(true)}
          />
          {projection && panelWidth > 0 ? (
            <StopLabels
              points={globe.points}
              projection={projection}
              width={panelWidth}
              height={GLOBE_HEIGHT}
              bottomInset={LEGEND_INSET}
            />
          ) : null}
          <View
            pointerEvents="none"
            className="absolute bottom-3 left-4 flex-row items-center gap-3.5 rounded-full border border-line bg-bg/85 px-3.5 py-1.5"
          >
            <LegendDot color={colors.gold} label="Home" ring />
            <LegendDot color={colors.accent} label={trip.stops.length > 1 ? "Stops" : "Stop"} />
            {legs.some((l) => l.mode === "fly") ? (
              <LegendLine color={colors.accent} label="Flight" />
            ) : null}
            {legs.some((l) => l.mode === "drive") ? (
              <LegendLine color={DRIVE_ARC_COLOR} label="Drive" />
            ) : null}
          </View>
        </View>
      )}

      <View className="gap-5 pt-4">
        {legs.map((leg, i) => {
          const route = `${airportFor(trip, leg.leg.from)} → ${airportFor(trip, leg.leg.to)}`;
          const Icon = leg.mode === "drive" ? Car : AirplaneTilt;
          return (
            <Animated.View key={leg.key} entering={FadeIn.delay(120 * i)} className="gap-2">
              <View className="flex-row items-center gap-2 px-5">
                <View className="h-5 w-5 items-center justify-center rounded-full bg-raised">
                  <Text className="font-body-bold text-[10px] text-ink">{i + 1}</Text>
                </View>
                <Text className="flex-1 font-body-bold text-sm text-ink" numberOfLines={1}>
                  {leg.leg.from} → {leg.leg.to}
                </Text>
                <Icon size={14} color={colors.muted} weight="regular" />
                <Text className="font-body text-xs text-muted">{shortDay(legDay(trip, leg))}</Text>
              </View>

              {leg.mode === "drive" ? (
                <View className="px-5">
                  <DriveCard
                    from={leg.leg.from}
                    hours={leg.leg.driveHours}
                    miles={leg.leg.driveMiles}
                    perPerson={leg.perPerson}
                    people={people}
                    scope="each way"
                  />
                </View>
              ) : leg.options.length > 0 ? (
                <FlightsRow
                  flights={leg.options}
                  members={members}
                  pickedId={leg.picked?.id ?? null}
                  onPick={(id) => onPickFlight(leg, id)}
                  route={route}
                  showHeader={false}
                />
              ) : (
                <Text className="px-5 font-body text-xs text-muted">
                  {route} · included in your round-trip fare
                </Text>
              )}
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// `ring` matches the globe's home marker (a ring, not a dot).
function LegendDot({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={
          ring
            ? { width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: color }
            : { width: 9, height: 9, borderRadius: 5, backgroundColor: color }
        }
      />
      <Text className="font-body-semibold text-[13px] text-ink">{label}</Text>
    </View>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Text className="font-body-semibold text-[13px] text-ink">{label}</Text>
    </View>
  );
}
