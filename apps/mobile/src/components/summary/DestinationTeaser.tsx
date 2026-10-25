import { Text, View } from "react-native";
import type { DestinationSuggestion } from "@/mocks/destinations";

type Props = {
  ideas: { destination: DestinationSuggestion; perPerson: number }[];
  budgetPerPerson: number;
};

// "3 destination ideas ready": a preview of the next screen, where the group picks. Plain
// rows (city, the chat signal behind it, est. $/person); the footer button opens the globe.
export function DestinationTeaser({ ideas, budgetPerPerson }: Props) {
  const allFit = ideas.every((i) => i.perPerson <= budgetPerPerson);
  return (
    <View
      accessible
      accessibilityLabel={`${ideas.length} destination ideas ready: ${ideas
        .map((i) => `${i.destination.city}, about $${i.perPerson} each`)
        .join("; ")}`}
      className="gap-1"
    >
      <Text className="font-display text-title text-ink">
        {ideas.length} destination ideas ready
      </Text>
      <Text className="font-body text-small leading-5 text-muted">
        {allFit
          ? `All fit $${budgetPerPerson} each. The group picks one next.`
          : "The group picks one next."}
      </Text>
      <View className="mt-2 border-t border-line">
        {ideas.map(({ destination: d, perPerson }) => (
          <View key={d.id} className="flex-row items-center gap-3 border-b border-line py-3">
            <View className="flex-1 gap-0.5">
              <Text className="font-body-semibold text-body text-ink">{d.city}</Text>
              <Text numberOfLines={1} className="font-body text-small text-muted">
                {d.why}
              </Text>
            </View>
            <Text
              className="font-body-bold text-body text-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              ~${perPerson}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
