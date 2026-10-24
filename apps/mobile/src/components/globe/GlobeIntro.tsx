import { CaretRight } from "phosphor-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Label, Muted, Title } from "@/components/ui";
import { colors } from "@/theme";
import { Globe } from "./Globe";

type Props = {
  destination: { lat: number; lng: number; city: string; region: string };
  origin: { lat: number; lng: number; airport: string };
  eyebrow: string; // "Huddle found 12 options"
  subtitle: string; // "AUS → DEN · Fri Nov 13 – Sun Nov 15"
  onDone: () => void;
  frozenAt?: number;
};

// Full-screen globe that zooms into the destination, then hands off to the map.
// The parent unmounts it when onDone fires; the exiting fade is the cross-fade.
export function GlobeIntro({ destination, origin, eyebrow, subtitle, onDone, frozenAt }: Props) {
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
      exiting={FadeOut.duration(450)}
    >
      <Globe destination={destination} origin={origin} frozenAt={frozenAt} onDone={onDone} />

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View className="flex-row justify-end px-5 pt-2" pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip intro"
            onPress={onDone}
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
          <Title className="text-4xl leading-[44px]">
            {destination.city}, {destination.region}
          </Title>
          <Animated.View entering={FadeIn.delay(700).duration(500)}>
            <Muted className="text-base">{subtitle}</Muted>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}
