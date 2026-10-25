import { Text, View } from "react-native";

type Tone = "accent" | "good" | "neutral";

// "plain": metadata as colored text, no container (the default; most badges are this).
// "accent": a tinted, softly rounded box for a status that truly needs emphasis (e.g. over
// budget). Not a stadium: pills are reserved for things you can tap.
type Variant = "plain" | "accent";

const text: Record<Tone, string> = {
  accent: "text-accent",
  good: "text-good",
  neutral: "text-muted",
};

const box: Record<Tone, string> = {
  accent: "bg-accent-soft",
  good: "bg-good/15",
  neutral: "bg-raised",
};

export function Badge({
  label,
  tone = "neutral",
  variant = "plain",
}: {
  label: string;
  tone?: Tone;
  variant?: Variant;
}) {
  const content = <Text className={`font-body-semibold text-caption ${text[tone]}`}>{label}</Text>;
  if (variant === "plain") return <View className="self-start">{content}</View>;
  return <View className={`self-start rounded-md px-2 py-0.5 ${box[tone]}`}>{content}</View>;
}
