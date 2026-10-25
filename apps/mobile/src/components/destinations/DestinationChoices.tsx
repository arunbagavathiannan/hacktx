import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { AvatarStack, Perforation } from "@/components/ui";
import type { DestinationSuggestion } from "@/mocks/destinations";
import type { Member } from "@/mocks/types";
import { colors } from "@/theme";

export type Choice = {
  destination: DestinationSuggestion;
  perPerson: number; // est. per person for its default plan (store/plan defaultEstimateFor)
  roundTrip: number | null; // the default flight's round-trip fare
  voters: Member[];
  leader: boolean; // most friends' votes
};

const tabular = { fontVariant: ["tabular-nums" as const] };

function names(voters: Member[]) {
  const n = voters.map((m) => m.name);
  if (n.length <= 1) return n[0] ?? "";
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
}

function votesLine(c: Choice) {
  if (c.voters.length === 0) return "No votes yet";
  return `${names(c.voters)} voted`;
}

function spoken(c: Choice) {
  const d = c.destination;
  return [
    `${d.city}, ${d.region}`,
    d.why,
    `about $${c.perPerson} per person`,
    `${d.flightTime} flight`,
    `${c.voters.length} ${c.voters.length === 1 ? "vote" : "votes"}`,
    c.leader ? "most votes" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

// The focused idea as the screen's one ticket: a sunset head with the city, a perforation,
// then the stub with what it costs, how far it is, and who's in.
export function DestinationTicket({
  choice,
  index,
  total,
  animate,
}: {
  choice: Choice;
  index: number;
  total: number;
  animate: boolean;
}) {
  const d = choice.destination;
  // NativeWind classNames don't reach Reanimated views on web, so animated wrappers only
  // animate; plain Views inside carry the layout classes.
  return (
    <Animated.View layout={animate ? LinearTransition.duration(260) : undefined}>
      <View
        accessible
        accessibilityRole="radio"
        accessibilityState={{ checked: true }}
        accessibilityLabel={`${spoken(choice)}. Selected`}
        className="overflow-hidden rounded-card bg-surface"
      >
        <View style={{ height: 108 }}>
          <LinearGradient
            colors={[colors.gold, colors.accent, colors["accent-soft"]]}
            locations={[0, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View key={d.id} entering={animate ? FadeIn.duration(220) : undefined}>
            <View className="gap-0.5 px-5 pt-4">
              <Text className="font-body-medium text-xs text-bg/75">
                Idea {index + 1} of {total} · {d.match}% match
              </Text>
              <Text className="font-display text-[40px] leading-[44px] text-bg" numberOfLines={1}>
                {d.city}
              </Text>
              <Text className="font-body-semibold text-sm text-bg/80">{d.region}</Text>
            </View>
          </Animated.View>
        </View>

        <Perforation notchColor={colors.bg} />

        <Animated.View key={`${d.id}-stub`} entering={animate ? FadeIn.duration(220) : undefined}>
          <Stub choice={choice} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function Stub({ choice }: { choice: Choice }) {
  const d = choice.destination;
  return (
    <View className="gap-3 px-5 pb-4 pt-1">
      <Text className="font-display-medium text-lg leading-6 text-ink">{d.why}</Text>
      <View className="flex-row">
        <Fact label="Per person" value={`~$${choice.perPerson}`} />
        <Fact label="Flight" value={d.flightTime} />
        <Fact label="Round trip" value={choice.roundTrip !== null ? `$${choice.roundTrip}` : "—"} />
      </View>
      <View className="flex-row items-center gap-3 border-t border-line pt-3">
        {choice.voters.length > 0 ? (
          <AvatarStack members={choice.voters} size="sm" max={4} />
        ) : null}
        <Text className="flex-1 font-body text-sm text-muted">{votesLine(choice)}</Text>
        {choice.leader ? (
          <Text className="font-body-semibold text-sm text-accent">Most votes</Text>
        ) : null}
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="font-body-semibold text-sm text-muted">{label}</Text>
      <Text className="font-display-medium text-lg leading-6 text-ink" style={tabular}>
        {value}
      </Text>
    </View>
  );
}

// Another idea, as a plain row under the ticket. Tapping it focuses it on the globe and makes
// it the ticket.
export function DestinationRow({
  choice,
  onPress,
  animate,
}: {
  choice: Choice;
  onPress: () => void;
  animate: boolean;
}) {
  const d = choice.destination;
  return (
    <Animated.View layout={animate ? LinearTransition.duration(260) : undefined}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: false }}
        accessibilityLabel={spoken(choice)}
        accessibilityHint="Shows it on the globe"
        onPress={onPress}
        className="min-h-[72px] flex-row items-center gap-3 border-b border-line py-3 active:opacity-80"
      >
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-baseline gap-2">
            <Text className="font-body-semibold text-base text-ink">{d.city}</Text>
            {choice.leader ? (
              <Text className="font-body-semibold text-sm text-accent">Most votes</Text>
            ) : null}
          </View>
          <Text numberOfLines={1} className="font-body text-sm text-muted">
            {d.why} · {d.flightTime} flight
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="font-body-bold text-base text-ink" style={tabular}>
            ~${choice.perPerson}
          </Text>
          {choice.voters.length > 0 ? (
            <AvatarStack members={choice.voters} size="sm" max={3} />
          ) : (
            <Text className="font-body-medium text-xs text-faint">No votes yet</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
