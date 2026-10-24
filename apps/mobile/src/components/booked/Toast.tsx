import { CheckCircle, WarningCircle } from "phosphor-react-native";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { colors, icon } from "@/theme";

export type ToastState = { message: string; tone: "good" | "bad" } | null;

// Small pill above the footer, e.g. "Copied" after copying the plan text.
export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const Icon = toast.tone === "good" ? CheckCircle : WarningCircle;
  return (
    <Animated.View
      key={toast.message}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      style={{ position: "absolute", bottom: 16, alignSelf: "center" }}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View className="flex-row items-center gap-2 rounded-full border border-line bg-raised px-4 py-2.5">
        <Icon
          size={18}
          color={toast.tone === "good" ? colors.good : colors.bad}
          weight={icon.activeWeight}
        />
        <Text className="font-body-semibold text-sm text-ink">{toast.message}</Text>
      </View>
    </Animated.View>
  );
}
