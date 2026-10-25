import { CaretRight, Sparkle, UsersThree } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { AvatarStack, Badge, Heading, Muted } from "@/components/ui";
import { tripPerPerson } from "@/lib/pricing";
import { brief } from "@/mocks";
import { destinationById, destinationSuggestions } from "@/mocks/destinations";
import { usePlan } from "@/store/plan";
import { colors, icon } from "@/theme";

const appName = { whatsapp: "WhatsApp", instagram: "Instagram" } as const;

// The trip Huddle spotted in the group chat. Tapping it opens the trip summary.
// Neutral copy: it never claims the plan is done before the demo runs the agent, and it never
// names a city (or a city's price) before the group picks one.
export function PlanCard({ onPress }: { onPress: () => void }) {
  const picks = usePlan((s) => s.picks);
  const destinationId = usePlan((s) => s.destinationId);
  const picked = destinationId ? destinationById(destinationId) : null;
  const trip = picked?.trip ?? brief;
  const people = Math.max(1, brief.members.length);
  const perPerson = picked ? tripPerPerson(picks, picked) : 0;
  const status = [
    `Spotted in ${trip.sourceChat.name}`,
    `${people} ${people === 1 ? "person" : "people"}`,
    picked
      ? perPerson > 0
        ? `~$${perPerson} each`
        : null
      : `${destinationSuggestions.length} ideas`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.title}, ${trip.dates.label}. ${status}. Review plan`}
      onPress={onPress}
      className="rounded-card border border-line bg-surface active:opacity-80"
    >
      <View className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Badge label={`From ${appName[trip.sourceChat.app]}`} tone="accent" />
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
        <UsersThree size={18} color={colors.muted} weight={icon.weight} />
        <Muted className="flex-1 font-body-semibold text-ink">{status}</Muted>
      </View>
    </Pressable>
  );
}
