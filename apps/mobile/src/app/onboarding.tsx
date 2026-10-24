import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowRight,
  BowlFood,
  Check,
  LockSimple,
  MapTrifold,
  Sparkle,
  Storefront,
  Wallet,
} from "phosphor-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OptionRow } from "@/components/onboarding/OptionRow";
import { ProgressSegments } from "@/components/onboarding/ProgressSegments";
import { StepIntro } from "@/components/onboarding/StepIntro";
import { StepTransition } from "@/components/onboarding/StepTransition";
import { Button, Chip, Muted } from "@/components/ui";
import {
  budgetOptions,
  type ChoiceOption,
  foodOptions,
  LOCAL_SPOTS,
  NO_RESTRICTIONS,
  travelOptions,
  vibeOptions,
} from "@/mocks/onboarding";
import type { Preferences } from "@/mocks/types";
import { usePreferences, usePreferencesHydrated } from "@/store/preferences";
import { colors, icon } from "@/theme";

const STEP_COUNT = 4;

// Saved answers, minus any ids this version's option lists don't know about (otherwise
// "1 picked" shows with nothing highlighted, and Next unlocks on an invisible answer).
function savedAnswers() {
  const s = usePreferences.getState();
  const known = (opts: { id: string }[], id: string | null) =>
    id !== null && opts.some((o) => o.id === id);
  return {
    vibes: s.vibes.filter((id) => known(vibeOptions, id)),
    budget: known(budgetOptions, s.budget) ? s.budget : null,
    food: s.food.filter((id) => id === LOCAL_SPOTS || known(foodOptions, id)),
    maxTravel: known(travelOptions, s.maxTravel) ? s.maxTravel : null,
  };
}

// Step 0: four quick taps so Huddle asks the group fewer questions later.
// `?step=4` opens a given step directly (used for PR screenshots).
export default function Onboarding() {
  // Wait for AsyncStorage, so re-opening onboarding starts from the saved answers
  // instead of blanks (and Finish can't overwrite them with blanks).
  const hydrated = usePreferencesHydrated();
  if (!hydrated) return <View className="flex-1 bg-bg" />;
  return <OnboardingSteps />;
}

function OnboardingSteps() {
  const params = useLocalSearchParams<{ step?: string }>();
  const savePrefs = usePreferences((s) => s.set);
  const finishOnboarding = usePreferences((s) => s.finishOnboarding);

  const [step, setStep] = useState(() => {
    const n = Number(params.step);
    return Number.isInteger(n) && n >= 1 && n <= STEP_COUNT ? n - 1 : 0;
  });
  const [direction, setDirection] = useState<1 | -1>(1);

  // Start from anything already saved, so re-running onboarding keeps earlier answers.
  const [initial] = useState(savedAnswers);
  const [vibes, setVibes] = useState(initial.vibes);
  const [budget, setBudget] = useState(initial.budget);
  const [food, setFood] = useState(initial.food);
  const [maxTravel, setMaxTravel] = useState(initial.maxTravel);

  const answered = [vibes.length > 0, budget !== null, food.length > 0, maxTravel !== null][step];
  const isLast = step === STEP_COUNT - 1;

  function finish(patch: Partial<Preferences> = {}) {
    savePrefs({ vibes, budget, food, maxTravel, ...patch });
    finishOnboarding();
    router.replace("/");
  }

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  }

  // Skip leaves this step blank (Huddle will ask in the plan if it matters) and moves on.
  function skip() {
    if (step === 0) setVibes([]);
    if (step === 1) setBudget(null);
    if (step === 2) setFood([]);
    // Last step: state won't update before we save, so pass the blank answer directly.
    if (isLast) finish({ maxTravel: null });
    else go(step + 1);
  }

  function toggleFood(id: string) {
    setFood((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      // "No restrictions" and a restriction can't both be true.
      if (id === NO_RESTRICTIONS) return [...prev.filter((f) => f === LOCAL_SPOTS), id];
      if (id !== LOCAL_SPOTS) return [...prev.filter((f) => f !== NO_RESTRICTIONS), id];
      return [...prev, id];
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-4 px-5 pb-2 pt-3">
        <ProgressSegments total={STEP_COUNT} current={step} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip this step"
          onPress={skip}
          hitSlop={12}
          className="active:opacity-60"
        >
          <Text className="font-body-semibold text-sm text-muted">Skip</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="flex-grow px-5 pb-8 pt-6">
        <StepTransition stepKey={step} direction={direction}>
          {step === 0 ? (
            <>
              <StepIntro
                Glyph={Sparkle}
                eyebrow="Vibe"
                title="What makes a trip good for you?"
                subtitle="Pick all that fit. Huddle leans the plan toward these."
              />
              <ChipGrid
                options={vibeOptions}
                selected={vibes}
                onToggle={(id) => setVibes(toggle(vibes, id))}
              />
              <PickedCount count={vibes.length} />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <StepIntro
                Glyph={Wallet}
                eyebrow="Budget style"
                title="How do you like to spend?"
                subtitle="Roughly, per person. Huddle still checks the group's budget."
              />
              <View className="gap-3">
                {budgetOptions.map((o) => (
                  <OptionRow
                    key={o.id}
                    mark={o.id}
                    label={o.label}
                    hint={o.hint}
                    selected={budget === o.id}
                    onPress={() => setBudget(o.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepIntro
                Glyph={BowlFood}
                eyebrow="Food"
                title="Anything Huddle should know at dinner?"
                subtitle="Every restaurant it suggests will work for you."
              />
              <ChipGrid options={foodOptions} selected={food} onToggle={toggleFood} />
              <OptionRow
                shape="check"
                Glyph={Storefront}
                label="Love trying local spots"
                hint="Skip the chains. Find where people who live there eat."
                selected={food.includes(LOCAL_SPOTS)}
                onPress={() => toggleFood(LOCAL_SPOTS)}
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepIntro
                Glyph={MapTrifold}
                eyebrow="Travel"
                title="How far would you go?"
                subtitle="Huddle won't suggest anything past this unless the group asks."
              />
              <View className="gap-3">
                {travelOptions.map((o) => (
                  <OptionRow
                    key={o.id}
                    Glyph={o.icon}
                    label={o.label}
                    hint={o.hint}
                    selected={maxTravel === o.id}
                    onPress={() => setMaxTravel(o.id)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </StepTransition>

        <View className="flex-row items-center gap-2 pt-8">
          <LockSimple size={14} color={colors.faint} weight={icon.weight} />
          <Text className="font-body text-xs text-faint">
            Saved only on this phone. You can skip any step.
          </Text>
        </View>
      </ScrollView>

      <View className="flex-row gap-3 border-t border-line px-5 pb-2 pt-3">
        {step > 0 ? (
          <Button
            label="Back"
            variant="secondary"
            onPress={() => go(step - 1)}
            className="flex-1"
          />
        ) : null}
        <Button
          label={isLast ? "Finish" : "Next"}
          disabled={!answered}
          onPress={() => (isLast ? finish() : go(step + 1))}
          icon={
            isLast ? (
              <Check size={20} color={colors.bg} weight="bold" />
            ) : (
              <ArrowRight size={20} color={colors.bg} weight={icon.weight} />
            )
          }
          className="flex-[2]"
        />
      </View>
    </SafeAreaView>
  );
}

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: ChoiceOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {options.map((o) => {
        const on = selected.includes(o.id);
        const Glyph = o.icon;
        return (
          <Chip
            key={o.id}
            label={o.label}
            selected={on}
            onPress={() => onToggle(o.id)}
            icon={
              Glyph ? (
                <Glyph
                  size={18}
                  color={on ? colors.accent : colors.muted}
                  weight={on ? icon.activeWeight : icon.weight}
                />
              ) : undefined
            }
          />
        );
      })}
    </View>
  );
}

function PickedCount({ count }: { count: number }) {
  return (
    <Muted className={count > 0 ? "text-accent" : undefined}>
      {count === 0 ? "Nothing picked yet" : `${count} picked`}
    </Muted>
  );
}
