// MOCK: demo-only. A two-city version of the Denver trip for `/plan/map?demo=multi`, so the
// Route view can show more than one leg: Austin -> Denver -> Salt Lake City -> Austin.
// One-way fares, since each leg is booked on its own. Nothing outside the map screen uses it.

import { members, trip } from "./trip";
import type { Flight, Trip } from "./types";

export const multiFlights: Flight[] = [
  {
    id: "m-aus-den-1",
    airline: "Southwest",
    depart: "Fri 7:05 AM",
    arrive: "8:20 AM",
    duration: "2h 15m",
    stops: 0,
    pricePerPerson: 89,
    pickedBy: ["sam", "jordan"],
    source: "serpapi_flights",
  },
  {
    id: "m-aus-den-2",
    airline: "United",
    depart: "Fri 12:40 PM",
    arrive: "1:58 PM",
    duration: "2h 18m",
    stops: 0,
    pricePerPerson: 112,
    pickedBy: ["maya"],
    source: "serpapi_flights",
  },
  {
    id: "m-slc-aus-1",
    airline: "Delta",
    depart: "Tue 6:15 PM",
    arrive: "10:40 PM",
    duration: "3h 25m",
    stops: 0,
    pricePerPerson: 134,
    pickedBy: ["priya"],
    source: "serpapi_flights",
  },
  {
    id: "m-slc-aus-2",
    airline: "Southwest",
    depart: "Tue 1:50 PM",
    arrive: "7:35 PM",
    duration: "4h 45m",
    stops: 1,
    pricePerPerson: 118,
    pickedBy: [],
    source: "serpapi_flights",
  },
];

export const multiTrip: Trip = {
  ...trip,
  id: "denver-slc-nov",
  title: "Denver + Salt Lake",
  dates: { start: "2026-11-13", end: "2026-11-17", label: "Fri Nov 13 – Tue Nov 17" },
  budgetPerPerson: 550,
  stops: [
    {
      city: "Denver",
      region: "Colorado",
      lat: 39.7392,
      lng: -104.9903,
      airport: "DEN",
      arrive: "2026-11-13",
      depart: "2026-11-15",
    },
    {
      city: "Salt Lake City",
      region: "Utah",
      lat: 40.7608,
      lng: -111.891,
      airport: "SLC",
      arrive: "2026-11-15",
      depart: "2026-11-17",
    },
  ],
  // Drive miles/hours are rough road numbers, not from a routing API.
  legs: [
    {
      from: "Austin",
      to: "Denver",
      mode: "fly",
      flightIds: ["m-aus-den-1", "m-aus-den-2"],
      driveMiles: 920,
      driveHours: 13,
    },
    { from: "Denver", to: "Salt Lake City", mode: "drive", driveMiles: 520, driveHours: 8 },
    {
      from: "Salt Lake City",
      to: "Austin",
      mode: "fly",
      flightIds: ["m-slc-aus-1", "m-slc-aus-2"],
      driveMiles: 1250,
      driveHours: 18,
    },
  ],
  members,
};
