import { Text, View } from "react-native";
import { Avatar, Heading, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Member, Trip } from "@/mocks/types";
import { colors } from "@/theme";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

// Each person's version of the group plan (live plans only): the same hotel, but the way they
// get there can differ when the group's pick doesn't fit their own budget.
export function PeopleSection({ trip }: { trip: Trip }) {
  const people = trip.individuals ?? [];
  if (people.length === 0) return null;
  const memberFor = (id: string, name: string): Member =>
    trip.members.find((m) => m.id === id) ?? { id, name, color: colors.muted };

  return (
    <View>
      <Heading accessibilityRole="header" className="pb-1 font-display-medium">
        Each person
      </Heading>
      {people.map((p, i) => {
        const travelPrice = p.travelUsd === undefined ? "fare on site" : `$${p.travelUsd}`;
        const budgetLine =
          p.budget === undefined
            ? null
            : p.overBy
              ? `$${p.overBy} over their $${p.budget}`
              : `under their $${p.budget}`;
        return (
          <View
            key={p.memberId}
            accessible
            accessibilityLabel={[
              `${p.name}: ${p.travel}, ${travelPrice}`,
              `hotel share $${p.hotelShare}`,
              `about $${p.total} total`,
              budgetLine,
              p.note,
            ]
              .filter(Boolean)
              .join(". ")}
            className={cn("flex-row items-start gap-3 py-3", i > 0 && "border-t border-line")}
          >
            <Avatar member={memberFor(p.memberId, p.name)} size="md" />
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text numberOfLines={1} className="flex-1 font-body-semibold text-body text-ink">
                  {p.name}
                </Text>
                <Text className="font-body-bold text-body text-ink" style={TABULAR}>
                  ~${p.total}
                </Text>
              </View>
              <Muted numberOfLines={1}>
                {p.travel} · {travelPrice} · hotel ${p.hotelShare}
              </Muted>
              {budgetLine ? (
                <Text
                  className={cn("font-body text-caption", p.overBy ? "text-bad" : "text-good")}
                  style={TABULAR}
                >
                  {budgetLine}
                </Text>
              ) : null}
              {p.note ? <Muted className="text-faint">{p.note}</Muted> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
