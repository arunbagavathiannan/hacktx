import { ArrowCounterClockwise } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Body, Button, Card, Muted } from "@/components/ui";
import { colors, icon } from "@/theme";

type Props = {
  onConfirm: () => void;
  initiallyOpen?: boolean; // screenshot state
};

// "Reset demo" with an inline confirm (no browser/system dialog, which looks off on stage).
export function ResetDemo({ onConfirm, initiallyOpen = false }: Props) {
  const [confirming, setConfirming] = useState(initiallyOpen);

  if (!confirming) {
    return (
      <Button
        label="Reset demo"
        variant="secondary"
        icon={<ArrowCounterClockwise size={20} color={colors.ink} weight={icon.weight} />}
        onPress={() => setConfirming(true)}
      />
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Card className="gap-4 border-accent">
        <View className="gap-1" accessibilityLiveRegion="polite">
          <Body className="font-body-semibold">Start the demo over?</Body>
          <Muted>This clears your preferences and the Denver plan, then opens onboarding.</Muted>
        </View>
        <View className="flex-row gap-3">
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => setConfirming(false)}
            className="flex-1"
          />
          <Button label="Reset" onPress={onConfirm} className="flex-1" />
        </View>
      </Card>
    </Animated.View>
  );
}
