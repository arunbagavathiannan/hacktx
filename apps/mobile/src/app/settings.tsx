import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowCounterClockwise,
  BellRinging,
  CaretLeft,
  Compass,
  DeviceMobile,
  ForkKnife,
  HandTap,
  PencilSimple,
  ShieldCheck,
  Sparkle,
  Wallet,
} from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { IconButton } from "@/components/home/IconButton";
import { budgetOptions } from "@/components/onboarding/options";
import { ResetConfirm } from "@/components/settings/ResetDemo";
import { SettingRow } from "@/components/settings/SettingRow";
import { demoPrefs } from "@/components/summary/personalize";
import { Button, Card, Label, Muted, Screen, Title } from "@/components/ui";
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
    { icon: Sparkle, title: "Vibe", value: prefs.vibes.join(", ") },
    { icon: Wallet, title: "Budget", value: prefs.budget ? budgetLabel(prefs.budget) : "" },
    { icon: ForkKnife, title: "Food", value: prefs.food.join(", ") },
    { icon: Compass, title: "Travel range", value: prefs.maxTravel ?? "" },
  ];

  return (
    <Screen
      scroll
      className="gap-6"
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

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Label>Your preferences</Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit preferences"
            onPress={() => router.push("/onboarding?edit=1")}
            className="min-h-12 flex-row items-center gap-1.5 px-2 active:opacity-60"
          >
            <PencilSimple size={18} color={colors.accent} weight={icon.weight} />
            <Text className="font-body-bold text-sm text-accent">Edit</Text>
          </Pressable>
        </View>
        <Card className="py-1">
          {rows.map((r, i) => (
            <SettingRow
              key={r.title}
              first={i === 0}
              icon={r.icon}
              title={r.title}
              detail={r.value || NOT_SET}
              dim={!r.value}
            />
          ))}
        </Card>
        <Muted className="px-1">Huddle uses these so it asks your group fewer questions.</Muted>
      </View>

      <View className="gap-3">
        <Label>Chat access</Label>
        <Card className="py-1">
          <SettingRow
            first
            icon={BellRinging}
            title="Coming soon"
            detail="Read WhatsApp & Instagram on Android"
          />
        </Card>
        <Muted className="px-1">
          Arrives with the Android notification listener. Nothing to set up here yet.
        </Muted>
      </View>

      <View className="gap-3">
        <Label>Privacy</Label>
        <View className="gap-3 px-1">
          {privacy.map(({ icon: LineIcon, text }) => (
            <View key={text} className="flex-row items-start gap-3">
              <LineIcon size={20} color={colors.good} weight={icon.weight} />
              <Muted className="flex-1 text-ink">{text}</Muted>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-3">
        <Label>Demo</Label>
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
