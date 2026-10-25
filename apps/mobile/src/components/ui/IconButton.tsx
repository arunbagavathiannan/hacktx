import type { Icon } from "phosphor-react-native";
import { Pressable } from "react-native";
import { colors, icon } from "@/theme";

type Props = {
  icon: Icon;
  label: string; // read aloud by TalkBack; there's no visible text
  onPress: () => void;
};

// Round 48dp icon-only button for screen headers (settings, back).
export function IconButton({ icon: IconCmp, label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-full border border-line bg-surface active:opacity-80"
    >
      <IconCmp size={icon.size} color={colors.ink} weight={icon.weight} />
    </Pressable>
  );
}
