import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, Check } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { ChoiceCard } from "@/components/onboarding/ChoiceCard";
import {
  budgetOptions,
  foodOptions,
  NO_RESTRICTIONS,
  steps,
  toggle,
  travelOptions,
  vibeOptions,
} from "@/components/onboarding/options";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { Button, Chip, Label, Muted, Screen, Title } from "@/components/ui";
import { usePreferences } from "@/store/preferences";
import { colors, icon } from "@/theme";

const last = steps.length - 1;
const stepKeys = steps.map((s) => s.key);

// `?step=1..4` opens a given question directly (used for PR screenshots).
function initialStep(param: string | undefined) {
  const n = Number(param);
  return Number.isInteger(n) && n >= 1 && n <= steps.length ? n - 1 : 0;
}

// Four quick questions, one per page. Answers save to usePreferences as you tap,
// so Huddle can skip questions later (see /plan/summary).
export default function Onboarding() {
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState(() => initialStep(params.step));
  const [direction, setDirection] = useState<1 | -1>(1);

  const vibes = usePreferences((s) => s.vibes);
  const budget = usePreferences((s) => s.budget);
  const food = usePreferences((s) => s.food);
  const maxTravel = usePreferences((s) => s.maxTravel);
  const setPrefs = usePreferences((s) => s.set);
  const finishOnboarding = usePreferences((s) => s.finishOnboarding);

  const answered = [vibes.length > 0, budget !== null, food.length > 0, maxTravel !== null][step];

  const finish = () => {
    finishOnboarding();
    router.replace("/");
  };
  const go = (to: number) => {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  };

  const { title, subtitle } = steps[step];
  const entering = (direction === 1 ? FadeInRight : FadeInLeft).duration(280);

  return (
    <Screen
      footer={
        <View className="flex-row gap-3">
          {step > 0 ? (
            <Button
              label="Back"
              variant="secondary"
              icon={<ArrowLeft size={20} color={colors.ink} weight={icon.weight} />}
              onPress={() => go(step - 1)}
              className="px-5"
            />
          ) : null}
          <Button
            label={step === last ? "Let's go" : "Next"}
            icon={
              step === last ? (
                <Check size={20} color={colors.bg} weight="bold" />
              ) : (
                <ArrowRight size={20} color={colors.bg} weight="bold" />
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
          accessibilityLabel="Skip onboarding"
          onPress={finish}
          hitSlop={12}
          className="active:opacity-60"
        >
          <Text className="font-body-semibold text-sm text-muted">Skip</Text>
        </Pressable>
      </View>

      <Animated.View key={step} entering={entering} style={{ flex: 1 }}>
        <View className="flex-1 gap-6 pt-4">
          <View className="gap-2">
            <Label>
              {step + 1} of {steps.length}
            </Label>
            <Title className="text-4xl leading-[44px]">{title}</Title>
            <Muted className="text-base leading-6">{subtitle}</Muted>
          </View>

          {step === 0 ? (
            <View className="flex-row flex-wrap gap-2.5">
              {vibeOptions.map(({ label, icon: VibeIcon }) => {
                const selected = vibes.includes(label);
                return (
                  <Chip
                    key={label}
                    label={label}
                    selected={selected}
                    onPress={() => setPrefs({ vibes: toggle(vibes, label) })}
                    icon={
                      VibeIcon ? (
                        <VibeIcon
                          size={18}
                          color={selected ? colors.accent : colors.muted}
                          weight={selected ? icon.activeWeight : icon.weight}
                        />
                      ) : undefined
                    }
                  />
                );
              })}
            </View>
          ) : null}

          {step === 1 ? (
            <View className="gap-3">
              {budgetOptions.map((o) => (
                <ChoiceCard
                  key={o.label}
                  label={o.label}
                  title={o.title}
                  description={o.description}
                  selected={budget === o.label}
                  onPress={() => setPrefs({ budget: o.label })}
                />
              ))}
            </View>
          ) : null}

          {step === 2 ? (
            <View className="flex-row flex-wrap gap-2.5">
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

          {step === 3 ? (
            <View className="gap-3">
              {travelOptions.map((o) => (
                <ChoiceCard
                  key={o.label}
                  label={o.label}
                  description={o.description}
                  icon={o.icon}
                  selected={maxTravel === o.label}
                  onPress={() => setPrefs({ maxTravel: o.label })}
                />
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Screen>
  );
}
