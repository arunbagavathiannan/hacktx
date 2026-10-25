import { View } from "react-native";
import { Body, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  first?: boolean; // no top divider
  dim?: boolean; // e.g. an unanswered preference
};

// One label/value line in a plain settings list: label in a fixed column on the left, value
// beside it (wraps if long), hairline above every row but the first. No icon, no card.
export function SettingRow({ label, value, first = false, dim = false }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className={cn(
        "min-h-12 flex-row items-baseline gap-4 py-3",
        !first && "border-t border-line",
      )}
    >
      <Muted className="w-28">{label}</Muted>
      <Body className={cn("flex-1", dim && "text-faint")}>{value}</Body>
    </View>
  );
}
