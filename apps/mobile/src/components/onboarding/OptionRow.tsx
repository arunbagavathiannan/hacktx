import { Check, type Icon } from "phosphor-react-native";
import { Text, View } from "react-native";
import { Card } from "@/components/ui";
import { colors, icon } from "@/theme";

type Props = {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  Glyph?: Icon; // icon on the left...
  mark?: string; // ...or a short text mark, e.g. "$$"
  shape?: "radio" | "check"; // single select vs. toggle
};

// A tappable option with a one-line meaning (budget style, travel range, toggles).
export function OptionRow({ label, hint, selected, onPress, Glyph, mark, shape = "radio" }: Props) {
  return (
    <Card selected={selected} onPress={onPress} className="py-3.5">
      <View className="flex-row items-center gap-3.5">
        <View
          className={`h-11 w-11 items-center justify-center rounded-xl ${
            selected ? "bg-accent/20" : "bg-raised"
          }`}
        >
          {mark ? (
            <Text className={`font-display text-lg ${selected ? "text-accent" : "text-gold"}`}>
              {mark}
            </Text>
          ) : Glyph ? (
            <Glyph
              size={icon.size}
              color={selected ? colors.accent : colors.muted}
              weight={selected ? icon.activeWeight : icon.weight}
            />
          ) : null}
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="font-body-bold text-base text-ink">{label}</Text>
          <Text className="font-body text-[13px] leading-[18px] text-muted">{hint}</Text>
        </View>

        <View
          className={`h-6 w-6 items-center justify-center border-2 ${
            shape === "radio" ? "rounded-full" : "rounded-md"
          } ${selected ? "border-accent bg-accent" : "border-line"}`}
        >
          {selected ? <Check size={14} color={colors.bg} weight="bold" /> : null}
        </View>
      </View>
    </Card>
  );
}
