import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AvatarStack, Muted, Perforation } from "@/components/ui";
import { brief } from "@/mocks";
import { destinationById, destinationSuggestions } from "@/mocks/destinations";
import { planPerPerson, useDriving, usePlan } from "@/store/plan";
import { colors } from "@/theme";

const appName = { whatsapp: "WhatsApp", instagram: "Instagram" } as const;
const TABULAR = { fontVariant: ["tabular-nums" as const] };

// The trip Huddle spotted in the group chat, as a mini ticket: a sunset head with the trip's
// name, a perforation, and a stub with when / who / where it came from. Home's one ticket.
// Tapping it opens the trip summary.
// Neutral copy: it never claims the plan is done before the demo runs the agent, and it never
// names a city (or a city's price) before the group picks one.
export function PlanCard({ onPress }: { onPress: () => void }) {
  const picks = usePlan((s) => s.picks);
  const destinationId = usePlan((s) => s.destinationId);
  const picked = destinationId ? destinationById(destinationId) : null;
  const trip = picked?.trip ?? brief;
  const people = Math.max(1, brief.members.length);
  const driving = useDriving();
  const perPerson = picked ? planPerPerson(picked, picks, driving) : 0;
  const status = [
    `From ${trip.sourceChat.name} on ${appName[trip.sourceChat.app]}`,
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
      accessibilityLabel={`${trip.title}, ${trip.dates.label}. ${trip.why}. ${status}. Review plan`}
      onPress={onPress}
      className="overflow-hidden rounded-card bg-surface active:opacity-80"
    >
      <View className="gap-1 px-5 pb-4 pt-4">
        <LinearGradient
          colors={[colors.gold, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text numberOfLines={1} className="font-display text-display text-bg">
          {trip.title}
        </Text>
        <Text numberOfLines={1} className="font-body-semibold text-small text-bg">
          {trip.why}
        </Text>
      </View>

      <Perforation notchColor={colors.bg} />

      <View className="gap-1 px-5 pb-4 pt-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text
            numberOfLines={1}
            className="flex-1 font-body-semibold text-body text-ink"
            style={TABULAR}
          >
            {trip.dates.label}
          </Text>
          <AvatarStack members={trip.members} size="sm" max={5} />
        </View>
        <Muted numeric>{status}</Muted>
      </View>
    </Pressable>
  );
}
