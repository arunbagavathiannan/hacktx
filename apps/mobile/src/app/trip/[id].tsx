import { useLocalSearchParams } from "expo-router";
import { ArrowSquareOut, Info } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, useWindowDimensions, View } from "react-native";
import { Alternatives } from "@/components/booked/Alternatives";
import { BudgetLine, DaySection, StaySection } from "@/components/booked/DayPlan";
import { buildItinerary } from "@/components/booked/itinerary";
import { PeopleSection } from "@/components/booked/PeopleSection";
import { Reveal } from "@/components/booked/Reveal";
import { FRAME_HEIGHT, FRAME_WIDTH, ShareCard } from "@/components/booked/ShareCard";
import { Body, Caption, Display, Muted, Screen, Skeleton, Title } from "@/components/ui";
import { type LiveOffer, loadSharedPlan } from "@/lib/live";
import { offerEach } from "@/lib/pricing";
import type { DestinationSuggestion } from "@/mocks/types";
import { defaultPicksFor, togglePlace, withFlight } from "@/store/plan";
import { colors } from "@/theme";
import { stagger } from "@/theme/motion";

// Bigger than the booked screen's preview: this page is the plan, not a thumbnail of it.
const MAX_CARD_WIDTH = 520;

type Loaded = {
  destination: DestinationSuggestion;
  confirmationCode?: string;
  offers: LiveOffer[];
};

// The link the group gets from "Send to hackers": /trip/<plan id>?picks=<option ids>. Opens
// the whole plan (ticket, stay, day by day, where to book) for anyone with the link. It only
// reads the database; no agent or API calls, so opening it never spends credits.
export default function SharedTrip() {
  const { id, picks: picksParam } = useLocalSearchParams<{ id: string; picks?: string }>();
  const [plan, setPlan] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadSharedPlan(id)
      .then(setPlan)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (error) {
    return (
      <Screen className="items-center justify-center gap-3 pb-10">
        <Title accessibilityRole="header" className="text-center">
          Couldn't open this plan
        </Title>
        <Muted className="text-center">The link may be old, or the plan was deleted.</Muted>
      </Screen>
    );
  }
  if (!plan) return <Loading />;
  return <Plan plan={plan} picksParam={picksParam} />;
}

function Plan({ plan, picksParam }: { plan: Loaded; picksParam?: string }) {
  const { destination, confirmationCode, offers } = plan;
  const { trip, flights, places } = destination;
  const { width } = useWindowDimensions();
  // The sender's picks ride in the link; without them, the plan's default picks. Whoever opens
  // the link can try other options here (local only; it doesn't change the group's plan).
  const linkPicks = useMemo(() => {
    const known = new Set([...flights.map((f) => f.id), ...places.map((p) => p.id)]);
    const fromLink = (picksParam ?? "")
      .split(",")
      .map(decodeURIComponent)
      .filter((p) => known.has(p));
    return fromLink.length ? fromLink : defaultPicksFor(destination);
  }, [picksParam, flights, places, destination]);
  const [picks, setPicks] = useState(linkPicks);
  const itinerary = useMemo(
    () => buildItinerary(picks, trip, flights, places),
    [picks, trip, flights, places],
  );

  const cardWidth = Math.min(width - 32, MAX_CARD_WIDTH);
  const scale = cardWidth / FRAME_WIDTH;
  const items = [...new Set(offers.map((o) => o.item))];

  return (
    <Screen scroll className="gap-8 pb-12">
      <View className="gap-5 pt-4">
        <Reveal delay={0} className="gap-1">
          <Display accessibilityRole="header">{trip.destination.city}</Display>
          <Muted numeric>
            {trip.dates.label} · {trip.members.length} going · from {trip.sourceChat.name}
          </Muted>
          {confirmationCode ? (
            <Caption numeric className="text-muted">
              Confirmation {confirmationCode}
            </Caption>
          ) : null}
        </Reveal>

        <Reveal delay={stagger(1)}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${trip.destination.city} plan ticket`}
            className="self-center"
            style={{ width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }}
          >
            <View style={{ transform: [{ scale }], transformOrigin: "top left" }}>
              <ShareCard trip={trip} itinerary={itinerary} />
            </View>
          </View>
        </Reveal>
      </View>

      <Reveal delay={stagger(2)} className="gap-6">
        <View className="gap-1">
          <Title accessibilityRole="header">
            {trip.individuals?.length ? "The group" : "The plan"}
          </Title>
          <BudgetLine itinerary={itinerary} trip={trip} />
          {trip.why ? <Muted>{trip.why}</Muted> : null}
          {itinerary.notes.map((note) => (
            <View key={note} className="flex-row items-start gap-2 pt-1">
              <Info size={16} color={colors.gold} />
              <Muted className="flex-1">{note}</Muted>
            </View>
          ))}
        </View>
        <PeopleSection trip={trip} />
        {itinerary.stays.length ? <StaySection stays={itinerary.stays} trip={trip} /> : null}
        {itinerary.days.map((day) => (
          <DaySection key={day.key} day={day} trip={trip} />
        ))}
        <Alternatives
          trip={trip}
          flights={flights}
          places={places}
          picks={picks}
          onSwitch={(id, among) => setPicks((p) => withFlight(p, id, among))}
          onToggle={(id) =>
            setPicks((p) =>
              flights.some((f) => f.id === id)
                ? withFlight(
                    p,
                    id,
                    flights.map((f) => f.id),
                  )
                : togglePlace(p, id),
            )
          }
        />
      </Reveal>

      {items.length ? (
        <Reveal delay={stagger(3)} className="gap-3">
          <Title accessibilityRole="header">Where to book</Title>
          <View className="gap-3 rounded-card bg-surface p-4">
            {items.map((item) => (
              <View key={item} className="gap-1">
                <Caption className="text-muted">{item}</Caption>
                {offers
                  .filter((o) => o.item === item)
                  .slice(0, 3)
                  .map((o) => (
                    <Pressable
                      key={`${item}-${o.seller}`}
                      accessibilityRole="link"
                      accessibilityLabel={`Book ${item} on ${o.seller}, $${offerEach(o, trip)} each`}
                      disabled={!o.url}
                      onPress={() => o.url && Linking.openURL(o.url)}
                      className="min-h-11 flex-row items-center justify-between rounded-lg px-2 active:bg-raised"
                    >
                      <Body className="flex-1">
                        {o.seller}
                        {o.official ? " · official" : ""}
                      </Body>
                      <Body numeric className="text-ink">
                        ${offerEach(o, trip)} each
                      </Body>
                      {o.url ? (
                        <ArrowSquareOut size={16} color={colors.muted} style={{ marginLeft: 8 }} />
                      ) : null}
                    </Pressable>
                  ))}
              </View>
            ))}
          </View>
        </Reveal>
      ) : null}

      <View className="flex-row items-center justify-center gap-1.5">
        <Info size={16} color={colors.faint} />
        <Caption>Planned with Huddle · nothing is charged until you book</Caption>
      </View>
    </Screen>
  );
}

// Same shape as the page, so it doesn't jump when the plan arrives.
function Loading() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, MAX_CARD_WIDTH);
  return (
    <Screen className="gap-5 pt-6">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-4 w-56" />
      <View
        accessibilityLabel="Loading the plan"
        className="self-center"
        style={{ width: cardWidth, height: (cardWidth * FRAME_HEIGHT) / FRAME_WIDTH }}
      >
        <Skeleton className="h-full w-full rounded-card" />
      </View>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-20 w-full" />
    </Screen>
  );
}
