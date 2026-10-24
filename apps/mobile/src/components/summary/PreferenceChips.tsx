import { router } from "expo-router";
import { CheckCircle, SlidersHorizontal } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";
import { Skeleton } from "@/components/ui";
import type { Preferences } from "@/mocks/types";
import { colors, icon } from "@/theme";

type Props = {
  prefs: Preferences;
  loading: boolean;
  // Questions Huddle skipped because a preference already answered them.
  skipped: { question: string; because: string }[];
};

function labels(prefs: Preferences): string[] {
  return [
    ...prefs.vibes,
    ...(prefs.budget ? [`${prefs.budget} budget`] : []),
    ...prefs.food,
    ...(prefs.maxTravel ? [`Max ${prefs.maxTravel}`] : []),
  ];
}

// Read-only chips showing which onboarding answers Huddle is planning around.
export function PreferenceChips({ prefs, loading, skipped }: Props) {
  if (loading) {
    return (
      <View className="flex-row flex-wrap gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </View>
    );
  }

  const items = labels(prefs);
  if (items.length === 0) {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push("/onboarding")}
        className="flex-row items-center gap-3 rounded-card border border-dashed border-line px-4 py-3.5 active:opacity-80"
      >
        <SlidersHorizontal size={20} color={colors.muted} weight={icon.weight} />
        <Text className="flex-1 font-body text-sm leading-5 text-muted">
          No preferences saved yet.{" "}
          <Text className="font-body-semibold text-accent">Add yours</Text> and Huddle asks fewer
          questions next time.
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {items.map((label) => (
          <View key={label} className="rounded-full border border-line bg-surface px-3.5 py-2">
            <Text className="font-body-semibold text-sm text-ink">{label}</Text>
          </View>
        ))}
      </View>
      {skipped.map((s) => (
        <View key={s.question} className="flex-row items-start gap-2">
          <CheckCircle size={18} color={colors.good} weight={icon.activeWeight} />
          <Text className="flex-1 font-body text-sm leading-5 text-muted">
            <Text className="font-body-semibold text-ink">Skipped “{s.question}” </Text>
            {s.because}
          </Text>
        </View>
      ))}
    </View>
  );
}
