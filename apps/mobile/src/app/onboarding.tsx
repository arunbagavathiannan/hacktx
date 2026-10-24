import { router } from "expo-router";
import { ArrowRight } from "phosphor-react-native";
import { Body, Button, Label, Screen, Title } from "@/components/ui";
import { usePreferences } from "@/store/preferences";
import { colors } from "@/theme";

// TODO(onboarding + summary builder): pick vibes, budget style, food, travel limits -> usePreferences.
export default function Onboarding() {
  const finishOnboarding = usePreferences((s) => s.finishOnboarding);

  return (
    <Screen
      footer={
        <Button
          label="Finish"
          icon={<ArrowRight size={20} color={colors.bg} />}
          onPress={() => {
            finishOnboarding();
            router.replace("/");
          }}
        />
      }
    >
      <Label className="pt-6">Step 0 · Onboarding</Label>
      <Title>What are you into?</Title>
      <Body className="text-muted">
        Vibe, budget style, food, and how far you'll travel. Huddle uses this so it asks fewer
        questions later.
      </Body>
    </Screen>
  );
}
