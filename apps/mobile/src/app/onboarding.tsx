import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, Check } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { BackHandler, Platform, Pressable, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  cityOptions,
  foodOptions,
  NO_RESTRICTIONS,
  steps,
  toggle,
  vibeOptions,
} from "@/components/onboarding/options";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { Body, Button, Chip, Display, Screen } from "@/components/ui";
import { usePreferences } from "@/store/preferences";
import { colors, icon } from "@/theme";
import { nudgeIn } from "@/theme/motion";

const last = steps.length - 1;
const stepKeys = steps.map((s) => s.key);

// `?step=1..N` opens a given question directly (used for PR screenshots).
function initialStep(param: string | undefined) {
  const n = Number(param);
  return Number.isInteger(n) && n >= 1 && n <= steps.length ? n - 1 : 0;
}

// Three quick questions, one per page. Answers save to usePreferences as you tap,
// so Huddle can skip questions later (see /plan/summary).
export default function Onboarding() {
  const params = useLocalSearchParams<{ step?: string; edit?: string }>();
  // `?edit=1` (from Settings): same questions, prefilled from the store; finishing goes back.
  const editing = params.edit === "1";
  const [step, setStep] = useState(() => initialStep(params.step));
  const [direction, setDirection] = useState<1 | -1>(1);

  const home = usePreferences((s) => s.home) ?? "";
  const vibes = usePreferences((s) => s.vibes);
  const food = usePreferences((s) => s.food);
  const setPrefs = usePreferences((s) => s.set);
  const finishOnboarding = usePreferences((s) => s.finishOnboarding);

  const { key, title, subtitle } = steps[step];
  const answered = {
    home: home.trim().length > 0,
    vibes: vibes.length > 0,
    food: food.length > 0,
  }[key];

  const finish = () => {
    finishOnboarding();
    if (!editing) router.replace("/");
    else if (router.canGoBack()) router.back();
    else router.replace("/settings");
  };
  const go = (to: number) => {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  };

  // Android back steps to the previous question instead of leaving onboarding
  // (we got here by redirect, so leaving would close the app). On question 1 it acts normally.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || step === 0) return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        setDirection(-1);
        setStep(step - 1);
        return true;
      });
      return () => sub.remove();
    }, [step]),
  );

  // The page slides in (8px) from the side you are heading to.
  const entering = nudgeIn(direction === 1 ? "right" : "left");

  return (
    <Screen
      footer={
        <View className="flex-row gap-3">
          {step > 0 ? (
            <Button
              label="Back"
              variant="ghost"
              icon={<ArrowLeft size={20} color={colors.muted} weight={icon.weight} />}
              onPress={() => go(step - 1)}
              className="px-4"
            />
          ) : null}
          <Button
            label={step === last ? (editing ? "Done" : "Let's go") : "Next"}
            icon={
              step === last ? (
                <Check size={20} color={colors.bg} weight={icon.weight} />
              ) : (
                <ArrowRight size={20} color={colors.bg} weight={icon.weight} />
              )
            }
            disabled={!answered}
            onPress={() => (step === last ? finish() : go(step + 1))}
            className="flex-1"
          />
        </View>
      }
    >
      <View className="flex-row items-center gap-4 pt-4">
        <ProgressBar step={step} keys={stepKeys} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editing ? "Done editing" : "Skip onboarding"}
          onPress={finish}
          hitSlop={8}
          className="min-h-12 min-w-12 items-center justify-center active:opacity-60"
        >
          <Text className="font-body-semibold text-sm text-muted">{editing ? "Done" : "Skip"}</Text>
        </Pressable>
      </View>

      <Animated.View key={step} entering={entering} style={{ flex: 1 }}>
        <View className="flex-1 gap-8 pt-6">
          {/* The progress bar already says which question this is, so no "1 of 2" above it. */}
          <View className="gap-2">
            <Display accessibilityRole="header">{title}</Display>
            <Body className="text-muted">{subtitle}</Body>
          </View>

          {key === "home" ? (
            <View className="gap-4">
              <TextInput
                value={home}
                onChangeText={(text) => setPrefs({ home: text })}
                placeholder="Your city"
                placeholderTextColor={colors.faint}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => home.trim() && go(step + 1)}
                accessibilityLabel="Your city"
                className="min-h-14 rounded-card bg-surface px-4 font-body text-body text-ink"
              />
              <View className="flex-row flex-wrap gap-x-2 gap-y-3">
                {cityOptions.map((city) => (
                  <Chip
                    key={city}
                    label={city}
                    selected={home === city}
                    onPress={() => setPrefs({ home: city })}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {key === "vibes" ? (
            <View className="flex-row flex-wrap gap-x-2 gap-y-3">
              {vibeOptions.map(({ label }) => (
                <Chip
                  key={label}
                  label={label}
                  selected={vibes.includes(label)}
                  onPress={() => setPrefs({ vibes: toggle(vibes, label) })}
                />
              ))}
            </View>
          ) : null}

          {key === "food" ? (
            <View className="flex-row flex-wrap gap-x-2 gap-y-3">
              {foodOptions.map(({ label }) => (
                <Chip
                  key={label}
                  label={label}
                  selected={food.includes(label)}
                  onPress={() => setPrefs({ food: toggle(food, label, NO_RESTRICTIONS) })}
                />
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Screen>
  );
}
