import { CheckCircle, Info } from "phosphor-react-native";
import { View } from "react-native";
import { Badge, Card, Chip, Heading, Muted } from "@/components/ui";
import type { Clarification } from "@/mocks/types";
import { colors, icon } from "@/theme";

type Props = {
  clarification: Clarification;
  answer?: string;
  fromPreferences: boolean; // the current answer came from onboarding
  onAnswer: (option: string) => void;
};

// One quick question: tap a chip to answer. The reason says why the agent is asking.
export function ClarificationCard({ clarification, answer, fromPreferences, onAnswer }: Props) {
  return (
    <Card>
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Heading className="flex-1 text-lg leading-6">{clarification.question}</Heading>
          {answer ? <CheckCircle size={22} color={colors.good} weight={icon.activeWeight} /> : null}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {clarification.options.map((o) => (
            <Chip key={o} label={o} selected={answer === o} onPress={() => onAnswer(o)} />
          ))}
        </View>
        <View className="flex-row gap-2">
          <Info size={16} color={colors.faint} weight={icon.weight} style={{ marginTop: 2 }} />
          <Muted className="flex-1">{clarification.reason}</Muted>
        </View>
        {fromPreferences ? <Badge label="Picked from your onboarding" tone="good" /> : null}
      </View>
    </Card>
  );
}
