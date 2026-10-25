import { CaretRight } from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Label, Muted, Title } from "@/components/ui";
import { colors } from "@/theme";
import type { GlobeArc, GlobePoint } from "./GlobeScene";
import { SafeGlobe } from "./SafeGlobe";

type Props = {
  title: string; // "Denver, Colorado"
  focus: { lat: number; lng: number };
  points: GlobePoint[];
  arcs: GlobeArc[];
  eyebrow: string; // "Huddle found 12 options"
  subtitle: string; // "AUS → DEN · Fri Nov 13 – Sun Nov 15"
  onDone: () => void;
  frozenAt?: number;
};

const DURATION_MS = 2500;
// Hard cap on the intro, whatever the frame rate does. The map is the point; the globe is
// a flourish and must never hold the demo hostage.
const MAX_INTRO_MS = DURATION_MS + 3000;

// Full-screen globe that zooms into the destination, then hands off to the map.
// The parent unmounts it when onDone fires; the exiting fade is the cross-fade.
// If GL fails (throws or never draws), SafeGlobe bails and the map shows right away.
export function GlobeIntro({
  title,
  focus,
  points,
  arcs,
  eyebrow,
  subtitle,
  onDone,
  frozenAt,
}: Props) {
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    if (frozenAt !== undefined) return;
    const timer = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        onDoneRef.current();
      }
    }, MAX_INTRO_MS);
    return () => clearTimeout(timer);
  }, [frozenAt]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
      exiting={FadeOut.duration(450)}
    >
      <SafeGlobe
        focus={focus}
        points={points}
        arcs={arcs}
        durationMs={DURATION_MS}
        frozenAt={frozenAt}
        onDone={finish}
        onFail={finish}
      />

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View className="flex-row justify-end px-5 pt-2" pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip intro"
            onPress={finish}
            hitSlop={12}
            className="flex-row items-center gap-1 rounded-full border border-line bg-surface/80 px-4 py-2 active:opacity-80"
          >
            <Text className="font-body-semibold text-sm text-ink">Skip</Text>
            <CaretRight size={14} color={colors.ink} weight="regular" />
          </Pressable>
        </View>

        <View className="flex-1" pointerEvents="none" />

        <Animated.View
          entering={FadeInDown.delay(250).duration(600)}
          style={{ gap: 4, paddingHorizontal: 24, paddingBottom: 40 }}
          pointerEvents="none"
        >
          <Label className="text-accent">{eyebrow}</Label>
          <Title className="text-4xl leading-[44px]">{title}</Title>
          <Animated.View entering={FadeIn.delay(700).duration(500)}>
            <Muted className="text-base">{subtitle}</Muted>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}
