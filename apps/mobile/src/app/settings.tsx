import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowCounterClockwise,
  CaretLeft,
  DeviceMobile,
  HandTap,
  ShieldCheck,
} from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { budgetOptions } from "@/components/onboarding/options";
import { ResetConfirm } from "@/components/settings/ResetDemo";
import { SettingRow } from "@/components/settings/SettingRow";
import { demoPrefs } from "@/components/summary/personalize";
import { Button, IconButton, Label, Muted, Screen, Title } from "@/components/ui";
import type { Preferences } from "@/mocks/types";
import { usePlan } from "@/store/plan";
import { usePreferences, usePreferencesHydrated } from "@/store/preferences";
import { colors, icon } from "@/theme";

const NOT_SET = "Not set";

function budgetLabel(budget: Preferences["budget"]) {
  const option = budgetOptions.find((o) => o.label === budget);
  return option ? `${option.label} · ${option.title}` : NOT_SET;
}

// From NEXT_STEPS.md "Already in the MVP".
const privacy = [
  { icon: ShieldCheck, text: "Only reads chats from apps you turn on." },
  {
    icon: DeviceMobile,
    text: "Filters on your phone. Only chats that look like plans reach the AI.",
  },
  { icon: HandTap, text: "Never books, pays, or messages anyone without your tap." },
];

export default function Settings() {
  // MOCK: `?demo=prefs` shows sample preferences and `?demo=reset` opens the reset confirm
  // (PR screenshots from a fresh browser). Display-only: nothing is written to the stores.
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const hydrated = usePreferencesHydrated();
  const vibes = usePreferences((s) => s.vibes);
  const budget = usePreferences((s) => s.budget);
  const food = usePreferences((s) => s.food);
  const maxTravel = usePreferences((s) => s.maxTravel);
  const prefs: Preferences =
    demo === "prefs" || demo === "reset" ? demoPrefs : { vibes, budget, food, maxTravel };
  const [confirming, setConfirming] = useState(demo === "reset");

  if (!hydrated) return <View className="flex-1 bg-bg" />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const resetDemo = () => {
    usePlan.getState().reset();
    usePreferences.getState().reset();
    // Drop Home and Settings from the stack so onboarding is the only screen, like a fresh install.
    if (router.canDismiss()) router.dismissAll();
    router.replace("/onboarding");
  };

  const rows = [
    { label: "Vibe", value: prefs.vibes.join(", ") },
    { label: "Budget", value: prefs.budget ? budgetLabel(prefs.budget) : "" },
    { label: "Food", value: prefs.food.join(", ") },
    { label: "Travel range", value: prefs.maxTravel ?? "" },
  ];

  return (
    <Screen
      scroll
      className="gap-8"
      footer={
        confirming ? (
          <ResetConfirm onCancel={() => setConfirming(false)} onConfirm={resetDemo} />
        ) : undefined
      }
    >
      <View className="flex-row items-center gap-3 pt-3">
        <IconButton icon={CaretLeft} label="Back" onPress={goBack} />
        <Title accessibilityRole="header">Settings</Title>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Label accessibilityRole="header">Your preferences</Label>
          {/* Negative margins keep the 48dp target without pushing the list down. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit preferences"
            onPress={() => router.push("/onboarding?edit=1")}
            className="-my-3.5 -mr-3 min-h-12 justify-center px-3 active:opacity-60"
          >
            <Label className="text-accent">Edit</Label>
          </Pressable>
        </View>
        <View>
          {rows.map((r, i) => (
            <SettingRow
              key={r.label}
              first={i === 0}
              label={r.label}
              value={r.value || NOT_SET}
              dim={!r.value}
            />
          ))}
        </View>
        <Muted>Huddle uses these so it asks your group fewer questions.</Muted>
      </View>

      <View className="gap-2">
        <Label accessibilityRole="header">Chat access</Label>
        <View>
          <SettingRow first label="WhatsApp" value="Coming soon" dim />
          <SettingRow label="Instagram" value="Coming soon" dim />
        </View>
        <Muted>Arrives with the Android notification listener. Nothing to set up here yet.</Muted>
      </View>

      <View className="gap-3">
        <Label accessibilityRole="header">Privacy</Label>
        <View className="gap-3">
          {privacy.map(({ icon: LineIcon, text }) => (
            <View key={text} className="flex-row items-start gap-3">
              <View className="h-5 justify-center">
                <LineIcon size={18} color={colors.muted} weight={icon.weight} />
              </View>
              <Muted className="flex-1 text-ink">{text}</Muted>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-3">
        <Label accessibilityRole="header">Demo</Label>
        <Button
          label="Reset demo"
          variant="secondary"
          icon={<ArrowCounterClockwise size={20} color={colors.ink} weight={icon.weight} />}
          onPress={() => setConfirming(true)}
        />
      </View>
    </Screen>
  );
}
