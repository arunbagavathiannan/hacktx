// Real booking options for chosen flights and hotels, from SerpAPI. `book` calls these when the
// group taps Book, so the confirmation links to where you actually book (and picks the cheapest
// seller). Huddle never pays or books on anyone's behalf.

import type { SerpapiFlight } from "../mocks/serpapi-flights.ts";
import { hasSerpapiKey, serpapi } from "../serpapi.ts";
import type { BookingOffer, StoredOption } from "./types.ts";

interface FlightBookingOption {
  book_with?: string;
  price?: number;
  booking_request?: { url: string; post_data: string };
  booking_phone?: string;
}

interface FlightBookingResponse {
  best_flights?: SerpapiFlight[];
  other_flights?: SerpapiFlight[];
  booking_options?: {
    separate_tickets?: boolean;
    together?: FlightBookingOption;
  }[];
}

interface HotelPrice {
  source?: string;
  link?: string;
  official?: boolean;
  rate_per_night?: { extracted_lowest?: number };
  total_rate?: { extracted_lowest?: number };
}

interface HotelDetailsResponse {
  prices?: HotelPrice[];
  featured_prices?: HotelPrice[];
}

const MAX_OFFERS = 5;

// The cheapest few, plus the official seller (airline or hotel site) if it didn't make the cut,
// so the confirmation shows a short, trustworthy list.
function topOffers(offers: BookingOffer[]): BookingOffer[] {
  const sorted = [...offers].sort((a, b) => a.priceCents - b.priceCents);
  const top = sorted.slice(0, MAX_OFFERS);
  const official = sorted.find((o) => o.official);
  if (official && !top.includes(official)) top.push(official);
  return top;
}

const nights = (checkIn: string, checkOut: string) =>
  Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));

// Round trip: the outbound result's departure_token lists return flights; the cheapest one's
// booking_token lists the sellers (2 searches). A booking_token on the result skips step one.
export async function flightOffers(option: StoredOption): Promise<BookingOffer[]> {
  const d = option.details;
  let bookingToken = typeof d.booking_token === "string" ? d.booking_token : undefined;
  if (!bookingToken && typeof d.departure_token === "string") {
    const returns = await serpapi<FlightBookingResponse>("google_flights", {
      departure_token: d.departure_token,
      // SerpAPI wants the route again alongside the token.
      departure_id: d.departure_id as string,
      arrival_id: d.arrival_id as string,
      type: 1,
      outbound_date: d.outbound_date as string,
      return_date: d.return_date as string,
      currency: "USD",
    });
    const cheapest = [...(returns.best_flights ?? []), ...(returns.other_flights ?? [])]
      .filter((f) => f.booking_token)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
    bookingToken = cheapest?.booking_token;
  }
  if (!bookingToken) {
    console.warn(`no booking_token for ${option.ref}; no flight offers`);
    return [];
  }

  const res = await serpapi<FlightBookingResponse>("google_flights", {
    booking_token: bookingToken,
    currency: "USD",
  });
  const offers = (res.booking_options ?? [])
    .map((o) => o.together)
    .filter((t): t is FlightBookingOption => t?.price !== undefined && Boolean(t.book_with))
    .map((t) => ({
      ref: option.ref,
      seller: t.book_with ?? "",
      priceCents: Math.round((t.price ?? 0) * 100),
      phone: t.booking_phone,
      official: option.title.startsWith(`${t.book_with} `),
      bookingRequest: t.booking_request,
    }));
  return topOffers(offers);
}

// Hotel property details: every site selling the room, with a direct link (1 search).
export async function hotelOffers(option: StoredOption): Promise<BookingOffer[]> {
  const d = option.details;
  if (typeof d.property_token !== "string") return [];
  const checkIn = d.check_in_date as string;
  const checkOut = d.check_out_date as string;

  const res = await serpapi<HotelDetailsResponse>("google_hotels", {
    property_token: d.property_token,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults: typeof d.adults === "number" ? d.adults : 2,
    currency: "USD",
  });

  const seen = new Set<string>();
  const offers = [...(res.featured_prices ?? []), ...(res.prices ?? [])]
    .map((p) => {
      const total =
        p.total_rate?.extracted_lowest ??
        (p.rate_per_night?.extracted_lowest ?? 0) * nights(checkIn, checkOut);
      return {
        ref: option.ref,
        seller: p.source ?? "",
        priceCents: Math.round(total * 100),
        url: p.link,
        official: p.official,
      };
    })
    .filter((o) => o.seller && o.priceCents > 0 && !seen.has(o.seller) && seen.add(o.seller));
  return topOffers(offers);
}

// Live offers for every chosen flight and hotel, in parallel. One failing lookup doesn't stop
// the others; without a SerpAPI key this returns nothing and book uses the searched prices.
export async function liveOffers(options: StoredOption[]): Promise<BookingOffer[]> {
  if (!hasSerpapiKey()) return [];
  const lookups = options.map((o) =>
    o.category === "flight" ? flightOffers(o) : o.category === "hotel" ? hotelOffers(o) : [],
  );
  const results = await Promise.allSettled(lookups);
  return results.flatMap((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`booking offers for ${options[i].ref} failed`, r.reason);
    return [];
  });
}
