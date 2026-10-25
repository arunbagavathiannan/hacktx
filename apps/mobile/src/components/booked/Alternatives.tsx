import { CaretDown, CaretUp } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { travelDetail, travelPrice } from "@/components/map/travel";
import { Heading, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import { groupSize, hotelCost, nightsBetween } from "@/lib/pricing";
import type { Flight, Place, Trip } from "@/mocks/types";
import { colors } from "@/theme";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

type Props = {
  trip: Trip; // group size and nights, for each person's share of a hotel
  flights: Flight[];
  places: Place[];
  picks: string[];
  // Getting there and the hotel are one-of: switching replaces the current pick.
  onSwitch: (id: string, among: string[]) => void;
  // Food and things to do: add or remove.
  onToggle: (id: string) => void;
};

type Row = { id: string; title: string; detail: string; price: string; picked: boolean };

// The agent picked one option per category; this shows what else it found, so the group can
// change its mind. Collapsed until asked for, so the plan reads first.
export function Alternatives({ trip, flights, places, picks, onSwitch, onToggle }: Props) {
  const stay = { people: groupSize(trip), nights: nightsBetween(trip.dates.start, trip.dates.end) };
  const [open, setOpen] = useState(false);
  const hotels = places.filter((p) => p.category === "hotel");
  const extras = places.filter((p) => p.category !== "hotel");

  const travelRows: Row[] = flights.map((f) => ({
    id: f.id,
    title: f.airline,
    detail: travelDetail(f),
    price: travelPrice(f),
    picked: picks.includes(f.id),
  }));
  const hotelRows: Row[] = hotels.map((h) => ({
    id: h.id,
    title: h.name,
    detail: [h.rating ? `${h.rating}★` : null, h.address].filter(Boolean).join(" · "),
    // Each person's total for the stay, not the room's nightly rate.
    price: `$${hotelCost(h, stay).perPerson} each`,
    picked: picks.includes(h.id),
  }));
  const extraRows: Row[] = extras.map((p) => ({
    id: p.id,
    title: p.name,
    detail: [p.category === "food" ? "Food" : "Things to do", p.rating ? `${p.rating}★` : null]
      .filter(Boolean)
      .join(" · "),
    price: p.price,
    picked: picks.includes(p.id),
  }));

  const others = [...travelRows, ...hotelRows, ...extraRows].filter((r) => !r.picked).length;
  if (others === 0) return null;

  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="min-h-12 flex-row items-center justify-between rounded-card border border-line bg-surface px-4 active:bg-raised"
      >
        <Text className="font-body-semibold text-body text-ink">
          {open ? "Hide other options" : `See other options (${others})`}
        </Text>
        {open ? (
          <CaretUp size={18} color={colors.muted} />
        ) : (
          <CaretDown size={18} color={colors.muted} />
        )}
      </Pressable>

      {open ? (
        <View className="gap-6">
          <Group
            title="Getting there"
            rows={travelRows}
            action={(r) => (r.picked ? null : "Switch")}
            onPress={(r) =>
              onSwitch(
                r.id,
                flights.map((f) => f.id),
              )
            }
          />
          <Group
            title="Where to stay"
            rows={hotelRows}
            action={(r) => (r.picked ? null : "Switch")}
            onPress={(r) =>
              onSwitch(
                r.id,
                hotels.map((h) => h.id),
              )
            }
          />
          <Group
            title="Food and things to do"
            rows={extraRows}
            action={(r) => (r.picked ? "Remove" : "Add")}
            onPress={(r) => onToggle(r.id)}
          />
        </View>
      ) : null}
    </View>
  );
}

function Group({
  title,
  rows,
  action,
  onPress,
}: {
  title: string;
  rows: Row[];
  action: (r: Row) => string | null;
  onPress: (r: Row) => void;
}) {
  if (rows.length < 2 && rows.every((r) => r.picked)) return null;
  return (
    <View>
      <Heading accessibilityRole="header" className="pb-1 font-display-medium">
        {title}
      </Heading>
      {rows.map((r, i) => {
        const label = action(r);
        return (
          <View
            key={r.id}
            className={cn("flex-row items-center gap-3 py-3", i > 0 && "border-t border-line")}
          >
            <View className="flex-1 gap-0.5">
              <Text numberOfLines={1} className="font-body-semibold text-body text-ink">
                {r.title}
                {r.picked ? (
                  <Text className="font-body text-caption text-accent"> · in the plan</Text>
                ) : null}
              </Text>
              <Muted numberOfLines={1}>{r.detail}</Muted>
            </View>
            <Text className="font-body-bold text-small text-ink" style={TABULAR}>
              {r.price}
            </Text>
            {label ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label} ${r.title}`}
                onPress={() => onPress(r)}
                className={cn(
                  "min-h-10 min-w-20 items-center justify-center rounded-full px-3 active:opacity-80",
                  label === "Remove" ? "border border-line" : "bg-accent",
                )}
              >
                <Text
                  className={cn(
                    "font-body-semibold text-small",
                    label === "Remove" ? "text-ink" : "text-bg",
                  )}
                >
                  {label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
