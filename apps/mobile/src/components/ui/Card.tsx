import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  className?: string;
};

export function Card({ children, onPress, selected = false, className }: Props) {
  const box = cn(
    "rounded-card border p-4",
    selected ? "border-accent bg-accent-soft" : "border-line bg-surface",
    className,
  );

  if (!onPress) return <View className={box}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(box, "active:opacity-80")}
    >
      {children}
    </Pressable>
  );
}
