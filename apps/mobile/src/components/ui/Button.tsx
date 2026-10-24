import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/theme";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

const styles: Record<Variant, { box: string; text: string }> = {
  primary: { box: "bg-accent", text: "text-bg" },
  secondary: { box: "bg-raised border border-line", text: "text-ink" },
  ghost: { box: "bg-transparent", text: "text-muted" },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  className,
}: Props) {
  const s = styles[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      className={cn(
        "h-14 flex-row items-center justify-center gap-2 rounded-full px-6 active:opacity-80",
        s.box,
        inactive && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.bg : colors.ink} />
      ) : (
        <>
          {icon}
          <Text className={`font-body-bold text-base ${s.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
