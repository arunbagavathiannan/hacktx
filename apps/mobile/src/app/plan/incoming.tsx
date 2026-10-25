import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { CaretLeft, PaperPlaneTilt, Plus } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  View,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { ChatBubble } from "@/components/incoming/ChatBubble";
import { PlanBanner } from "@/components/incoming/PlanBanner";
import { TypingIndicator } from "@/components/incoming/TypingIndicator";
import { AvatarStack, Caption, Heading, Screen } from "@/components/ui";
import { brief, chat, members, triggerMessageId } from "@/mocks";
import type { Member } from "@/mocks/types";
import { colors } from "@/theme";
import { fadeIn } from "@/theme/motion";

const FIRST_MESSAGE_MS = 600;
const MESSAGE_GAP_MS = 700;
const BANNER_AFTER_LAST_MS = 1100;

type BannerState = "hidden" | "open" | "dismissed";

function memberFor(id: string): Member {
  return members.find((m) => m.id === id) ?? { id, name: id, color: colors.muted };
}

const friends = members.filter((m) => !m.isYou);

// The chat never names a city, so the popup doesn't either: Huddle suggests a few places next
// and the group picks. The body quotes the message that triggered it, as proof.
const trigger = chat.find((m) => m.id === triggerMessageId) ?? chat[chat.length - 1];
const bannerTitle = `Planning a trip with ${brief.sourceChat.name}?`;
const bannerBody = trigger
  ? `“${trigger.text}” — ${memberFor(trigger.from).name}`
  : `Huddle spotted a trip in ${brief.sourceChat.name}`;

// Step 1 of the demo: the group chat fills up, then Huddle's heads-up banner drops in.
// MOCK: messages come from mocks/chat; on the phone the real ones come from the notification
// listener. This simulation only shows the in-app banner; the real system notification is
// the listener track's job (see components/incoming/notify.ts).
// Dev: /plan/incoming?demo=banner shows the finished chat with the banner open.
export default function Incoming() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const reduceMotion = useReducedMotion();
  const instant = demo === "banner" || reduceMotion;

  const [shown, setShown] = useState(instant ? chat.length : 0);
  const [banner, setBanner] = useState<BannerState>(instant ? "open" : "hidden");
  const arrived = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);

  // Play the chat: one message every MESSAGE_GAP_MS, then the banner.
  useEffect(() => {
    if (instant) {
      setShown(chat.length);
      setBanner((b) => (b === "hidden" ? "open" : b));
      return;
    }
    const timers = chat.map((_, i) =>
      setTimeout(() => setShown(i + 1), FIRST_MESSAGE_MS + i * MESSAGE_GAP_MS),
    );
    const bannerAt =
      FIRST_MESSAGE_MS + Math.max(chat.length - 1, 0) * MESSAGE_GAP_MS + BANNER_AFTER_LAST_MS;
    timers.push(setTimeout(() => setBanner("open"), bannerAt));
    return () => timers.forEach(clearTimeout);
  }, [instant]);

  // First time the banner arrives: buzz and read it out (TalkBack doesn't announce
  // accessibilityRole="alert" on its own).
  useEffect(() => {
    if (banner !== "open" || arrived.current) return;
    arrived.current = true;
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility(`${bannerTitle} ${bannerBody}`);
  }, [banner]);

  // push keeps this screen under /plan/working, so Back returns to the finished chat with
  // the Review pill instead of the open banner (and nothing replays).
  const planIt = () => {
    setBanner("dismissed");
    router.push("/plan/working");
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const typing = !instant && shown < chat.length ? chat[shown] : undefined;

  return (
    <View className="flex-1 bg-bg">
      <Screen
        className="gap-0 px-0 pt-0"
        footer={
          <View
            className="flex-row items-center gap-2"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface">
              <Plus size={20} color={colors.muted} />
            </View>
            <View className="h-11 flex-1 justify-center rounded-full border border-line bg-surface px-4">
              <Text className="font-body text-sm text-faint">Message {brief.sourceChat.name}</Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-raised">
              <PaperPlaneTilt size={20} color={colors.faint} />
            </View>
          </View>
        }
      >
        <View className="flex-row items-center gap-2 border-b border-line px-2 pb-2 pt-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            className="h-12 w-12 items-center justify-center rounded-full active:bg-raised"
          >
            <CaretLeft size={22} color={colors.ink} />
          </Pressable>
          <AvatarStack members={friends} size="sm" max={3} />
          <View className="flex-1">
            <Heading>{brief.sourceChat.name}</Heading>
            <Caption className="text-muted" numberOfLines={1}>
              {friends.map((m) => m.name).join(", ")}, you
            </Caption>
          </View>
        </View>

        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="grow justify-end gap-4 px-4 py-5"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          <Caption className="pb-2 text-center">Today</Caption>

          {chat.slice(0, shown).map((m) => (
            <ChatBubble key={m.id} message={m} sender={memberFor(m.from)} />
          ))}

          {typing ? <TypingIndicator key={typing.id} member={memberFor(typing.from)} /> : null}

          {banner === "dismissed" ? (
            <Animated.View entering={fadeIn()} style={{ alignItems: "center" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Huddle spotted a plan. Review it."
                onPress={() => setBanner("open")}
                className="min-h-12 flex-row items-center rounded-full border border-line bg-surface px-5 active:bg-raised"
              >
                <Text className="font-body-semibold text-label text-ink">
                  Huddle spotted a plan · <Text className="text-accent">Review</Text>
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </ScrollView>
      </Screen>

      {banner === "open" ? (
        <PlanBanner
          title={bannerTitle}
          body={bannerBody}
          members={friends}
          onPlan={planIt}
          onDismiss={() => setBanner("dismissed")}
        />
      ) : null}
    </View>
  );
}
