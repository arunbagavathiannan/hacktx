import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Avatar, Caption } from "@/components/ui";
import type { ChatMessage, Member } from "@/mocks/types";
import { fadeIn } from "@/theme/motion";

// "2026-10-24T19:02:00-05:00" -> "7:02 PM". Reads the wall-clock time from the string itself so
// the chat shows the same time on every device and in screenshots, whatever the timezone.
export function clockTime(iso: string) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// One incoming message: avatar, sender name in their color, bubble, time.
export function ChatBubble({ message, sender }: { message: ChatMessage; sender: Member }) {
  return (
    <Animated.View entering={fadeIn()}>
      <View className="flex-row items-start gap-2.5">
        {/* Sits beside the bubble, below the sender name. */}
        <View className="mt-[22px]">
          <Avatar member={sender} size="sm" />
        </View>
        <View className="max-w-[78%] gap-1">
          <Text className="ml-3 font-body-semibold text-caption" style={{ color: sender.color }}>
            {sender.name}
          </Text>
          <View className="rounded-card rounded-bl-md border border-line bg-surface px-4 py-2.5">
            <Text className="font-body text-body text-ink">{message.text}</Text>
          </View>
          <Caption numeric className="ml-3">
            {clockTime(message.at)}
          </Caption>
        </View>
      </View>
    </Animated.View>
  );
}
