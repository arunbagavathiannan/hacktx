import { Redirect, router } from "expo-router";
import { ChatsCircle, Sparkle } from "phosphor-react-native";
import { View } from "react-native";
import {
  AvatarStack,
  Badge,
  Button,
  Card,
  Heading,
  Label,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { trip } from "@/mocks";
import { usePreferences } from "@/store/preferences";
import { colors } from "@/theme";

// Home: the user's plans. In the demo, the plan starts from the popup (/plan/incoming).
export default function Home() {
  const onboarded = usePreferences((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Screen scroll>
      <View className="flex-row items-center gap-2 pt-4">
        <ChatsCircle size={28} color={colors.accent} weight="fill" />
        <Title>Huddle</Title>
      </View>
      <Muted>Plans Huddle spotted in your chats.</Muted>

      <Card>
        <View className="gap-3">
          <Badge label="Spotted in ski bums" tone="accent" />
          <Heading>{trip.title}</Heading>
          <Muted>{trip.dates.label}</Muted>
          <AvatarStack members={trip.members} size="sm" />
        </View>
      </Card>

      <View className="gap-2 pt-2">
        <Label>Demo</Label>
        <Button
          label="Simulate a plan in the group chat"
          icon={<Sparkle size={20} color={colors.bg} weight="fill" />}
          onPress={() => router.push("/plan/incoming")}
        />
      </View>
    </Screen>
  );
}
