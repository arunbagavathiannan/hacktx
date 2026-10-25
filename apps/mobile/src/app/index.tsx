import { Redirect, router, useLocalSearchParams } from "expo-router";
import { GearSix } from "phosphor-react-native";
import { View } from "react-native";
import { PastPlans } from "@/components/home/PastPlans";
import { PlanCard } from "@/components/home/PlanCard";
import { Button, Display, IconButton, Label, Muted, Screen } from "@/components/ui";
import { LIVE } from "@/lib/live";
import { useLive } from "@/store/live";
import { usePreferences } from "@/store/preferences";

// Home: the plans Huddle spotted in your chats. In the demo, the plan starts from the
// popup (/plan/incoming).
export default function Home() {
  // MOCK: `?demo=home` skips the first-run redirect so a fresh browser (PR screenshots)
  // lands here instead of onboarding.
  const isDemo = useLocalSearchParams<{ demo?: string }>().demo === "home";
  const onboarded = usePreferences((s) => s.onboarded);
  if (!isDemo && !onboarded) return <Redirect href="/onboarding" />;

  return (
    <Screen
      scroll
      className="gap-8"
      // "Simulate a plan" starts the live demo, so it stays the screen's one primary action,
      // in the sticky footer where every other screen keeps its CTA.
      footer={
        <View className="gap-2">
          <Muted>Plays a group chat turning into a plan, with the popup you'd get.</Muted>
          <Button
            label="Simulate a plan"
            onPress={() => {
              // Live mode: every run starts from an empty chat.
              if (LIVE) useLive.getState().reset();
              router.push({ pathname: "/plan/incoming", params: { run: String(Date.now()) } });
            }}
          />
        </View>
      }
    >
      <View className="flex-row items-center justify-between pt-3">
        <Display accessibilityRole="header">Huddle</Display>
        <IconButton icon={GearSix} label="Settings" onPress={() => router.push("/settings")} />
      </View>

      <PlanCard onPress={() => router.push("/plan/summary")} />

      <View className="gap-1">
        <Label accessibilityRole="header">Past plans</Label>
        <PastPlans />
      </View>
    </Screen>
  );
}
