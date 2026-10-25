import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowUp, CaretLeft, CaretRight, Plus, VideoCamera, Waveform } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChatBubble,
  clockTime,
  huddleMember,
  imessage,
  Monogram,
} from "@/components/incoming/ChatBubble";
import { PlanBanner } from "@/components/incoming/PlanBanner";
import { TypingIndicator } from "@/components/incoming/TypingIndicator";
import { LIVE } from "@/lib/live";
import { brief, members, chat as mockChat, triggerMessageId } from "@/mocks";
import { demoBanner, demoScript, isDemoTrigger } from "@/mocks/japanDemo";
import type { Member } from "@/mocks/types";
import { useLive } from "@/store/live";
import { usePreferences } from "@/store/preferences";
import { colors } from "@/theme";
import { fadeIn } from "@/theme/motion";

const FIRST_MESSAGE_MS = 600;
const MESSAGE_GAP_MS = 700;
const BANNER_AFTER_LAST_MS = 1100;

type BannerState = "hidden" | "open" | "dismissed";

function memberFor(id: string): Member {
  if (id === huddleMember.id) return huddleMember;
  return members.find((m) => m.id === id) ?? { id, name: id, color: colors.muted };
}

const friends = members.filter((m) => !m.isYou);

// The chat never names a city, so the popup doesn't either: Huddle suggests a few places next
// and the group picks. The body quotes the message that triggered it, as proof.
const trigger = mockChat.find((m) => m.id === triggerMessageId) ?? mockChat[mockChat.length - 1];
const mockTitle = `Planning a trip with ${brief.sourceChat.name}?`;
const mockBody = trigger
  ? `“${trigger.text}” — ${memberFor(trigger.from).name}`
  : `Huddle spotted a trip in ${brief.sourceChat.name}`;

// Live mode: how long after the last message Huddle reads the chat (typing a burst of
// messages costs one check, not one per message).
const DETECT_AFTER_MS = 900;

// Step 1 of the demo: the group chat fills up, then Huddle's heads-up banner drops in.
// MOCK: messages come from mocks/chat; on the phone the real ones come from the notification
// listener. This simulation only shows the in-app banner; the real system notification is
// the listener track's job (see components/incoming/notify.ts).
// Dev: /plan/incoming?demo=banner shows the finished chat with the banner open.
// Live mode (lib/live.ts): the composer works, so you can add a message ("nashville dec 4?")
// before tapping Plan it, and Plan it starts a real agent run.
export default function Incoming() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const liveMessages = useLive((s) => s.messages);
  const chat = LIVE ? liveMessages : mockChat;
  const [draft, setDraft] = useState("");
  // Live mode: who the next typed message is from, so one person can play the whole group.
  const [sender, setSender] = useState("sam");
  const detection = useLive((s) => s.detection);
  const detecting = useLive((s) => s.detecting);
  // Huddle asked the group something in the chat; once someone has replied, it can continue.
  const phase = useLive((s) => s.phase);
  const askedAt = useLive((s) => s.askedAt);
  const waitingOnGroup = LIVE && phase === "needs_input";
  const groupReplied = waitingOnGroup && askedAt !== null && liveMessages.length > askedAt;
  const continuePlanning = async () => {
    const planId = useLive.getState().planId;
    if (!planId) return;
    const { vibes, budget, food, maxTravel, home } = usePreferences.getState();
    await useLive.getState().continuePlan({ vibes, budget, food, maxTravel, home });
    router.push({ pathname: "/plan/working", params: { plan: planId } });
  };
  // Live: Muse's own summary ("Nashville trip with Sam & Maya"), quoting the latest message.
  const lastMessage = LIVE ? liveMessages[liveMessages.length - 1] : undefined;
  const bannerTitle = LIVE && detection?.summary ? `Plan the ${detection.summary}?` : mockTitle;
  const bannerBody =
    LIVE && lastMessage ? `“${lastMessage.text}” — ${memberFor(lastMessage.from).name}` : mockBody;
  // MOCK: the stage demo (mocks/japanDemo.ts). Typing its first line plays the rest of the
  // group's script, then the banner; Plan it runs the fast Tokyo plan from dummy data.
  const [scripted, setScripted] = useState(false);
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => demoTimers.current.forEach(clearTimeout), []);
  // A new simulation (Home resets the live chat): start this screen over too.
  useEffect(() => {
    if (!LIVE || liveMessages.length > 0) return;
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setScripted(false);
    setBanner("hidden");
    arrived.current = false;
  }, [liveMessages.length]);
  const playDemo = () => {
    setScripted(true);
    let at = 0;
    for (const line of demoScript) {
      at += line.afterMs;
      demoTimers.current.push(
        setTimeout(() => useLive.getState().addMessage(line.text, line.from), at),
      );
    }
    demoTimers.current.push(
      setTimeout(() => setBanner((b) => (b === "hidden" ? "open" : b)), at + 1200),
    );
  };
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const instant = demo === "banner" || reduceMotion;

  const [shown, setShown] = useState(instant ? chat.length : 0);
  const [banner, setBanner] = useState<BannerState>(instant ? "open" : "hidden");
  const arrived = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);

  // Live mode: after the chat goes quiet for a moment, Huddle (Muse Spark) reads it. The
  // banner drops in only when it says this is turning into a plan, for any place.
  // Demo switch (Settings): with "Wait for your message" on, only your own message triggers it.
  const waitForYou = usePreferences((s) => s.waitForYou);
  const lastFrom = chat[chat.length - 1]?.from;
  useEffect(() => {
    if (!LIVE || scripted || chat.length === 0 || banner !== "hidden") return;
    if (waitForYou && lastFrom !== "you") return;
    const timer = setTimeout(async () => {
      const result = await useLive.getState().detect();
      if (result?.isPlan) setBanner((b) => (b === "hidden" ? "open" : b));
    }, DETECT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [chat.length, banner, waitForYou, lastFrom, scripted]);

  // Play the chat: one message every MESSAGE_GAP_MS, then the banner. (Mock demo only; in
  // live mode the chat is typed for real.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: replays once per visit; typed live messages show via `shown` below
  useEffect(() => {
    if (LIVE) return;
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
  }, [banner, bannerTitle, bannerBody]);

  // push keeps this screen under /plan/working, so Back returns to the finished chat with
  // the Review pill instead of the open banner (and nothing replays).
  const planIt = async () => {
    setBanner("dismissed");
    if (scripted) {
      const id = useLive.getState().runDemo();
      router.push({ pathname: "/plan/working", params: { plan: id } });
      return;
    }
    if (!LIVE) {
      router.push("/plan/working");
      return;
    }
    setStarting(true);
    setStartError(null);
    const { vibes, budget, food, maxTravel, home } = usePreferences.getState();
    const planId = await useLive.getState().start({ vibes, budget, food, maxTravel, home });
    setStarting(false);
    if (planId) router.push({ pathname: "/plan/working", params: { plan: planId } });
    else setStartError(useLive.getState().error ?? "Huddle couldn't start planning");
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    useLive.getState().addMessage(text, sender);
    setDraft("");
    if (LIVE && !scripted && isDemoTrigger(text)) playDemo();
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const typing = !LIVE && !instant && shown < chat.length ? chat[shown] : undefined;

  const visible = LIVE ? chat : chat.slice(0, shown);
  const firstTime = chat[0] ? clockTime(chat[0].at) : "";

  return (
    <View className="flex-1" style={{ backgroundColor: imessage.bg }}>
      {/* On iOS the keyboard slides over the screen; this lifts the chat and composer above it,
          like Messages. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          {/* Header, like iMessage: back pill with an unread badge, the group's name, video. */}
          <View className="flex-row items-center px-3 pb-2 pt-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              className="h-11 flex-row items-center gap-1.5 rounded-full pl-2.5 pr-3 active:opacity-70"
              style={{ backgroundColor: imessage.chrome }}
            >
              <CaretLeft size={22} color={imessage.text} weight="bold" />
              <View
                className="h-6 min-w-6 items-center justify-center rounded-full px-1.5"
                style={{ backgroundColor: imessage.text }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text
                  style={{
                    color: imessage.bg,
                    fontFamily: imessage.font,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  1
                </Text>
              </View>
            </Pressable>
            {/* Demo backup: long-press the name to bring Huddle up if detection ever misses. */}
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-0.5"
              onLongPress={() => LIVE && chat.length > 0 && setBanner("open")}
              delayLongPress={600}
              accessibilityHint={LIVE ? "Long press to ask Huddle to plan this chat" : undefined}
            >
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={{
                  color: imessage.text,
                  fontFamily: imessage.font,
                  fontWeight: "600",
                  fontSize: 17,
                }}
              >
                {brief.sourceChat.name}
              </Text>
              <CaretRight size={14} color={imessage.name} weight="bold" />
            </Pressable>
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: imessage.chrome }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <VideoCamera size={22} color={imessage.text} />
            </View>
          </View>

          <ScrollView
            ref={scroll}
            className="flex-1"
            contentContainerClassName="grow justify-end px-3 pb-3 pt-4"
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
            // Newest messages stay in view when the keyboard opens; dragging down closes it.
            onLayout={() => scroll.current?.scrollToEnd({ animated: false })}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <Text
              className="pb-1 text-center"
              style={{ color: imessage.name, fontFamily: imessage.font, fontSize: 12 }}
            >
              <Text style={{ fontWeight: "600" }}>Today</Text> {firstTime}
            </Text>

            {LIVE && visible.length === 0 ? (
              <Text
                className="px-8 pt-2 text-center"
                style={{
                  color: imessage.name,
                  fontFamily: imessage.font,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                Type as anyone in the group below. Huddle steps in when the chat turns into a plan.
              </Text>
            ) : null}

            {visible.map((m, i) => (
              <ChatBubble
                key={m.id}
                message={m}
                sender={memberFor(m.from)}
                first={visible[i - 1]?.from !== m.from}
                last={visible[i + 1]?.from !== m.from}
              />
            ))}

            {typing ? <TypingIndicator key={typing.id} member={memberFor(typing.from)} /> : null}

            {LIVE && detecting && banner === "hidden" ? (
              <Animated.View entering={fadeIn()} style={{ alignItems: "center", marginTop: 14 }}>
                <Text style={{ color: imessage.name, fontFamily: imessage.font, fontSize: 12 }}>
                  Huddle is reading the chat…
                </Text>
              </Animated.View>
            ) : null}

            {waitingOnGroup ? (
              <Animated.View entering={fadeIn()} style={{ alignItems: "center", marginTop: 16 }}>
                {groupReplied ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue planning with Huddle"
                    onPress={continuePlanning}
                    className="min-h-12 flex-row items-center rounded-full bg-accent px-5 active:opacity-80"
                  >
                    <Text className="font-body-semibold text-label text-bg">
                      Continue planning with Huddle
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: imessage.name, fontFamily: imessage.font, fontSize: 12 }}>
                    Huddle is waiting for the group…
                  </Text>
                )}
              </Animated.View>
            ) : banner === "dismissed" ? (
              <Animated.View entering={fadeIn()} style={{ alignItems: "center", marginTop: 16 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Huddle spotted a plan. Review it."
                  onPress={() => setBanner("open")}
                  className="min-h-12 flex-row items-center rounded-full border border-line bg-surface px-5 active:bg-raised"
                >
                  <Text className="font-body-semibold text-label text-ink">
                    {starting ? (
                      "Starting Huddle…"
                    ) : (
                      <>
                        Huddle spotted a plan · <Text className="text-accent">Review</Text>
                      </>
                    )}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </ScrollView>

          {/* Composer, like iMessage: the + button and the "iMessage" pill. In live mode it sends
            into the chat; otherwise it's just the look. */}
          <View className="gap-2 px-3 pb-2 pt-1">
            {LIVE && startError ? (
              <Text
                className="text-center"
                style={{ color: colors.bad, fontFamily: imessage.font, fontSize: 13 }}
              >
                {startError}
              </Text>
            ) : null}
            {LIVE ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="items-center gap-1.5"
                accessibilityRole="radiogroup"
                accessibilityLabel="Send as"
              >
                <Text style={{ color: imessage.name, fontFamily: imessage.font, fontSize: 12 }}>
                  From
                </Text>
                {members.map((m) => {
                  const active = m.id === sender;
                  return (
                    <Pressable
                      key={m.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={m.isYou ? "You" : m.name}
                      onPress={() => setSender(m.id)}
                      className="h-8 flex-row items-center gap-1 rounded-full pl-0.5 pr-2.5"
                      style={{
                        backgroundColor: active ? imessage.chrome : "transparent",
                        borderWidth: 1,
                        borderColor: active ? imessage.name : "transparent",
                      }}
                    >
                      <Monogram name={m.isYou ? "You" : m.name} size={26} />
                      <Text
                        style={{
                          color: active ? imessage.text : imessage.name,
                          fontFamily: imessage.font,
                          fontSize: 13,
                        }}
                      >
                        {m.isYou ? "You" : m.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            <View className="flex-row items-end gap-2">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: imessage.chrome }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Plus size={20} color={imessage.text} weight="bold" />
              </View>
              <View
                className="min-h-10 flex-1 flex-row items-center rounded-full border pl-4 pr-1"
                style={{ borderColor: imessage.line }}
              >
                {LIVE ? (
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    onSubmitEditing={send}
                    placeholder="iMessage"
                    placeholderTextColor={imessage.name}
                    accessibilityLabel={`Message ${brief.sourceChat.name}`}
                    returnKeyType="send"
                    className="h-10 flex-1"
                    style={[
                      { color: imessage.text, fontFamily: imessage.font, fontSize: 17 },
                      // Web only: no browser focus ring; iMessage's field has none.
                      Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
                    ]}
                  />
                ) : (
                  <Text
                    className="flex-1"
                    style={{ color: imessage.name, fontFamily: imessage.font, fontSize: 17 }}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    iMessage
                  </Text>
                )}
                {LIVE && draft.trim() ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send"
                    onPress={send}
                    className="h-8 w-8 items-center justify-center rounded-full active:opacity-80"
                    style={{ backgroundColor: imessage.sent }}
                  >
                    <ArrowUp size={18} color={imessage.text} weight="bold" />
                  </Pressable>
                ) : (
                  <View className="h-8 w-8 items-center justify-center">
                    <Waveform size={22} color={imessage.name} />
                  </View>
                )}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {banner === "open" ? (
        <PlanBanner
          title={scripted ? demoBanner.title : bannerTitle}
          body={scripted ? demoBanner.body : bannerBody}
          members={friends}
          onPlan={planIt}
          onDismiss={() => setBanner("dismissed")}
        />
      ) : null}
    </View>
  );
}
