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

export type Trip = {
  id: string;
  title: string;
  destination: { city: string; region: string; lat: number; lng: number };
  origin: { city: string; airport: string; lat: number; lng: number };
  dates: { start: string; end: string; label: string };
  budgetPerPerson: number;
  members: Member[];
  sourceChat: { app: ChatMessage["app"]; name: string };
  why: string; // one line the agent extracted, e.g. "Red Rocks show on the 15th"
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
    | "search_flights"
    | "search_hotels"
    | "search_places"
    | "pin_on_map"
    | "verify"
    | "ask_user";
  label: string; // "Searching flights AUS → DEN"
  detail: string; // "Found 14 flights, best $142"
  durationMs: number; // how long the mock playback shows it running
};

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
