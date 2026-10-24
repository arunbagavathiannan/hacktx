import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { CaretLeft, PaperPlaneTilt, Plus, Sparkle } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { ChatBubble } from "@/components/incoming/ChatBubble";
import { dismissPlanNotification, postPlanNotification } from "@/components/incoming/notify";
import { PlanBanner } from "@/components/incoming/PlanBanner";
import { TypingIndicator } from "@/components/incoming/TypingIndicator";
import { AvatarStack, Screen } from "@/components/ui";
import { chat, members, trip } from "@/mocks";
import type { Member } from "@/mocks/types";
import { colors } from "@/theme";

const FIRST_MESSAGE_MS = 600;
const MESSAGE_GAP_MS = 700;
const BANNER_AFTER_LAST_MS = 1100;

type BannerState = "hidden" | "open" | "dismissed";

function memberFor(id: string): Member {
  return members.find((m) => m.id === id) ?? { id, name: id, color: colors.muted };
}

const friends = members.filter((m) => !m.isYou);

// Who to name in the popup: whoever first mentioned the destination ("denver??" -> Sam).
const city = trip.destination.city;
const leadId =
  chat.find((m) => m.text.toLowerCase().includes(city.toLowerCase()))?.from ?? friends[0]?.id;
const lead = memberFor(leadId ?? "");

const bannerTitle = `Planning ${city} with ${lead.name}?`;
const bannerBody = `Huddle spotted a trip in ${trip.sourceChat.name}`;

// Step 1 of the demo: the group chat fills up, then Huddle's heads-up banner drops in.
// MOCK: messages come from mocks/chat; on the phone the real ones come from the notification
// listener. Dev: /plan/incoming?demo=banner shows the finished chat with the banner open.
export default function Incoming() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const reduceMotion = useReducedMotion();
  const instant = demo === "banner" || reduceMotion;

  const [shown, setShown] = useState(instant ? chat.length : 0);
  const [banner, setBanner] = useState<BannerState>(instant ? "open" : "hidden");
  const notificationId = useRef<string | null>(null);
  const notified = useRef(false);
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

  // First time the banner opens: buzz, and post the real heads-up notification on the phone.
  useEffect(() => {
    if (banner !== "open" || notified.current) return;
    notified.current = true;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    postPlanNotification(bannerTitle, bannerBody).then((id) => {
      notificationId.current = id;
    });
  }, [banner]);

  const planIt = () => {
    dismissPlanNotification(notificationId.current);
    router.push("/plan/working");
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const typing = !instant && shown < chat.length ? chat[shown] : undefined;

  return (
    <View className="flex-1 bg-bg">
      <Screen
        className="gap-0 px-0 pt-0"
        footer={
          <View className="flex-row items-center gap-2" accessibilityElementsHidden>
            <View className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface">
              <Plus size={20} color={colors.muted} />
            </View>
            <View className="h-11 flex-1 justify-center rounded-full border border-line bg-surface px-4">
              <Text className="font-body text-sm text-faint">Message {trip.sourceChat.name}</Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-raised">
              <PaperPlaneTilt size={20} color={colors.faint} />
            </View>
          </View>
        }
      >
        <View className="flex-row items-center gap-3 border-b border-line px-3 pb-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-raised"
          >
            <CaretLeft size={22} color={colors.ink} />
          </Pressable>
          <AvatarStack members={friends} size="sm" max={3} />
          <View className="flex-1">
            <Text className="font-display text-lg leading-6 text-ink">{trip.sourceChat.name}</Text>
            <Text className="font-body text-xs text-muted" numberOfLines={1}>
              {friends.map((m) => m.name).join(", ")}, you
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="grow justify-end gap-4 px-4 py-5"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          <View className="items-center pb-2">
            <Text className="rounded-full bg-surface px-3 py-1 font-body-semibold text-[11px] text-faint">
              Today
            </Text>
          </View>

          {chat.slice(0, shown).map((m) => (
            <ChatBubble key={m.id} message={m} sender={memberFor(m.from)} />
          ))}

          {typing ? <TypingIndicator key={typing.id} member={memberFor(typing.from)} /> : null}

          {banner === "dismissed" ? (
            <Animated.View entering={FadeIn.duration(250)} style={{ alignItems: "center" }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setBanner("open")}
                className="flex-row items-center gap-2 rounded-full bg-accent-soft px-4 py-2.5 active:opacity-80"
              >
                <Sparkle size={16} color={colors.accent} weight="fill" />
                <Text className="font-body-bold text-sm text-accent">
                  Huddle spotted a plan · Review
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
