// MOCK: the destinations the agent suggests from the chat ("somewhere with live music", under
// $400, Fri–Sun) plus onboarding preferences. Huddle never picks one: the group does, on the
// globe at /plan/destinations. Each idea carries a small full dataset (flights, hotels, places)
// so the city map, pricing, and booked screen work for whichever city wins.
// Coordinates are real; match scores, prices, ratings, review counts, and votes are made up.
import {
  brief,
  flights as denverFlights,
  places as denverPlaces,
  trip as denverTrip,
} from "./trip";
import type { DestinationSuggestion, Flight, Place, Trip } from "./types";

export type { DestinationSuggestion };

// MOCK: rough road numbers for the "Drive" answer, not from a routing API.
function oneCityTrip(opts: {
  id: string;
  city: string;
  region: string;
  airport: string;
  lat: number;
  lng: number;
  flightIds: string[];
  driveMiles: number;
  driveHours: number;
  why: string;
}): Trip {
  const { city, region, lat, lng } = opts;
  return {
    ...brief,
    id: opts.id,
    title: `${city} weekend`,
    destination: { city, region, lat, lng },
    stops: [
      {
        city,
        region,
        lat,
        lng,
        airport: opts.airport,
        arrive: brief.dates.start,
        depart: brief.dates.end,
      },
    ],
    // Round-trip fares, so the flight home has no options of its own.
    legs: [
      {
        from: brief.origin.city,
        to: city,
        mode: "fly",
        flightIds: opts.flightIds,
        driveMiles: opts.driveMiles,
        driveHours: opts.driveHours,
      },
      {
        from: city,
        to: brief.origin.city,
        mode: "fly",
        driveMiles: opts.driveMiles,
        driveHours: opts.driveHours,
      },
    ],
    why: opts.why,
  };
}

// --- New Orleans ---------------------------------------------------------------------------

const msyFlights: Flight[] = [
  {
    id: "msy-f1",
    airline: "Southwest",
    depart: "Fri 6:50 AM",
    arrive: "8:10 AM",
    duration: "1h 20m",
    stops: 0,
    pricePerPerson: 118,
    pickedBy: ["priya", "maya"],
    source: "serpapi_flights",
  },
  {
    id: "msy-f2",
    airline: "United",
    depart: "Fri 11:15 AM",
    arrive: "12:40 PM",
    duration: "1h 25m",
    stops: 0,
    pricePerPerson: 164,
    pickedBy: [],
    source: "serpapi_flights",
  },
  {
    id: "msy-f3",
    airline: "American",
    depart: "Fri 3:05 PM",
    arrive: "4:35 PM",
    duration: "1h 30m",
    stops: 0,
    pricePerPerson: 139,
    pickedBy: ["jordan"],
    source: "serpapi_flights",
  },
];

const msyPlaces: Place[] = [
  {
    id: "msy-h1",
    name: "Hotel Peter & Paul",
    category: "hotel",
    lat: 29.9655,
    lng: -90.0559,
    rating: 4.6,
    reviews: 1240,
    price: "$239/night",
    nightlyRate: 239,
    sleepsPerRoom: 2, // queen rooms
    address: "2317 Burgundy St",
    blurb: "A converted church and schoolhouse in the Marigny. Five minutes from Frenchmen St.",
    distanceLabel: "Marigny",
    pickedBy: ["priya"],
    source: "serpapi_hotels",
  },
  {
    id: "msy-h2",
    name: "Hotel Monteleone",
    category: "hotel",
    lat: 29.9553,
    lng: -90.0667,
    rating: 4.6,
    reviews: 6900,
    price: "$209/night",
    nightlyRate: 209,
    sleepsPerRoom: 4, // two queens
    address: "214 Royal St",
    blurb: "Two-queen rooms that sleep 4, and the spinning Carousel Bar downstairs.",
    distanceLabel: "French Quarter",
    pickedBy: ["maya"],
    source: "serpapi_hotels",
  },
  {
    id: "msy-a1",
    name: "Snug Harbor Jazz Bistro",
    category: "activity",
    lat: 29.9636,
    lng: -90.0578,
    rating: 4.7,
    reviews: 2300,
    price: "Show tickets from $40",
    address: "626 Frenchmen St",
    hours: "Show Sat 8 PM",
    blurb: "The sit-down jazz room on Frenchmen St. The 8 PM set sells out, so book early.",
    distanceLabel: "20 min walk from hotel",
    pickedBy: ["priya", "maya", "jordan"],
    source: "google_places",
  },
  {
    id: "msy-n1",
    name: "The Spotted Cat Music Club",
    category: "nightlife",
    lat: 29.9637,
    lng: -90.0576,
    rating: 4.6,
    reviews: 2900,
    price: "$",
    address: "623 Frenchmen St",
    hours: "Live jazz until 2 AM",
    blurb: "Tiny, loud, cash-only, three bands a night. One-drink minimum, no cover.",
    distanceLabel: "20 min walk from hotel",
    pickedBy: ["sam"],
    source: "google_places",
  },
  {
    id: "msy-d1",
    name: "Café Du Monde",
    category: "food",
    lat: 29.9575,
    lng: -90.0618,
    rating: 4.5,
    reviews: 38200,
    price: "$",
    address: "800 Decatur St",
    hours: "7 AM – 11 PM",
    blurb: "Beignets and café au lait on the river. The line moves fast.",
    distanceLabel: "8 min walk from hotel",
    pickedBy: ["jordan", "sam"],
    source: "google_places",
  },
  {
    id: "msy-d2",
    name: "Cochon",
    category: "food",
    lat: 29.9433,
    lng: -90.0687,
    rating: 4.6,
    reviews: 4100,
    price: "$$",
    address: "930 Tchoupitoulas St",
    hours: "11 AM – 10 PM",
    blurb: "Cajun small plates in the Warehouse District. Get the rabbit and dumplings.",
    distanceLabel: "6 min drive from hotel",
    pickedBy: [],
    source: "google_places",
  },
  {
    id: "msy-a2",
    name: "Mardi Gras World",
    category: "activity",
    lat: 29.9387,
    lng: -90.0623,
    rating: 4.6,
    reviews: 7800,
    price: "Tours $25",
    address: "1380 Port of New Orleans Pl",
    hours: "9 AM – 5:30 PM",
    blurb: "Walk through the workshop where the parade floats get built.",
    distanceLabel: "9 min drive from hotel",
    pickedBy: ["maya"],
    source: "google_places",
  },
];

// --- Nashville -----------------------------------------------------------------------------

const bnaFlights: Flight[] = [
  {
    id: "bna-f1",
    airline: "Southwest",
    depart: "Fri 7:25 AM",
    arrive: "9:25 AM",
    duration: "2h 0m",
    stops: 0,
    pricePerPerson: 131,
    pickedBy: ["jordan", "sam"],
    source: "serpapi_flights",
  },
  {
    id: "bna-f2",
    airline: "American",
    depart: "Fri 10:20 AM",
    arrive: "12:25 PM",
    duration: "2h 5m",
    stops: 0,
    pricePerPerson: 154,
    pickedBy: [],
    source: "serpapi_flights",
  },
];

const bnaPlaces: Place[] = [
  {
    id: "bna-h1",
    name: "Noelle",
    category: "hotel",
    lat: 36.1626,
    lng: -86.7782,
    rating: 4.6,
    reviews: 2100,
    price: "$259/night",
    nightlyRate: 259,
    sleepsPerRoom: 2, // king rooms
    address: "200 4th Ave N",
    blurb: "Art-deco hotel with a rooftop bar, two blocks up from Broadway.",
    distanceLabel: "Printers Alley",
    pickedBy: ["sam"],
    source: "serpapi_hotels",
  },
  {
    id: "bna-h2",
    name: "Holston House",
    category: "hotel",
    lat: 36.161,
    lng: -86.7826,
    rating: 4.5,
    reviews: 1800,
    price: "$229/night",
    nightlyRate: 229,
    sleepsPerRoom: 4, // two queens
    address: "118 7th Ave N",
    blurb: "Two-queen rooms that sleep 4 and a rooftop pool. Five minutes to the Ryman.",
    distanceLabel: "Downtown",
    pickedBy: ["jordan"],
    source: "serpapi_hotels",
  },
  {
    id: "bna-a1",
    name: "Ryman Auditorium",
    category: "activity",
    lat: 36.1612,
    lng: -86.7785,
    rating: 4.9,
    reviews: 18400,
    price: "Show tickets from $55",
    address: "116 Rep. John Lewis Way N",
    hours: "Show Sat 8 PM",
    blurb: "The Mother Church of Country Music. Saturday's show has seats for five together.",
    distanceLabel: "5 min walk from hotel",
    pickedBy: ["jordan", "sam", "priya"],
    source: "google_places",
  },
  {
    id: "bna-n1",
    name: "Robert's Western World",
    category: "nightlife",
    lat: 36.161,
    lng: -86.777,
    rating: 4.7,
    reviews: 6400,
    price: "$",
    address: "416 Broadway",
    hours: "Live music until 2 AM",
    blurb: "Honky-tonk with no cover and a fried bologna sandwich. Bands start at 11 AM.",
    distanceLabel: "7 min walk from hotel",
    pickedBy: ["sam", "maya"],
    source: "google_places",
  },
  {
    id: "bna-d1",
    name: "Hattie B's Hot Chicken",
    category: "food",
    lat: 36.1517,
    lng: -86.7975,
    rating: 4.6,
    reviews: 11900,
    price: "$",
    address: "112 19th Ave S",
    hours: "11 AM – 10 PM",
    blurb: "Hot chicken from Southern to Shut the Cluck Up. Go before noon to skip the line.",
    distanceLabel: "7 min drive from hotel",
    pickedBy: ["jordan"],
    source: "google_places",
  },
  {
    id: "bna-d2",
    name: "Biscuit Love Gulch",
    category: "food",
    lat: 36.1533,
    lng: -86.7836,
    rating: 4.5,
    reviews: 5600,
    price: "$$",
    address: "316 11th Ave S",
    hours: "7 AM – 3 PM",
    blurb: "The bonuts. Saturday brunch before the show.",
    distanceLabel: "5 min drive from hotel",
    pickedBy: ["priya"],
    source: "google_places",
  },
  {
    id: "bna-a2",
    name: "Country Music Hall of Fame",
    category: "activity",
    lat: 36.1582,
    lng: -86.776,
    rating: 4.8,
    reviews: 15200,
    price: "Tickets $30",
    address: "222 Rep. John Lewis Way S",
    hours: "9 AM – 5 PM",
    blurb: "Elvis's gold Cadillac and a wall of every gold record. Two hours, easy.",
    distanceLabel: "8 min walk from hotel",
    pickedBy: [],
    source: "google_places",
  },
];

// In the order the planner suggested them.
export const destinationSuggestions: DestinationSuggestion[] = [
  {
    id: "den",
    city: "Denver",
    region: "Colorado",
    airport: "DEN",
    lat: 39.7392,
    lng: -104.9903,
    match: 92,
    why: "Red Rocks show Sun",
    flightTime: "2h 15m",
    votes: ["sam", "maya"],
    headlinePlaceId: "a1",
    trip: denverTrip,
    flights: denverFlights,
    places: denverPlaces,
  },
  {
    id: "msy",
    city: "New Orleans",
    region: "Louisiana",
    airport: "MSY",
    lat: 29.9511,
    lng: -90.0715,
    match: 81,
    why: "Frenchmen St jazz",
    flightTime: "1h 20m",
    votes: ["priya"],
    headlinePlaceId: "msy-a1",
    trip: oneCityTrip({
      id: "new-orleans-nov",
      city: "New Orleans",
      region: "Louisiana",
      airport: "MSY",
      lat: 29.9511,
      lng: -90.0715,
      flightIds: msyFlights.map((f) => f.id),
      driveMiles: 510,
      driveHours: 8,
      why: "Jazz on Frenchmen St Saturday night",
    }),
    flights: msyFlights,
    places: msyPlaces,
  },
  {
    id: "bna",
    city: "Nashville",
    region: "Tennessee",
    airport: "BNA",
    lat: 36.1627,
    lng: -86.7816,
    match: 74,
    why: "Broadway live music",
    flightTime: "2h 0m",
    votes: ["jordan"],
    headlinePlaceId: "bna-a1",
    trip: oneCityTrip({
      id: "nashville-nov",
      city: "Nashville",
      region: "Tennessee",
      airport: "BNA",
      lat: 36.1627,
      lng: -86.7816,
      flightIds: bnaFlights.map((f) => f.id),
      driveMiles: 860,
      driveHours: 13,
      why: "A show at the Ryman Saturday, honky-tonks on Broadway",
    }),
    flights: bnaFlights,
    places: bnaPlaces,
  },
];

// The idea with the most friends' votes (ties go to the planner's order).
export const leadingDestination: DestinationSuggestion = destinationSuggestions.reduce((best, d) =>
  d.votes.length > best.votes.length ? d : best,
);

// MOCK: demo-only. Screens after the pick (map, booked) opened by a direct link, before the
// group picked anything, show the leading idea instead of an empty plan.
// Live mode (lib/live.ts): the real plan's destination, found by its id like any other.
let liveDestination: DestinationSuggestion | null = null;
export function setLiveDestination(d: DestinationSuggestion | null) {
  liveDestination = d;
}

export function destinationById(id: string | null | undefined): DestinationSuggestion {
  if (liveDestination && id === liveDestination.id) return liveDestination;
  return destinationSuggestions.find((d) => d.id === id) ?? leadingDestination;
}

// The destination a flight or place belongs to (ids are unique across cities).
export function destinationOwning(optionId: string): DestinationSuggestion | undefined {
  const all = liveDestination
    ? [liveDestination, ...destinationSuggestions]
    : destinationSuggestions;
  return all.find(
    (d) => d.flights.some((f) => f.id === optionId) || d.places.some((p) => p.id === optionId),
  );
}
