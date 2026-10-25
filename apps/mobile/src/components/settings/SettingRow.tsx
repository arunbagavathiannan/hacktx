import type { Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Body, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import { colors, icon } from "@/theme";

type Props = {
  icon: Icon;
  title: string;
  detail?: string;
  right?: ReactNode;
  first?: boolean; // no top divider
  dim?: boolean; // e.g. an unanswered preference
};

// One line inside a settings card: icon, title, optional detail, optional trailing element.
export function SettingRow({ icon: RowIcon, title, detail, right, first = false, dim }: Props) {
  return (
    <View
      accessible={!right}
      accessibilityLabel={detail ? `${title}: ${detail}` : title}
      className={cn("min-h-12 flex-row items-center gap-3 py-3", !first && "border-t border-line")}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-raised">
        <RowIcon size={18} color={colors.accent} weight={icon.weight} />
      </View>
      <View className="flex-1">
        <Muted className="text-xs leading-4">{title}</Muted>
        {detail ? (
          <Body className={cn("font-body-semibold", dim && "text-faint")}>{detail}</Body>
        ) : null}
      </View>
      {right}
    </View>
  );
}
