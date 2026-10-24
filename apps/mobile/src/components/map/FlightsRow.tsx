import { AirplaneTilt, CircleIcon, RadioButton } from "phosphor-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { Flight, Member } from "@/mocks/types";
import { colors } from "@/theme";
import { sourceLabel } from "./categories";

type Props = {
  flights: Flight[];
  members: Member[];
  pickedId: string | null; // the one flight the group takes
  onPick: (id: string) => void;
  route: string; // "AUS → DEN"
  showHeader?: boolean; // the Route view labels each leg itself
};

// Compact, horizontally scrolling flight options. Single-select: the whole group flies on
// the same plane, so picking one replaces the other.
export function FlightsRow({
  flights,
  members,
  pickedId,
  onPick,
  route,
  showHeader = true,
}: Props) {
  if (flights.length === 0) return null;
  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel={`Flights ${route}`}>
      {showHeader ? (
        <View className="flex-row items-center gap-1.5 px-5">
          <AirplaneTilt size={14} color={colors.muted} weight="regular" />
          <Text className="font-body-bold text-xs uppercase tracking-widest text-muted">
            One flight {route}
          </Text>
          <Text numberOfLines={1} className="flex-1 font-body text-xs text-faint">
            · {sourceLabel.serpapi_flights}
          </Text>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5"
      >
        {flights.map((f) => {
          const picked = pickedId === f.id;
          const pickers = f.pickedBy.flatMap((id) => byId.get(id) ?? []);
          return (
            <Pressable
              key={f.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: picked }}
              accessibilityLabel={`${f.airline} ${f.depart}, $${f.pricePerPerson}${
                picked ? ", the group's flight" : ""
              }`}
              onPress={() => onPick(f.id)}
              className={`w-[228px] flex-row items-center gap-2.5 rounded-2xl border px-3 py-2.5 active:opacity-80 ${
                picked ? "border-accent bg-accent-soft" : "border-line bg-surface/95"
              }`}
            >
              {picked ? (
                <RadioButton size={22} color={colors.accent} weight="fill" />
              ) : (
                <CircleIcon size={22} color={colors.muted} weight="regular" />
              )}
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center justify-between gap-2">
                  <Text numberOfLines={1} className="flex-1 font-body-bold text-sm text-ink">
                    {f.airline}
                  </Text>
                  <Text className="font-body-bold text-sm text-ink">${f.pricePerPerson}</Text>
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text numberOfLines={1} className="flex-1 font-body text-xs text-muted">
                    {f.depart} · {f.stops === 0 ? "Nonstop" : `${f.stops} stop`}
                  </Text>
                  <View className="flex-row items-center">
                    {pickers.slice(0, 3).map((m, i) => (
                      <View
                        key={m.id}
                        accessibilityLabel={m.name}
                        className="h-4 w-4 items-center justify-center rounded-full border border-bg"
                        style={{ backgroundColor: m.color, marginLeft: i === 0 ? 0 : -5 }}
                      >
                        <Text className="font-body-bold text-[8px] text-bg">
                          {m.name.slice(0, 1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
