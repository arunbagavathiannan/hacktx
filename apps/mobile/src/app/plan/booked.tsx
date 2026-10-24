import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Copy, Info, PaperPlaneTilt } from "phosphor-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CardShot } from "@/components/booked/CardShot";
import type { CardShotHandle } from "@/components/booked/CardShot.types";
import { Celebration } from "@/components/booked/Celebration";
import { PlanList } from "@/components/booked/PlanList";
import { shareText, summarize } from "@/components/booked/plan";
import { ShareCard } from "@/components/booked/ShareCard";
import { copyPlanText, type ShareResult, sendPlan } from "@/components/booked/share";
import { Toast, type ToastState } from "@/components/booked/Toast";
import { Button, Label, Muted, Screen, Title } from "@/components/ui";
import { trip } from "@/mocks";
import { booking } from "@/mocks/booked";
import { usePlan } from "@/store/plan";
import { colors } from "@/theme";

// Reanimated views ignore NativeWind className, so animated wrappers use inline styles.
// Step 5: the plan is "booked" (mocked) and the user sends a share card back to the chat.
// Dev: /plan/booked?demo=share opens scrolled to the share card (for PR screenshots).
export default function Booked() {
  const picks = usePlan((s) => s.picks);
  const summary = useMemo(() => summarize(picks), [picks]);
  const text = useMemo(() => shareText(summary), [summary]);

  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const scroll = useRef<ScrollViewInstance>(null);
  const shot = useRef<CardShotHandle>(null);
  const [cardY, setCardY] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  useEffect(() => {
    if (demo === "share" && cardY !== null) {
      scroll.current?.scrollTo({ y: cardY - 8, animated: false });
    }
  }, [demo, cardY]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const chat = trip.sourceChat.name;

  const report = (r: ShareResult, failed: string) => {
    if (r === "copied") setToast({ message: `Copied. Paste it in ${chat}`, tone: "good" });
    if (r === "failed") setToast({ message: failed, tone: "bad" });
  };

  const send = async () => {
    setSending(true);
    try {
      const capture = () => shot.current?.capture() ?? Promise.resolve(null);
      report(await sendPlan(capture, text), "Couldn't open sharing. Try again");
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      className="gap-0 px-0 pt-0"
      footer={
        <View className="flex-row gap-3">
          <Button label="Done" variant="secondary" onPress={() => router.replace("/")} />
          <Button
            label={`Send to ${chat}`}
            className="flex-1"
            loading={sending}
            onPress={send}
            icon={<PaperPlaneTilt size={20} color={colors.bg} weight="regular" />}
          />
        </View>
      }
    >
      <ScrollView ref={scroll} contentContainerClassName="gap-7 px-5 pb-10 pt-2">
        <View className="items-center gap-2">
          <Celebration />
          <Animated.View
            entering={FadeInDown.delay(250).duration(450)}
            style={{ alignItems: "center" }}
          >
            <Label className="text-accent">Booked</Label>
            <Title className="mt-1 text-center text-4xl leading-[44px]">
              You're going to {trip.destination.city}
            </Title>
            <Muted className="mt-2 text-center text-base">
              {trip.dates.label} · {trip.members.length} of you from {chat}
            </Muted>
            <View className="mt-4 flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5">
              <Info size={14} color={colors.faint} weight="regular" />
              <Text className="font-body text-xs text-faint">
                Booking simulated for the demo · ref {booking.confirmation}
              </Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(400).duration(450)} style={{ gap: 12 }}>
          <Label>What's in the plan</Label>
          <PlanList summary={summary} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(550).duration(450)}
          style={{ gap: 12 }}
          onLayout={(e) => setCardY(e.nativeEvent.layout.y)}
        >
          <View className="gap-1">
            <Label>Share card</Label>
            <Muted>Send it back to {chat} so everyone has the plan.</Muted>
          </View>
          <CardShot ref={shot}>
            <ShareCard summary={summary} />
          </CardShot>
          <Button
            // No expo-clipboard yet, so native opens the text share sheet (which has Copy).
            label={Platform.OS === "web" ? "Copy text" : "Share as text"}
            variant="ghost"
            onPress={async () => report(await copyPlanText(text), "Couldn't copy the text")}
            icon={<Copy size={18} color={colors.muted} weight="regular" />}
          />
        </Animated.View>
      </ScrollView>
      <Toast toast={toast} />
    </Screen>
  );
}
