import { useEffect, useRef } from "react";
import { AccessibilityInfo, type HostInstance, Platform, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button, Muted } from "@/components/ui";

type Props = {
  onCancel: () => void;
  onConfirm: () => void;
};

// Inline "Start the demo over?" confirm (no browser/system dialog, which looks off on stage).
// Rendered in the Screen's sticky footer so the buttons are always on screen.
export function ResetConfirm({ onCancel, onConfirm }: Props) {
  const box = useRef<HostInstance>(null);
  const title = useRef<HostInstance>(null);

  // Move screen-reader / keyboard focus to the confirm: TalkBack lands on the question,
  // the web build focuses Cancel.
  useEffect(() => {
    if (Platform.OS === "web") {
      const el = box.current as unknown as {
        querySelector?: (s: string) => { focus?: () => void } | null;
      } | null;
      el?.querySelector?.('[role="button"]')?.focus?.();
    } else if (title.current) {
      AccessibilityInfo.sendAccessibilityEvent(title.current, "focus");
    }
  }, []);

  return (
    <Animated.View entering={FadeInDown.duration(200)}>
      <View ref={box} accessibilityViewIsModal className="gap-3 pb-1">
        <View className="gap-1">
          <Text
            ref={title}
            accessibilityRole="header"
            className="font-body-bold text-base leading-6 text-ink"
          >
            Start the demo over?
          </Text>
          <Muted>
            Clears your preferences and restores the Denver plan to its starting picks, then opens
            onboarding.
          </Muted>
        </View>
        <View className="flex-row gap-3">
          <Button label="Cancel" variant="secondary" onPress={onCancel} className="flex-1" />
          <Button label="Reset" onPress={onConfirm} className="flex-1" />
        </View>
      </View>
    </Animated.View>
  );
}
