import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
};

// Tap-to-answer chips (onboarding, quick clarifications, filters).
export function Chip({ label, selected = false, onPress, icon }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2.5 active:opacity-80 ${
        selected ? "border-accent bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      {icon}
      <Text className={`font-body-semibold text-sm ${selected ? "text-accent" : "text-ink"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
