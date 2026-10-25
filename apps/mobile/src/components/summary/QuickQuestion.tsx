import { View } from "react-native";
import { Chip, Heading, Muted } from "@/components/ui";
import type { Clarification } from "@/mocks/types";

type Props = {
  clarification: Clarification;
  answer?: string;
  fromPreferences: boolean; // the current answer was filled in from onboarding, not tapped
  hint?: string | null; // onboarding is relevant but didn't answer it
  onAnswer: (option: string) => void;
};

// One quick question in the ticket's stub: tap a chip to answer. The reason says why the
// agent is asking. No surface of its own; the ticket around it is the container.
export function QuickQuestion({ clarification, answer, fromPreferences, hint, onAnswer }: Props) {
  return (
    <View className="gap-3">
      <Heading accessibilityRole="header" className="font-display-medium">
        {clarification.question}
      </Heading>
      <View className="flex-row flex-wrap items-center gap-2">
        {clarification.options.map((o) => (
          <Chip key={o} label={o} selected={answer === o} onPress={() => onAnswer(o)} />
        ))}
      </View>
      {fromPreferences ? <Muted>Picked from your onboarding. Tap to change it.</Muted> : null}
      <Muted>{clarification.reason}</Muted>
      {hint && !answer ? <Muted>{hint}</Muted> : null}
    </View>
  );
}
