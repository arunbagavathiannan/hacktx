import { CheckCircle } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";
import { Badge, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { DestinationSuggestion } from "@/mocks/destinations";
import { colors, icon } from "@/theme";

type Props = {
  suggestions: DestinationSuggestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

// "Where to?": the agent's destination ideas, each with the chat quote behind it.
// The group picks one before the map opens. MOCK: only cities with demo data can be picked.
export function DestinationPicker({ suggestions, selectedId, onSelect }: Props) {
  return (
    <View className="gap-3">
      {suggestions.map((d) => {
        const selected = d.id === selectedId;
        return (
          <Pressable
            key={d.id}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: !d.hasDemoData }}
            accessibilityLabel={`${d.city}, ${d.match}% match`}
            disabled={!d.hasDemoData}
            onPress={() => onSelect(d.id)}
            className={cn(
              "flex-row items-center gap-3 rounded-3xl border p-4 active:opacity-80",
              selected ? "border-accent bg-accent-soft" : "border-line bg-surface",
              !d.hasDemoData && "opacity-50",
            )}
          >
            {selected ? (
              <CheckCircle size={24} color={colors.accent} weight={icon.activeWeight} />
            ) : (
              <View className="m-0.5 h-5 w-5 rounded-full border-2 border-faint" />
            )}
            <View className="flex-1 gap-1">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 font-display text-lg text-ink">
                  {d.city}, {d.region}
                </Text>
                <Text
                  className={cn(
                    "shrink-0 pt-1 font-body-bold text-sm",
                    selected ? "text-accent" : "text-muted",
                  )}
                >
                  {d.match}% match
                </Text>
              </View>
              <Muted numberOfLines={2}>{d.why}</Muted>
              {!d.hasDemoData ? <Badge label="Demo data is Denver only" /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
