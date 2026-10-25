import * as Haptics from "expo-haptics";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";
import { colors } from "@/theme";
import { cn } from "./cn";

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

// Primary label is 700 (the one bold control on a screen); the rest are 600.
const styles: Record<Variant, { box: string; text: string }> = {
  primary: { box: "bg-accent", text: "font-body-bold text-bg" },
  secondary: { box: "bg-raised border border-line", text: "font-body-semibold text-ink" },
  ghost: { box: "bg-transparent", text: "font-body-semibold text-muted" },
};

// Disabled reads as "not yet", not "broken": a neutral fill and a readable label instead of
// a half-transparent accent. muted on raised is 6.1:1; faint on bg (ghost) is 5.6:1.
const disabledStyles: Record<Variant, { box: string; text: string }> = {
  primary: { box: "bg-raised", text: "font-body-semibold text-muted" },
  secondary: { box: "bg-raised border border-line", text: "font-body-semibold text-muted" },
  ghost: { box: "bg-transparent", text: "font-body-semibold text-faint" },
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
  const inactive = disabled || loading;
  // Loading keeps the variant's look (the tap was accepted); only disabled goes neutral.
  const s = disabled ? disabledStyles[variant] : styles[variant];
  // Callers color icons for the enabled fill (e.g. bg on accent), which would vanish on the
  // gray disabled fill, so a disabled button recolors its (Phosphor) icon to match the label.
  const shownIcon =
    disabled && isValidElement<{ color?: string }>(icon)
      ? cloneElement(icon, { color: variant === "ghost" ? colors.faint : colors.muted })
      : icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      className={cn(
        "h-14 flex-row items-center justify-center gap-2 rounded-full px-6 active:opacity-80",
        s.box,
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.bg : colors.ink} />
      ) : (
        <>
          {shownIcon}
          <Text className={`text-body ${s.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
