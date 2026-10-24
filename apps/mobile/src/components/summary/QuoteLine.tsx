import { Text, View } from "react-native";
import { Avatar } from "@/components/ui";
import type { ChatMessage, Member } from "@/mocks/types";

// One cited chat message under a fact: who said it and their exact words.
export function QuoteLine({ message, sender }: { message: ChatMessage; sender: Member }) {
  return (
    <View
      accessibilityLabel={`${sender.name} said: ${message.text}`}
      className="flex-row items-start gap-2.5"
    >
      <Avatar member={sender} size="sm" />
      <Text className="flex-1 pt-1 font-body text-sm leading-5 text-muted" numberOfLines={2}>
        <Text className="font-body-semibold text-ink">{sender.name} </Text>
        {`“${message.text}”`}
      </Text>
    </View>
  );
}
