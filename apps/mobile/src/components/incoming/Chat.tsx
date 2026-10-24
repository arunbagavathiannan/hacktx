import { router } from "expo-router";
import { CaretLeft, ChatCircleDots, DotsThreeVertical, Plus } from "phosphor-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Avatar } from "@/components/ui";
import type { ChatMessage, Member } from "@/mocks/types";
import { colors } from "@/theme";

// Our own chat look for the simulated group (not a copy of any real messenger's UI).

// "2026-10-24T19:02:00-05:00" -> "7:02 PM", read from the string so the viewer's time zone
// doesn't shift it.
function timeLabel(iso: string) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function ChatHeader({ name, members }: { name: string; members: Member[] }) {
  const others = members.filter((m) => !m.isYou);
  return (
    <View className="flex-row items-center gap-3 border-b border-line px-3 pb-3 pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-raised"
      >
        <CaretLeft size={22} color={colors.ink} />
      </Pressable>

      {/* Group icon: two members overlapped on a diagonal */}
      <View style={{ width: 40, height: 40 }}>
        <View style={{ position: "absolute", top: 0, left: 0 }}>
          <Avatar member={others[0]} size="sm" />
        </View>
        <View style={{ position: "absolute", bottom: 0, right: 0 }}>
          <Avatar member={others[1]} size="sm" />
        </View>
      </View>

      <View className="flex-1">
        <Text className="font-body-bold text-base text-ink">{name}</Text>
        <Text className="font-body text-xs text-muted" numberOfLines={1}>
          {others.map((m) => m.name).join(", ")}, You
        </Text>
      </View>
      <DotsThreeVertical size={22} color={colors.muted} />
    </View>
  );
}

// Honest label for the demo: this thread is simulated, standing in for a real WhatsApp group.
export function SourcePill() {
  return (
    <View className="flex-row items-center gap-1.5 self-center rounded-full border border-line bg-surface px-3 py-1.5">
      <ChatCircleDots size={14} color={colors.good} weight="fill" />
      <Text className="font-body-semibold text-[11px] text-muted">
        WhatsApp group · simulated for the demo
      </Text>
    </View>
  );
}

export function DayDivider({ label }: { label: string }) {
  return (
    <View className="my-1 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-line" />
      <Text className="font-body-bold text-[11px] uppercase tracking-widest text-faint">
        {label}
      </Text>
      <View className="h-px flex-1 bg-line" />
    </View>
  );
}

export function MessageBubble({ message, sender }: { message: ChatMessage; sender: Member }) {
  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <View className="flex-row items-end gap-2">
        <Avatar member={sender} size="sm" />
        <View className="max-w-[78%] rounded-[20px] rounded-bl-md border border-line bg-surface px-3.5 pb-2 pt-2">
          <Text className="font-body-bold text-xs" style={{ color: sender.color }}>
            {sender.name}
          </Text>
          <Text className="font-body text-[15px] leading-[21px] text-ink">{message.text}</Text>
          <Text className="mt-0.5 self-end font-body text-[10px] text-faint">
            {timeLabel(message.at)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function Dot({ index }: { index: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(withTiming(-4, { duration: 260 }), withTiming(0, { duration: 260 })),
        -1,
      ),
    );
  }, [index, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: 0.5 + Math.abs(y.value) / 8,
  }));
  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted }, style]}
    />
  );
}

export function TypingBubble({ sender }: { sender: Member }) {
  return (
    <Animated.View entering={FadeInDown.duration(220)}>
      <View className="flex-row items-end gap-2">
        <Avatar member={sender} size="sm" />
        <View className="h-10 flex-row items-center gap-1.5 rounded-[20px] rounded-bl-md border border-line bg-surface px-4">
          {[0, 1, 2].map((i) => (
            <Dot key={i} index={i} />
          ))}
        </View>
        <Text className="mb-1 font-body text-[11px] text-faint">{sender.name} is typing</Text>
      </View>
    </Animated.View>
  );
}

// Static composer so the screen reads as a chat; nothing here is typeable.
export function Composer({ chatName }: { chatName: string }) {
  return (
    <View pointerEvents="none" className="flex-row items-center gap-2 pb-1">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-raised">
        <Plus size={20} color={colors.muted} />
      </View>
      <View className="h-11 flex-1 justify-center rounded-full border border-line bg-surface px-4">
        <Text className="font-body text-[15px] text-faint">Message {chatName}</Text>
      </View>
    </View>
  );
}
