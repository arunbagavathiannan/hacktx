// MOCK: destinations the agent would suggest from the chat + onboarding preferences.
// Coordinates are real; match scores, prices, and quotes are made up. Only Denver has
// mock places in trip.ts, so it's the demo pick.

export type DestinationSuggestion = {
  id: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  match: number; // 0-100, how well it fits the chat + preferences
  why: string; // the chat signal behind the suggestion
  estPerPerson: number; // USD, flights + 2 nights split
  flightTime: string;
};

export const destinationSuggestions: DestinationSuggestion[] = [
  {
    id: "den",
    city: "Denver",
    region: "Colorado",
    lat: 39.7392,
    lng: -104.9903,
    match: 92,
    why: "Sam and Maya keep bringing up the Red Rocks show on the 15th",
    estPerPerson: 380,
    flightTime: "2h 05m",
  },
  {
    id: "msy",
    city: "New Orleans",
    region: "Louisiana",
    lat: 29.9511,
    lng: -90.0715,
    match: 81,
    why: "Priya: “we still never did nola”",
    estPerPerson: 340,
    flightTime: "1h 20m",
  },
  {
    id: "bna",
    city: "Nashville",
    region: "Tennessee",
    lat: 36.1627,
    lng: -86.7816,
    match: 74,
    why: "Jordan sent three Broadway bar reels this week",
    estPerPerson: 360,
    flightTime: "2h 10m",
  },
];
