import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowCounterClockwise } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  ChatHeader,
  Composer,
  DayDivider,
  MessageBubble,
  SourcePill,
  TypingBubble,
} from "@/components/incoming/Chat";
import { showPlanNotification, usePlanNotificationTap } from "@/components/incoming/notify";
import { PlanBanner } from "@/components/incoming/PlanBanner";
import { useChatPlayback } from "@/components/incoming/useChatPlayback";
import { Screen } from "@/components/ui";
import { chat, members, trip } from "@/mocks";
import { colors } from "@/theme";

const BANNER_DELAY_MS = 900;

const byId = new Map(members.map((m) => [m.id, m]));
const others = members.filter((m) => !m.isYou);
const named = others.slice(0, 2);
const extra = others.length - named.length;
const who = `${named.map((m) => m.name).join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
const bannerMessage = `Sounds like a trip with ${who}. Plan it?`;
// Same text with non-breaking spaces in the names so "Sam, Maya +2." never splits across lines.
const bannerDisplay = `Sounds like a trip with ${who.replace(/ /g, String.fromCharCode(160))}. Plan it?`;
const bannerSummary = "Fri–Sun, Nov 13–15 · under $400 each";

const goToWorking = () => router.push("/plan/working");

// Step 1 of the demo: the moment Huddle spots a plan. The group chat plays in live, then
// Huddle's heads-up banner drops in. On a phone it also fires a real local notification.
export default function Incoming() {
  // Dev-only: /plan/incoming?demo=popup skips the chat playback and shows the banner right away.
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const skip = demo === "popup";
  const { shown, typingFrom, done } = useChatPlayback(chat, skip);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  usePlanNotificationTap(goToWorking);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(
      () => {
        setBannerVisible(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        showPlanNotification(bannerMessage, bannerSummary);
      },
      skip ? 0 : BANNER_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, [done, skip]);

  const typingMember = typingFrom ? byId.get(typingFrom) : undefined;

  return (
    <Screen className="gap-0 px-0 pt-0" footer={<Composer chatName={trip.sourceChat.name} />}>
      <ChatHeader name={trip.sourceChat.name} members={members} />

      <View className="flex-1">
        <ScrollView
          ref={scroll}
          contentContainerClassName="grow justify-end gap-3 px-4 pb-4 pt-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          <SourcePill />
          <DayDivider label="Today" />
          {chat.slice(0, shown).map((m) => {
            const sender = byId.get(m.from);
            return sender ? <MessageBubble key={m.id} message={m} sender={sender} /> : null;
          })}
          {typingMember ? <TypingBubble key={typingFrom} sender={typingMember} /> : null}
        </ScrollView>

        {dismissed && !bannerVisible ? (
          <Animated.View
            entering={FadeIn.delay(400).duration(300)}
            exiting={FadeOut.duration(150)}
            style={{ position: "absolute", top: 12, left: 0, right: 0, alignItems: "center" }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show Huddle's suggestion again"
              onPress={() => setBannerVisible(true)}
              className="flex-row items-center gap-2 rounded-full border border-line bg-raised px-4 py-2 active:opacity-80"
            >
              <ArrowCounterClockwise size={16} color={colors.accent} />
              <Text className="font-body-semibold text-[13px] text-ink">
                Huddle will stay quiet. Show again
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      {/* Sibling of the header so it drops in over it, like a system heads-up */}
      <PlanBanner
        visible={bannerVisible}
        members={others}
        message={bannerDisplay}
        summary={bannerSummary}
        onPlan={goToWorking}
        onDismiss={() => {
          setBannerVisible(false);
          setDismissed(true);
        }}
      />
    </Screen>
  );
}
