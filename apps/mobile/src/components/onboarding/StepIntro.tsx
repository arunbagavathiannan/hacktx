import type { Icon } from "phosphor-react-native";
import { View } from "react-native";
import { Label, Muted, Title } from "@/components/ui";
import { colors, icon } from "@/theme";

type Props = { eyebrow: string; title: string; subtitle: string; Glyph: Icon };

// Top of each step: icon tile, eyebrow, question, and why Huddle is asking.
export function StepIntro({ eyebrow, title, subtitle, Glyph }: Props) {
  return (
    <View className="gap-3">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
        <Glyph size={26} color={colors.accent} weight={icon.weight} />
      </View>
      <Label className="pt-1 text-accent">{eyebrow}</Label>
      <Title>{title}</Title>
      <Muted className="text-[15px] leading-[22px]">{subtitle}</Muted>
    </View>
  );
}
