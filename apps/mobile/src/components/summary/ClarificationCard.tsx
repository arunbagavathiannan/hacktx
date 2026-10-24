import { CheckCircle } from "phosphor-react-native";
import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Card, Chip, Heading, Muted } from "@/components/ui";
import type { Clarification } from "@/mocks/types";
import { colors, icon } from "@/theme";

type Props = {
  clarification: Clarification;
  answer?: string;
  onAnswer: (option: string) => void;
};

// One tap-to-answer question. No typing: pick a chip, tap again to change it.
export function ClarificationCard({ clarification, answer, onAnswer }: Props) {
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Heading className="flex-1 text-lg leading-6">{clarification.question}</Heading>
        {answer ? (
          <Animated.View entering={ZoomIn.duration(220)}>
            <CheckCircle size={22} color={colors.accent} weight={icon.activeWeight} />
          </Animated.View>
        ) : null}
      </View>
      <Muted>{answer ? `Got it: ${answer}.` : clarification.reason}</Muted>
      <View className="flex-row flex-wrap gap-2">
        {clarification.options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={answer === option}
            onPress={() => onAnswer(option)}
          />
        ))}
      </View>
    </Card>
  );
}
