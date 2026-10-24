import { AirplaneTilt, Car } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeGlobe } from "@/components/globe/SafeGlobe";
import { FlightsRow } from "@/components/map/FlightsRow";
import { groupSize } from "@/lib/pricing";
import type { Member, Trip } from "@/mocks/types";
import { colors } from "@/theme";
import { DriveCard } from "./DriveCard";
import { airportFor, globeRoute, type LegPlan } from "./legs";

type Props = {
  trip: Trip;
  legs: LegPlan[];
  members: Member[];
  onPickFlight: (leg: LegPlan, flightId: string) => void;
};

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

// Route tab of the map screen: the globe with every stop and leg, then each leg with its
// own single-select flight picker (or the drive card when the group drives it).
export function RouteView({ trip, legs, members, onPickFlight }: Props) {
  const [globeFailed, setGlobeFailed] = useState(false);
  // Memoized on the legs' modes so the globe doesn't rebuild when a flight is picked.
  const modes = legs.map((l) => l.mode).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuild only when modes change
  const globe = useMemo(() => globeRoute(trip, legs), [trip, modes]);
  const people = groupSize(trip);

  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-6">
      {globeFailed ? null : (
        <View style={{ height: 300 }} className="border-b border-line">
          <SafeGlobe
            variant="overview"
            focus={globe.focus}
            points={globe.points}
            arcs={globe.arcs}
            durationMs={1600}
            onFail={() => setGlobeFailed(true)}
          />
          <View className="absolute bottom-3 left-5 right-5 flex-row flex-wrap gap-x-3 gap-y-1">
            {[trip.origin.city, ...trip.stops.map((s) => s.city)].map((city, i) => (
              <Text key={city} className="font-body-semibold text-xs text-muted">
                <Text style={{ color: i === 0 ? colors.gold : colors.accent }}>● </Text>
                {city}
              </Text>
            ))}
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
