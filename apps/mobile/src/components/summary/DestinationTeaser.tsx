import { CaretRight, GlobeHemisphereWest } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";
import { colors, icon } from "@/theme";

type Props = { count: number; line: string; onPress: () => void };

// Teaser for the next screen: destination ideas are ready on the globe.
export function DestinationTeaser({ count, line, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${count} destination ideas ready`}
      onPress={onPress}
      className="flex-row items-center gap-3.5 rounded-card border border-accent/40 bg-accent-soft p-4 active:opacity-80"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
        <GlobeHemisphereWest size={24} color={colors.bg} weight={icon.activeWeight} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-display text-lg leading-6 text-ink">
          {count} destination ideas ready
        </Text>
        <Text className="font-body text-sm leading-5 text-muted">{line}</Text>
      </View>
      <CaretRight size={18} color={colors.accent} weight={icon.weight} />
    </Pressable>
  );
}
