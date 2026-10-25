import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Info, MapTrifold, PaperPlaneTilt } from "phosphor-react-native";
import { type ComponentRef, useMemo, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { BudgetLine, DaySection, StaySection } from "@/components/booked/DayPlan";
import { buildItinerary, summaryText } from "@/components/booked/itinerary";
import { Reveal } from "@/components/booked/Reveal";
import { FRAME_HEIGHT, FRAME_WIDTH, ShareCard } from "@/components/booked/ShareCard";
import {
  type ShareResult,
  shareCard,
  shareText,
  textActionIcon,
  textActionLabel,
} from "@/components/booked/share";
import { gasPerPerson, planLegs } from "@/components/route/legs";
import { Body, Button, Caption, Display, Muted, Screen, Title } from "@/components/ui";
import type { Trip } from "@/mocks/types";
import { isDriving, useDestination, usePlan } from "@/store/plan";
import { colors } from "@/theme";
import { stagger } from "@/theme/motion";

// Only say "Sent" when the platform confirms it (web share). Android's share sheet can't tell
// us whether anything was sent, so it gets a neutral line.
const statusFor = (trip: Trip): Record<ShareResult, string | null> => ({
  shared: `Sent. See you in ${trip.destination.city}.`,
  opened: `Share sheet opened. Pick ${trip.sourceChat.name} to send it.`,
  textFallback: "Couldn't make the image, so the text summary opened instead.",
  copied: `Copied. Paste it in ${trip.sourceChat.name}.`,
  cancelled: null,
  failed: "Couldn't share from here. Try again.",
});

// Step 8 of the demo: the (mocked) booking confirmation plus a share card to send back to the
// group chat, for the city the group picked.
// Nothing is booked before the group picks a city, so a direct link sends you to the picker.
export default function BookedRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const chosen = usePlan((s) => s.destinationId);
  if (!chosen && !demo) return <Redirect href="/plan/destinations" />;
  return <Booked />;
}

function Booked() {
  // MOCK: demo-only screenshot states, ?demo=plan (the leading idea's default plan, as if the
  // group picked it), ?demo=card (share card alone) and ?demo=empty (no picks). Not behind
  // __DEV__ because PR screenshots come from the production web export. Nothing in the app
  // links to them.
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const { trip, flights, places } = useDestination();
  const storePicks = usePlan((s) => s.picks);
  const picks = demo === "empty" ? [] : storePicks;
  // "Drive" swaps the flight for split gas, the same numbers the map footer uses.
  const driving = isDriving(usePlan((s) => s.answers));
  const itinerary = useMemo(() => {
    const drive = driving
      ? { gasPerPerson: gasPerPerson(planLegs(trip, flights, picks, true)) }
      : undefined;
    return buildItinerary(picks, trip, flights, places, drive);
  }, [picks, driving, trip, flights, places]);
  const text = useMemo(() => summaryText(trip, itinerary), [trip, itinerary]);
  const STATUS = statusFor(trip);

  const card = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  // Shrink the preview on narrow phones; the capture still uses the frame's own fixed size.
  const scale = Math.min(1, (width - 24) / FRAME_WIDTH);

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

  const TextIcon = textActionIcon;

  return (
    <Screen
      scroll
      className="gap-8"
      footer={<Button label="Done" variant="secondary" onPress={() => router.replace("/")} />}
    >
      {/* The share card is the confirmation: the ticket the group gets. Fading in, top to
          bottom, is this screen's one motion (DESIGN.md "Motion"). */}
      <View className="gap-5 pt-4">
        <Reveal delay={0} className="gap-1">
          <Display accessibilityRole="header">You're going to {trip.destination.city}</Display>
          <Muted numeric>
            {trip.dates.label} · {trip.members.length} of you
          </Muted>
        </Reveal>

        <Reveal delay={stagger(1)}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Share card preview. ${text}`}
            className="self-center"
            style={{ width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }}
          >
            <View style={{ transform: [{ scale }], transformOrigin: "top left" }}>
              <ShareCard ref={card} trip={trip} itinerary={itinerary} />
            </View>
          </View>
        </Reveal>

        <Reveal delay={stagger(2)} className="gap-3">
          <Button
            label={`Send to ${trip.sourceChat.name}`}
            icon={<PaperPlaneTilt size={20} color={colors.bg} weight="fill" />}
            loading={busy}
            onPress={() => run(() => shareCard(card, text))}
          />
          <Button
            label={textActionLabel}
            variant="secondary"
            icon={<TextIcon size={20} color={colors.ink} />}
            disabled={busy}
            onPress={() => run(() => shareText(text))}
          />
          <Muted
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
            className="min-h-5 text-center"
          >
            {status ?? ""}
          </Muted>
          {/* MOCK: booking is simulated (CLAUDE.md "Real vs. mocked"). Said plainly, as a
              footnote. */}
          <View className="flex-row items-center justify-center gap-1.5">
            <Info size={16} color={colors.faint} />
            <Caption>Demo booking: nothing was charged</Caption>
          </View>
        </Reveal>
      </View>

      <Reveal delay={stagger(3)} className="gap-6">
        <View className="gap-1">
          <Title accessibilityRole="header">Your weekend</Title>
          <BudgetLine itinerary={itinerary} trip={trip} />
          {itinerary.notes.map((note) => (
            <View key={note} className="flex-row items-start gap-2 pt-1">
              <Info size={16} color={colors.gold} />
              <Muted className="flex-1">{note}</Muted>
            </View>
          ))}
        </View>
        {itinerary.stays.length ? <StaySection stays={itinerary.stays} trip={trip} /> : null}
        {itinerary.days.map((day) => (
          <DaySection key={day.key} day={day} trip={trip} />
        ))}
      </Reveal>
    </Screen>
  );
}

function Empty() {
  return (
    <Screen className="items-center justify-center gap-3 pb-10">
      <Title accessibilityRole="header" className="text-center">
        Nothing in the plan yet
      </Title>
      <Body className="text-center text-muted">
        Pick a flight, a place to stay, and a few things to do on the map, and Huddle builds the
        plan.
      </Body>
      <Button
        label="Back to the map"
        className="mt-3 self-stretch"
        icon={<MapTrifold size={20} color={colors.bg} />}
        onPress={() => router.replace("/plan/map")}
      />
    </Screen>
  );
}
