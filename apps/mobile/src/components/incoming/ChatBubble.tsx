import { LinearGradient } from "expo-linear-gradient";
import { Platform, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { ChatMessage, Member } from "@/mocks/types";
import { fadeIn } from "@/theme/motion";

// The incoming chat is drawn like iMessage in dark mode, since it stands in for the user's own
// messaging app. These are iOS system values, so they stay out of the app theme.
export const imessage = {
  bg: "#000000",
  bubble: "#262628", // their messages
  sent: "#0A84FF", // your messages
  name: "#8E8E93", // sender names, timestamps
  chrome: "#1C1C1E", // header buttons, the + button
  line: "#3A3A3C",
  text: "#FFFFFF",
  font: Platform.select({
    ios: "System",
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: undefined,
  }),
};

// "2026-10-24T19:02:00-05:00" -> "7:02 PM". Reads the wall-clock time from the string itself so
// the chat shows the same time on every device and in screenshots, whatever the timezone.
export function clockTime(iso: string) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const AVATAR = 30;

// iOS contact monogram: initials on a gray gradient, never a photo.
export function Monogram({ name, size = AVATAR }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <LinearGradient
      colors={["#A5A9B2", "#858991"]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: imessage.text,
          fontFamily: imessage.font,
          fontWeight: "600",
          fontSize: size * 0.42,
        }}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
}

// The little curl under the last bubble in a run, like iMessage's.
function Tail({ mine }: { mine: boolean }) {
  const color = mine ? imessage.sent : imessage.bubble;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 0,
        [mine ? "right" : "left"]: -5,
        width: 16,
        height: 16,
        backgroundColor: color,
        borderBottomRightRadius: mine ? 14 : 0,
        borderBottomLeftRadius: mine ? 0 : 14,
      }}
    >
      <View
        style={{
          position: "absolute",
          bottom: 0,
          [mine ? "right" : "left"]: -10,
          width: 10,
          height: 18,
          backgroundColor: imessage.bg,
          borderBottomRightRadius: mine ? 0 : 10,
          borderBottomLeftRadius: mine ? 10 : 0,
        }}
      />
    </View>
  );
}

export function Bubble({ text, mine, tail }: { text: string; mine: boolean; tail: boolean }) {
  return (
    <View
      style={{
        maxWidth: "78%",
        alignSelf: mine ? "flex-end" : "flex-start",
        backgroundColor: mine ? imessage.sent : imessage.bubble,
        borderRadius: 19,
        paddingHorizontal: 13,
        paddingVertical: 8,
      }}
    >
      {tail ? <Tail mine={mine} /> : null}
      <Text
        style={{ color: imessage.text, fontFamily: imessage.font, fontSize: 17, lineHeight: 22 }}
      >
        {text}
      </Text>
    </View>
  );
}

// One message in a group chat. Like iMessage: the sender's name sits above the first bubble
// of their run, their avatar and the bubble's tail sit beside the last one. Your own messages
// are blue, on the right, with no name or avatar.
export function ChatBubble({
  message,
  sender,
  first,
  last,
}: {
  message: ChatMessage;
  sender: Member;
  first: boolean; // first in a run by this sender: shows the name
  last: boolean; // last in a run: shows the avatar and tail
}) {
  const mine = Boolean(sender.isYou);
  return (
    <Animated.View
      entering={fadeIn()}
      accessible
      accessibilityLabel={`${mine ? "You" : sender.name}, ${clockTime(message.at)}: ${message.text}`}
      style={{ marginTop: first ? 10 : 2 }}
    >
      {first && !mine ? (
        <Text
          style={{
            color: imessage.name,
            fontFamily: imessage.font,
            fontSize: 12,
            marginLeft: AVATAR + 8 + 13,
            marginBottom: 3,
          }}
        >
          {sender.name}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        {mine ? null : (
          <View style={{ width: AVATAR }}>{last ? <Monogram name={sender.name} /> : null}</View>
        )}
        <View style={{ flex: 1 }}>
          <Bubble text={message.text} mine={mine} tail={last} />
        </View>
      </View>
    </Animated.View>
  );
}
