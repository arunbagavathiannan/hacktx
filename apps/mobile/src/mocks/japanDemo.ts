import type { BookingResult, OptionRow, PlanRow, StepRow } from "@/lib/live";

// MOCK: the stage demo. Typing DEMO_TRIGGER in the live chat plays the rest of the group's
// script, then a fast Tokyo plan built from this dummy data (no Muse Spark or SerpAPI calls),
// so the whole flow fits the 3-minute demo. Any other chat runs the real agent.

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const DEMO_TRIGGER = "Are we ever going to go on the Japan trip";
export const isDemoTrigger = (text: string) => normalize(text) === normalize(DEMO_TRIGGER);

export const DEMO_PLAN_ID = "demo-tokyo";

// The rest of the chat after your trigger line: sender (Member.id), text, pause before it.
export const demoScript: { from: string; text: string; afterMs: number }[] = [
  {
    from: "sam",
    text: "honestly we need to, we've been talking about it for 2 years 😭",
    afterMs: 1400,
  },
  { from: "maya", text: "I'm so burnt out, I need this", afterMs: 1600 },
  { from: "jordan", text: "December works for me. Dec 8–13?", afterMs: 1700 },
  { from: "priya", text: "I'm in if we keep it under $2000 each", afterMs: 1700 },
  { from: "sam", text: "$2000 each, locked in", afterMs: 1500 },
  { from: "maya", text: "Tokyo!! ramen and teamLab are non-negotiable", afterMs: 1600 },
];

export const demoBanner = {
  title: "Plan the Tokyo trip with Sam, Maya, Jordan & Priya?",
  body: "“Tokyo!! ramen and teamLab are non-negotiable” — Maya",
};

// The timeline, one row per tool call, revealed one by one.
export const demoSteps: Omit<StepRow, "status">[] = [
  {
    step_index: 0,
    tool: "extract_trip",
    input_summary: "Reading the chat",
    result_summary: "Tokyo · 5 people · Dec 8–13 · $2000 each",
  },
  {
    step_index: 1,
    tool: "search_flights",
    input_summary: "Searching flights AUS → HND",
    result_summary: "Found 14 flights from $980",
  },
  {
    step_index: 2,
    tool: "search_hotels",
    input_summary: "Searching hotels in Tokyo for 5",
    result_summary: "Found 9 hotels from $165/night",
  },
  {
    step_index: 3,
    tool: "search_places",
    input_summary: "Finding things to do in Tokyo",
    result_summary: "Found 8 activities",
  },
  {
    step_index: 4,
    tool: "search_places",
    input_summary: "Finding ramen near Shibuya",
    result_summary: "Found 6 restaurants",
  },
  {
    step_index: 5,
    tool: "pin_on_map",
    input_summary: "Pinning the best options",
    result_summary: "Pinned 12 options",
  },
  {
    step_index: 6,
    tool: "verify",
    input_summary: "Double-checking prices, dates and budget",
    result_summary: "All 12 options check out · ~$1,620 each, under $2000",
  },
];

const people = ["You", "Sam", "Maya", "Jordan", "Priya"];

export const demoPlan: PlanRow = {
  id: DEMO_PLAN_ID,
  status: "ready",
  title: "Tokyo trip",
  summary:
    "5 nights in Tokyo for all five of you, Dec 8–13, about $1,620 each. Ramen in Shibuya and teamLab are in.",
  chat_name: "hackers",
  source_app: "whatsapp",
  pending_question: null,
  trip: {
    origin: { city: "Austin", airport: "AUS", lat: 30.1975, lng: -97.6664 },
    destination: { city: "Tokyo", airport: "HND", lat: 35.6762, lng: 139.6503 },
    startDate: "2026-12-08",
    endDate: "2026-12-13",
    people,
    budgetPerPersonUsd: 2000,
    constraints: ["Ramen", "teamLab"],
  },
};

const option = (
  o: Partial<OptionRow> & Pick<OptionRow, "id" | "category" | "title">,
): OptionRow => ({
  subtitle: null,
  price_cents: null,
  url: null,
  image_url: null,
  lat: null,
  lng: null,
  details: {},
  is_selected: false,
  ...o,
});

export const demoOptions: OptionRow[] = [
  option({
    id: "demo-f1",
    category: "flight",
    title: "United · 1 stop",
    subtitle: "Tue 10:05 AM → Wed 3:40 PM · 15h 35m",
    price_cents: 98000,
    details: { stops: 1 },
    url: "https://www.united.com",
    is_selected: true,
  }),
  option({
    id: "demo-f2",
    category: "flight",
    title: "Japan Airlines · 1 stop",
    subtitle: "Tue 7:30 AM → Wed 1:25 PM · 15h 55m",
    price_cents: 105000,
    details: { stops: 1 },
    url: "https://www.jal.co.jp/en/",
  }),
  option({
    id: "demo-f3",
    category: "flight",
    title: "ANA · 1 stop",
    subtitle: "Tue 12:15 PM → Wed 6:05 PM · 15h 50m",
    price_cents: 112000,
    details: { stops: 1 },
    url: "https://www.ana.co.jp/en/us/",
  }),
  option({
    id: "demo-h1",
    category: "hotel",
    title: "Hotel Gracery Shinjuku",
    lat: 35.6948,
    lng: 139.702,
    details: {
      rate_per_night: 180,
      overall_rating: 4.3,
      reviews: 12400,
      address: "1-19-1 Kabukicho, Shinjuku, Tokyo",
      description: "The Godzilla hotel, steps from Shinjuku Station",
    },
    url: "https://gracery.com/shinjuku/",
    is_selected: true,
  }),
  option({
    id: "demo-h2",
    category: "hotel",
    title: "MIMARU Tokyo Ueno East",
    lat: 35.7101,
    lng: 139.7835,
    details: {
      rate_per_night: 165,
      overall_rating: 4.5,
      reviews: 2100,
      address: "Higashiueno, Taito, Tokyo",
      description: "Apartment-style rooms, near Ueno Park",
    },
    url: "https://mimaruhotels.com/en/",
  }),
  option({
    id: "demo-h3",
    category: "hotel",
    title: "Sequence Miyashita Park",
    lat: 35.6627,
    lng: 139.702,
    details: {
      rate_per_night: 210,
      overall_rating: 4.4,
      reviews: 3300,
      address: "Jingumae, Shibuya, Tokyo",
      description: "Rooftop park hotel in the middle of Shibuya",
    },
    url: "https://www.sequencehotels.com/miyashita-park/",
  }),
  option({
    id: "demo-a1",
    category: "activity",
    title: "teamLab Planets",
    lat: 35.6491,
    lng: 139.7898,
    details: {
      price: "$30",
      rating: 4.7,
      reviews: 41000,
      description: "Walk-through digital art museum",
    },
    url: "https://www.teamlab.art/e/planets/",
    is_selected: true,
  }),
  option({
    id: "demo-a2",
    category: "activity",
    title: "Shibuya Sky",
    lat: 35.6584,
    lng: 139.7022,
    details: {
      price: "$22",
      rating: 4.7,
      reviews: 23000,
      description: "Open-air rooftop over the Shibuya crossing",
    },
    url: "https://www.shibuya-scramble-square.com/sky/",
  }),
  option({
    id: "demo-a3",
    category: "activity",
    title: "Senso-ji Temple",
    lat: 35.7148,
    lng: 139.7967,
    details: {
      price: "Free",
      rating: 4.6,
      reviews: 98000,
      description: "Tokyo's oldest temple, in Asakusa",
    },
    url: "https://www.senso-ji.jp/english/",
  }),
  option({
    id: "demo-r1",
    category: "restaurant",
    title: "Ichiran Shibuya",
    lat: 35.6612,
    lng: 139.7016,
    details: {
      price: "$",
      rating: 4.4,
      reviews: 18000,
      description: "Tonkotsu ramen in solo booths, open 24 hours",
    },
    url: "https://en.ichiran.com/",
    is_selected: true,
  }),
  option({
    id: "demo-r2",
    category: "restaurant",
    title: "AFURI Ebisu",
    lat: 35.6467,
    lng: 139.7101,
    details: {
      price: "$",
      rating: 4.3,
      reviews: 6200,
      description: "Yuzu shio ramen, the light one",
    },
    url: "https://afuri.com/en/",
  }),
  option({
    id: "demo-r3",
    category: "restaurant",
    title: "Uobei Shibuya Dogenzaka",
    lat: 35.6598,
    lng: 139.699,
    details: { price: "$", rating: 4.2, reviews: 9800, description: "Bullet-train conveyor sushi" },
    url: "https://www.genki-sushi.co.jp/",
  }),
];

// Where to book each pick: dummy sellers, and nothing is ever charged.
export const demoBooking: BookingResult = {
  ok: true,
  summary: "Demo booking · nothing was charged. Pick a seller to book each part.",
  offers: [
    {
      item: "United · 1 stop",
      category: "flight",
      seller: "United",
      priceUsd: 980,
      url: "https://www.united.com",
      official: true,
    },
    {
      item: "United · 1 stop",
      category: "flight",
      seller: "Expedia",
      priceUsd: 994,
      url: "https://www.expedia.com",
    },
    {
      item: "Hotel Gracery Shinjuku",
      category: "hotel",
      seller: "Hotel Gracery",
      priceUsd: 900,
      url: "https://gracery.com/shinjuku/",
      official: true,
    },
    {
      item: "Hotel Gracery Shinjuku",
      category: "hotel",
      seller: "Booking.com",
      priceUsd: 925,
      url: "https://www.booking.com",
    },
    {
      item: "teamLab Planets",
      category: "activity",
      seller: "teamLab",
      priceUsd: 30,
      url: "https://www.teamlab.art/e/planets/",
      official: true,
    },
  ],
};
