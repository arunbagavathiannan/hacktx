import { CaretRight, CheckCircle, Sparkle } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { AvatarStack, Badge, Heading, Muted } from "@/components/ui";
import { estimatePerPerson, groupSize, nightsBetween } from "@/lib/pricing";
import { flights, places, trip } from "@/mocks";
import { usePlan } from "@/store/plan";
import { colors, icon } from "@/theme";

const appName = { whatsapp: "WhatsApp", instagram: "Instagram" } as const;

// The plan Huddle spotted in the group chat. Tapping it reopens the trip summary.
export function PlanCard({ onPress }: { onPress: () => void }) {
  const picks = usePlan((s) => s.picks);
  const people = groupSize(trip);
  const perPerson = estimatePerPerson(picks, {
    places,
    flights,
    people,
    nights: nightsBetween(trip.dates.start, trip.dates.end),
  });
  const status = [
    picks.length > 0 ? "Plan ready" : "Nothing picked yet",
    `${people} ${people === 1 ? "person" : "people"}`,
    perPerson > 0 ? `~$${perPerson} each` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.title}, ${trip.dates.label}. ${status}. Open plan`}
      onPress={onPress}
      className="rounded-card border border-line bg-surface active:opacity-80"
    >
      <View className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Badge
            label={`${trip.sourceChat.name} · ${appName[trip.sourceChat.app]}`}
            tone="accent"
          />
          <CaretRight size={18} color={colors.muted} weight={icon.weight} />
        </View>
        <View className="flex-row items-end gap-3">
          <View className="flex-1 gap-1">
            <Heading className="text-2xl leading-8">{trip.title}</Heading>
            <Muted>{trip.dates.label}</Muted>
          </View>
          <AvatarStack members={trip.members} size="sm" max={5} />
        </View>
        <View className="flex-row items-center gap-2">
          <Sparkle size={16} color={colors.gold} weight={icon.activeWeight} />
          <Muted className="flex-1 text-ink">{trip.why}</Muted>
        </View>
      </View>
      <View className="flex-row items-center gap-3 border-t border-line px-4 py-3">
        <CheckCircle
          size={18}
          color={picks.length > 0 ? colors.good : colors.faint}
          weight={icon.activeWeight}
        />
        <Muted className="flex-1 font-body-semibold text-ink">{status}</Muted>
      </View>
    </Pressable>
  );
}
