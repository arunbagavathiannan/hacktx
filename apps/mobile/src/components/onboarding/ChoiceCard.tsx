import type { Icon } from "phosphor-react-native";
import { Text, View } from "react-native";
import { Card, Heading, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import { colors, icon as iconStyle } from "@/theme";

type Props = {
  label: string; // the stored value; shown as the leading glyph when there's no icon (e.g. "$$")
  title?: string; // heading text; defaults to label
  description?: string;
  icon?: Icon;
  selected: boolean;
  onPress: () => void;
};

// Single-select answer: a full-width card with a radio dot on the right.
export function ChoiceCard({ label, title, description, icon: IconCmp, selected, onPress }: Props) {
  return (
    <Card selected={selected} onPress={onPress}>
      <View
        className="flex-row items-center gap-4"
        accessibilityLabel={title ?? label}
        accessibilityState={{ selected }}
      >
        <View className="w-11 items-center">
          {IconCmp ? (
            <IconCmp
              size={26}
              color={selected ? colors.accent : colors.muted}
              weight={selected ? iconStyle.activeWeight : iconStyle.weight}
            />
          ) : (
            <Text
              className={cn("font-display text-xl", selected ? "text-accent" : "text-muted")}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
        </View>
        <View className="flex-1 gap-0.5">
          <Heading className="text-lg leading-6">{title ?? label}</Heading>
          {description ? <Muted>{description}</Muted> : null}
        </View>
        <View
          className={cn(
            "h-6 w-6 items-center justify-center rounded-full border-2",
            selected ? "border-accent" : "border-line",
          )}
        >
          {selected ? <View className="h-2.5 w-2.5 rounded-full bg-accent" /> : null}
        </View>
      </View>
    </Card>
  );
}
