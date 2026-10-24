import type { ChatMessage, Trip } from "../tools/types.ts";

// MOCK: the demo group chat and what extract_trip pulls out of it. extract_trip returns this
// until Muse Spark does the extraction.

export const demoChat: ChatMessage[] = [
  { sender: "Sam", text: "ok we NEED a trip before thanksgiving", sentAt: "2026-10-24T18:02:00Z" },
  { sender: "Arun", text: "denver?? i've never been", sentAt: "2026-10-24T18:03:00Z" },
  { sender: "Villy", text: "weekend of the 20th works for me", sentAt: "2026-10-24T18:04:00Z" },
  { sender: "Sam", text: "red rocks!! and keep it under 500 each", sentAt: "2026-10-24T18:05:00Z" },
  { sender: "Arun", text: "nonstop flights only pls", sentAt: "2026-10-24T18:06:00Z" },
];

export const demoTrip: Trip = {
  origin: { city: "Austin", airport: "AUS", lat: 30.1975, lng: -97.6664 },
  destination: { city: "Denver", airport: "DEN", lat: 39.7392, lng: -104.9903 },
  startDate: "2026-11-20",
  endDate: "2026-11-22",
  people: ["Sam", "Arun", "Villy"],
  budgetPerPersonUsd: 500,
  constraints: ["Nonstop flights", "Wants to see Red Rocks"],
  missing: [],
};
