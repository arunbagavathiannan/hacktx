import { type Href, router } from "expo-router";
import { ArrowRight } from "phosphor-react-native";
import { Body, Button, Label, Screen, Title } from "@/components/ui";
import { colors } from "@/theme";

type Props = {
  step: string;
  title: string;
  description: string;
  next?: { href: Href; label: string };
};

// Temporary stand-in for a screen that hasn't been built yet. Keeps the whole flow
// clickable end to end. Delete it once every route has its real screen.
export function Placeholder({ step, title, description, next }: Props) {
  return (
    <Screen
      footer={
        next ? (
          <Button
            label={next.label}
            icon={<ArrowRight size={20} color={colors.bg} />}
            onPress={() => router.push(next.href)}
          />
        ) : undefined
      }
    >
      <Label className="pt-6">{step}</Label>
      <Title>{title}</Title>
      <Body className="text-muted">{description}</Body>
    </Screen>
  );
}
