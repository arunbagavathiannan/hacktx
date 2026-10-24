import { Text, View } from "react-native";

type Tone = "accent" | "good" | "neutral";

const tones: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  good: "bg-good/15 text-good",
  neutral: "bg-raised text-muted",
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const [bg, text] = tones[tone].split(" ");
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`font-body-bold text-xs ${text}`}>{label}</Text>
    </View>
  );
}
