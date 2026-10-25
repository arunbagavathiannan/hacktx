import { CircleIcon, RadioButton } from "phosphor-react-native";
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

// Fixed-width digits for prices and times.
const TABULAR = { fontVariant: ["tabular-nums" as const] };

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
        <Text numberOfLines={1} className="px-5 font-body-semibold text-small text-muted">
          One flight, {route}
          <Text className="font-body text-caption text-faint">
            {"  "}
            {sourceLabel.serpapi_flights}
          </Text>
        </Text>
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
              aria-checked={picked}
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
                  <Text numberOfLines={1} className="flex-1 font-body-semibold text-small text-ink">
                    {f.airline}
                  </Text>
                  <Text className="font-body-bold text-small text-ink" style={TABULAR}>
                    ${f.pricePerPerson}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-body text-caption text-muted"
                    style={TABULAR}
                  >
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
