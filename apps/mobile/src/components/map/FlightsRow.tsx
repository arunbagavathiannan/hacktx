import { AirplaneTilt, CheckCircle, PlusCircle } from "phosphor-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { Flight, Member } from "@/mocks/types";
import { colors } from "@/theme";
import { sourceLabel } from "./categories";

type Props = {
  flights: Flight[];
  members: Member[];
  pickedIds: string[];
  onToggle: (id: string) => void;
  route: string; // "AUS → DEN"
};

// Compact, horizontally scrolling flight options docked above the footer.
export function FlightsRow({ flights, members, pickedIds, onToggle, route }: Props) {
  if (flights.length === 0) return null;
  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1.5 px-5">
        <AirplaneTilt size={14} color={colors.muted} weight="regular" />
        <Text className="font-body-bold text-xs uppercase tracking-widest text-muted">
          Flights {route}
        </Text>
        <Text className="font-body text-xs text-faint">· {sourceLabel.serpapi_flights}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5"
      >
        {flights.map((f) => {
          const picked = pickedIds.includes(f.id);
          const pickers = f.pickedBy.flatMap((id) => byId.get(id) ?? []);
          return (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: picked }}
              accessibilityLabel={`${f.airline} ${f.depart}, $${f.pricePerPerson}${
                picked ? ", in your plan" : ""
              }`}
              onPress={() => onToggle(f.id)}
              className={`w-[228px] flex-row items-center gap-2.5 rounded-2xl border px-3 py-2.5 active:opacity-80 ${
                picked ? "border-accent bg-accent-soft" : "border-line bg-surface/95"
              }`}
            >
              {picked ? (
                <CheckCircle size={22} color={colors.accent} weight="fill" />
              ) : (
                <PlusCircle size={22} color={colors.muted} weight="regular" />
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
