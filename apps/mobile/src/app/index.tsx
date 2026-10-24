import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ChatsCircle, GearSix, Sparkle } from "phosphor-react-native";
import { View } from "react-native";
import { IconButton } from "@/components/home/IconButton";
import { PastPlans } from "@/components/home/PastPlans";
import { PlanCard } from "@/components/home/PlanCard";
import { Button, Label, Muted, Screen, Title } from "@/components/ui";
import { usePreferences, usePreferencesHydrated } from "@/store/preferences";
import { colors, icon } from "@/theme";

// Home: the plans Huddle spotted in your chats. In the demo, the plan starts from the
// popup (/plan/incoming).
export default function Home() {
  // MOCK: `?demo=home` skips the first-run redirect so a fresh browser (PR screenshots)
  // lands here instead of onboarding.
  const isDemo = useLocalSearchParams<{ demo?: string }>().demo === "home";
  const hydrated = usePreferencesHydrated();
  const onboarded = usePreferences((s) => s.onboarded);
  if (!isDemo && !hydrated) return <View className="flex-1 bg-bg" />;
  if (!isDemo && !onboarded) return <Redirect href="/onboarding" />;

  return (
    <Screen scroll className="gap-6">
      <View className="flex-row items-center justify-between pt-3">
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Huddle"
          className="flex-row items-center gap-2"
        >
          <ChatsCircle size={30} color={colors.accent} weight={icon.activeWeight} />
          <Title>Huddle</Title>
        </View>
        <IconButton icon={GearSix} label="Settings" onPress={() => router.push("/settings")} />
      </View>

      <View className="gap-3">
        <View className="gap-1">
          <Label>Spotted in your chats</Label>
          <Muted>Huddle picked this up from your group chat and planned it.</Muted>
        </View>
        <PlanCard onPress={() => router.push("/plan/summary")} />
      </View>

      <View className="gap-3">
        <Label>Past plans</Label>
        <PastPlans />
      </View>

      <View className="gap-3 rounded-card border border-dashed border-line p-4">
        <View className="gap-1">
          <Label className="text-accent">Demo</Label>
          <Muted>
            Plays a group chat turning into a plan, with the popup you'd get on your phone.
          </Muted>
        </View>
        <Button
          label="Simulate a plan"
          icon={<Sparkle size={20} color={colors.bg} weight={icon.activeWeight} />}
          onPress={() => router.push("/plan/incoming")}
        />
      </View>
    </Screen>
  );
}
