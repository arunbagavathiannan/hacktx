import { ChatsCircle, Sparkle } from "phosphor-react-native";
import { Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarStack, Button } from "@/components/ui";
import type { Member } from "@/mocks/types";
import { colors } from "@/theme";
import { DURATION, EASE_OUT } from "@/theme/motion";

type Props = {
  title: string; // "Planning Denver with Sam?"
  body: string; // "Huddle spotted a trip in ski bums"
  members: Member[];
  onPlan: () => void;
  onDismiss: () => void;
};

// In-app heads-up banner that drops in from the top, like the real Android notification.
// Built in-app (not just a system notification) so it also works in the web build.
export function PlanBanner({ title, body, members, onPlan, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={SlideInUp.duration(DURATION.slow).easing(EASE_OUT)}
      exiting={SlideOutUp.duration(DURATION.slow).easing(EASE_OUT)}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        zIndex: 10,
        top: insets.top + 8,
        shadowColor: colors.bg,
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 16,
      }}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View className="overflow-hidden rounded-[28px] border border-line bg-raised">
        <View className="gap-3 p-4">
          <View className="flex-row items-center gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-lg bg-accent">
              <ChatsCircle size={16} color={colors.bg} weight="fill" />
            </View>
            <Text className="font-body-bold text-xs text-muted">Huddle</Text>
            <Text className="flex-1 font-body text-xs text-faint">· now</Text>
            <AvatarStack members={members} size="sm" max={3} />
          </View>

          <View className="gap-0.5">
            <Text className="font-display text-lg leading-6 text-ink">{title}</Text>
            <Text className="font-body text-sm leading-5 text-muted">{body}</Text>
          </View>

          <View className="flex-row gap-2 pt-1">
            <Button
              label="Not now"
              variant="secondary"
              onPress={onDismiss}
              className="h-12 flex-1 px-4"
            />
            <Button
              label="Plan it"
              onPress={onPlan}
              icon={<Sparkle size={18} color={colors.bg} weight="fill" />}
              className="h-12 flex-1 px-4"
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
