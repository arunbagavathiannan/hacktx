// Shapes shared by mock data now and real Supabase/agent data later.
// Keep field names aligned with the agent tools in supabase/functions/_shared/tools/.

export type Member = {
  id: string;
  name: string;
  color: string; // avatar background
  isYou?: boolean;
};

export type ChatMessage = {
  id: string;
  app: "whatsapp" | "instagram";
  chat: string;
  from: string; // Member.id
  text: string;
  at: string; // ISO time
};

// A city the group stays in, in visiting order (the origin is not a stop).
export type TripStop = {
  city: string;
  region: string;
  lat: number;
  lng: number;
  airport?: string; // "DEN"
  arrive: string; // ISO date
  depart: string; // ISO date
};

// One hop of the route, by city name: origin -> stops... -> origin.
export type TripLeg = {
  from: string; // city
  to: string; // city
  mode: "fly" | "drive";
  // Flight options for this leg (Flight.id). A "fly" leg without them is covered by an
  // earlier round-trip fare (the flight home on a one-city trip).
  flightIds?: string[];
  driveMiles?: number; // used when the group drives this leg
  driveHours?: number;
};

export type Trip = {
  id: string;
  title: string;
  // The first stop, kept for screens that only know one destination.
  destination: { city: string; region: string; lat: number; lng: number };
  origin: { city: string; airport: string; lat: number; lng: number };
  stops: TripStop[];
  legs: TripLeg[];
  dates: { start: string; end: string; label: string };
  budgetPerPerson: number;
  members: Member[];
  sourceChat: { app: ChatMessage["app"]; name: string };
  why: string; // one line the agent extracted, e.g. "Red Rocks show on the 15th"
};

// What Huddle knows from the chat before the group picks a city: who, when, budget, and
// where everyone leaves from. Each destination option turns it into a full Trip.
export type TripBrief = Pick<
  Trip,
  "origin" | "dates" | "budgetPerPerson" | "members" | "sourceChat"
> & {
  title: string; // "Trip before finals"
  why: string; // what the group asked for, e.g. "Live music, under $400 each"
};

// A city the planner suggests (suggest_destinations) before the group picks one. Carries the
// whole one-city dataset, so every screen after the pick works for it.
export type DestinationSuggestion = {
  id: string; // "den"
  city: string;
  region: string;
  airport: string; // "DEN"
  lat: number;
  lng: number;
  match: number; // 0-100 fit, hand-set in the mock (nothing computes it yet), so not shown
  why: string; // the signal behind the suggestion, in a few words: "Red Rocks show Sun"
  flightTime: string; // nonstop flight time from the origin: "2h 15m"
  votes: string[]; // Member.id, friends who voted for this idea
  headlinePlaceId: string; // the show/spot that makes the case, always in the default plan
  trip: Trip;
  flights: Flight[]; // round-trip fares from the origin
  places: Place[]; // hotels, food, activities, nightlife
};

export type PlaceCategory = "hotel" | "food" | "activity" | "nightlife";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  rating: number; // 0-5
  reviews: number;
  price: string; // display text: "$$" or "$189/night"
  // Hotels only: structured numbers for pricing (src/lib/pricing.ts). Real data comes
  // from SerpAPI Google Hotels.
  nightlyRate?: number; // per room, per night
  sleepsPerRoom?: number; // max guests per room
  address: string;
  hours?: string;
  blurb: string;
  distanceLabel: string; // "8 min from hotel"
  pickedBy: string[]; // Member.id
  source: "google_places" | "serpapi_hotels";
};

export type Flight = {
  id: string;
  airline: string;
  depart: string; // "Fri 7:05 AM"
  arrive: string;
  duration: string;
  stops: number;
  pricePerPerson: number;
  pickedBy: string[];
  source: "serpapi_flights";
};

export type AgentStepStatus = "pending" | "running" | "done" | "failed";

export type AgentStep = {
  id: string;
  tool:
    | "extract_trip"
    | "apply_preferences"
    | "suggest_destinations"
    | "search_flights"
    | "search_hotels"
    | "search_places"
    | "pin_on_map"
    | "create_poll"
    | "tally_votes"
    | "verify"
    | "ask_user"
    | "book";
  label: string; // "Searching flights AUS → DEN"
  detail: string; // "Found 14 flights, best $142"
  durationMs: number; // how long the mock playback shows it running
  // Per-option results shown under the detail once the step is done, e.g. one row per
  // destination idea: { label: "Denver", value: "$142", note: "Southwest · 2h 15m" }.
  results?: AgentStepResult[];
};

export type AgentStepResult = { label: string; value?: string; note?: string };

export type Clarification = {
  id: string;
  question: string;
  options: string[];
  reason: string; // why the agent is asking
};

export type Preferences = {
  vibes: string[];
  budget: "$" | "$$" | "$$$" | null;
  food: string[];
  maxTravel: string | null;
};
