// Example group-chat messages the hero globe turns into pins. Marketing copy, not app data.
export type Chat = {
  city: string;
  lat: number;
  lng: number;
  sender: string;
  app: "WhatsApp" | "Instagram";
  text: string;
};

export const CHATS: readonly Chat[] = [
  {
    city: "Austin",
    lat: 30.27,
    lng: -97.74,
    sender: "Sam",
    app: "WhatsApp",
    text: "we should do Austin next month",
  },
  {
    city: "Denver",
    lat: 39.74,
    lng: -104.99,
    sender: "Priya",
    app: "Instagram",
    text: "denver ski weekend?? i'll drive",
  },
  {
    city: "Mexico City",
    lat: 19.43,
    lng: -99.13,
    sender: "Leo",
    app: "WhatsApp",
    text: "cdmx for spring break, who's in",
  },
  {
    city: "New York",
    lat: 40.71,
    lng: -74.0,
    sender: "Maya",
    app: "Instagram",
    text: "NYC for my bday weekend?",
  },
  {
    city: "Rio de Janeiro",
    lat: -22.9,
    lng: -43.2,
    sender: "Ana",
    app: "WhatsApp",
    text: "rio for carnaval. not joking",
  },
  {
    city: "Lisbon",
    lat: 38.72,
    lng: -9.14,
    sender: "Jonah",
    app: "WhatsApp",
    text: "lisbon in june, under $900?",
  },
  {
    city: "London",
    lat: 51.5,
    lng: -0.12,
    sender: "Dev",
    app: "Instagram",
    text: "london, 4 days, who's free",
  },
  {
    city: "Cape Town",
    lat: -33.92,
    lng: 18.42,
    sender: "Zara",
    app: "WhatsApp",
    text: "cape town over winter break?",
  },
  {
    city: "Tokyo",
    lat: 35.68,
    lng: 139.69,
    sender: "Aiko",
    app: "Instagram",
    text: "tokyo trip fund starts today",
  },
  {
    city: "Bali",
    lat: -8.4,
    lng: 115.19,
    sender: "Kai",
    app: "WhatsApp",
    text: "bali after finals, let's lock it",
  },
  {
    city: "Sydney",
    lat: -33.87,
    lng: 151.21,
    sender: "Noah",
    app: "Instagram",
    text: "sydney NYE. flights are cheap rn",
  },
];
