// MOCK: the destinations the agent suggests from the chat + onboarding preferences, before
// the group picks one on the summary screen. Coordinates are real; match scores and quotes
// are made up. Only Denver has mock flights, hotels, and places, so it's the only one the
// demo can open on the map.

export type DestinationSuggestion = {
  id: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  match: number; // 0-100, how well it fits the chat + preferences
  why: string; // the chat signal behind the suggestion
  hasDemoData: boolean;
};

export const destinationSuggestions: DestinationSuggestion[] = [
  {
    id: "den",
    city: "Denver",
    region: "Colorado",
    lat: 39.7392,
    lng: -104.9903,
    match: 92,
    why: "Sam: “denver?? red rocks has a show nov 15”",
    hasDemoData: true,
  },
  {
    id: "msy",
    city: "New Orleans",
    region: "Louisiana",
    lat: 29.9511,
    lng: -90.0715,
    match: 81,
    why: "Priya: “we still never did nola”",
    hasDemoData: false,
  },
  {
    id: "bna",
    city: "Nashville",
    region: "Tennessee",
    lat: 36.1627,
    lng: -86.7816,
    match: 74,
    why: "Jordan keeps sending Broadway bar reels",
    hasDemoData: false,
  },
];
