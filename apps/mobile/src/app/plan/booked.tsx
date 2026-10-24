import { router, useLocalSearchParams } from "expo-router";
import { Copy, Info, MapTrifold, PaperPlaneTilt, SealCheck } from "phosphor-react-native";
import { type ComponentRef, useMemo, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Confetti } from "@/components/booked/Confetti";
import { BudgetCard, DayCard, StayCard } from "@/components/booked/DayPlan";
import { buildItinerary, summaryText } from "@/components/booked/itinerary";
import { Reveal } from "@/components/booked/Reveal";
import { CARD_HEIGHT, CARD_WIDTH, ShareCard } from "@/components/booked/ShareCard";
import { type ShareResult, shareCard, shareText, textActionLabel } from "@/components/booked/share";
import { AvatarStack, Body, Button, Label, Muted, Screen, Title } from "@/components/ui";
import { flights, places, trip } from "@/mocks";
import { usePlan } from "@/store/plan";
import { colors } from "@/theme";

const STATUS: Record<ShareResult, string | null> = {
  shared: "Sent. See you in Denver.",
  copied: `Copied. Paste it in ${trip.sourceChat.name}.`,
  cancelled: null,
  failed: "Couldn't share from here. Try again.",
};

// Step 8 of the demo: the (mocked) booking confirmation plus a share card to send back to the
// group chat. Screenshot-only states: ?demo=card (share card alone), ?demo=empty (no picks).
export default function Booked() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const storePicks = usePlan((s) => s.picks);
  const picks = demo === "empty" ? [] : storePicks;
  const itinerary = useMemo(() => buildItinerary(picks, trip, flights, places), [picks]);
  const text = useMemo(() => summaryText(trip, itinerary), [itinerary]);

  const card = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  // Shrink the preview on narrow phones; the capture still uses the card's own fixed size.
  const scale = Math.min(1, (width - 40) / CARD_WIDTH);

  if (itinerary.empty) return <Empty />;

  if (demo === "card") {
    return (
      <Screen className="items-center justify-center">
        <ShareCard ref={card} trip={trip} itinerary={itinerary} />
      </Screen>
    );
  }

  const run = async (action: () => Promise<ShareResult>) => {
    setBusy(true);
    setStatus(null);
    try {
      setStatus(STATUS[await action()]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      footer={<Button label="Done" variant="secondary" onPress={() => router.replace("/")} />}
    >
      <View className="items-center gap-4 pt-6">
        <View className="h-24 w-24 items-center justify-center">
          <Confetti />
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <View className="h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent-soft">
              <SealCheck size={44} color={colors.accent} weight="fill" />
            </View>
          </Animated.View>
        </View>
        <Reveal delay={150} className="items-center gap-2">
          <Label>Booked</Label>
          <Title className="text-center text-4xl leading-[44px]">
            You're going to {trip.destination.city}
          </Title>
          <Muted className="text-center">
            {trip.dates.label} · {trip.members.length} of you
          </Muted>
          <View className="pt-1">
            <AvatarStack members={trip.members} max={5} />
          </View>
        </Reveal>
      </View>

      <Reveal delay={300} className="gap-3">
        <BudgetCard itinerary={itinerary} trip={trip} />
        {/* MOCK: booking is simulated (CLAUDE.md "Real vs. mocked"). */}
        <View className="flex-row items-center justify-center gap-1.5">
          <Info size={14} color={colors.faint} />
          <Muted className="text-xs text-faint">Demo booking: nothing was charged</Muted>
        </View>
      </Reveal>

      <Reveal delay={420} className="gap-3">
        <Label>Your weekend</Label>
        {itinerary.stays.length ? <StayCard stays={itinerary.stays} trip={trip} /> : null}
        {itinerary.days.map((day) => (
          <DayCard key={day.key} day={day} trip={trip} />
        ))}
      </Reveal>

      <Reveal delay={540} className="gap-3">
        <Label>Send it to {trip.sourceChat.name}</Label>
        <View
          className="self-center"
          style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}
        >
          <View style={{ transform: [{ scale }], transformOrigin: "top left" }}>
            <ShareCard ref={card} trip={trip} itinerary={itinerary} />
          </View>
        </View>
        <Button
          label={`Send to ${trip.sourceChat.name}`}
          icon={<PaperPlaneTilt size={20} color={colors.bg} weight="fill" />}
          loading={busy}
          onPress={() => run(() => shareCard(card, text))}
        />
        <Button
          label={textActionLabel}
          variant="secondary"
          icon={<Copy size={20} color={colors.ink} />}
          disabled={busy}
          onPress={() => run(() => shareText(text))}
        />
        {status ? <Muted className="text-center">{status}</Muted> : null}
      </Reveal>
    </Screen>
  );
}

function Empty() {
  return (
    <Screen className="items-center justify-center gap-4 pb-10">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-raised">
        <MapTrifold size={36} color={colors.accent} />
      </View>
      <Title className="text-center">Nothing to book yet</Title>
      <Body className="text-center text-muted">
        Add a flight, a place to stay, and something to do from the map. Huddle books the plan here.
      </Body>
      <Button
        label="Back to the map"
        className="self-stretch"
        icon={<MapTrifold size={20} color={colors.bg} />}
        onPress={() => router.replace("/plan/map")}
      />
    </Screen>
  );
}
