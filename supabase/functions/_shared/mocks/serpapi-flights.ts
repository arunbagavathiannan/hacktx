// MOCK: a SerpAPI Google Flights response (engine=google_flights, type=1 round trip) for the
// demo trip, AUS → DEN, Fri Nov 20 – Sun Nov 22 2026. Same field names as the real API, so
// search_flights can switch to a live fetch without changing how it reads results.
// Prices are round trip per person.

const AUS = { name: "Austin-Bergstrom International Airport", id: "AUS" };
const DEN = { name: "Denver International Airport", id: "DEN" };
const DFW = { name: "Dallas/Fort Worth International Airport", id: "DFW" };

const logo = (code: string) => `https://www.gstatic.com/flights/airline_logos/70px/${code}.png`;

export const serpapiFlightsAusDen = {
  search_parameters: {
    engine: "google_flights",
    departure_id: "AUS",
    arrival_id: "DEN",
    outbound_date: "2026-11-20",
    return_date: "2026-11-22",
    currency: "USD",
    type: "1",
  },
  best_flights: [
    {
      flights: [
        {
          departure_airport: { ...AUS, time: "2026-11-20 13:15" },
          arrival_airport: { ...DEN, time: "2026-11-20 14:25" },
          duration: 130,
          airplane: "Airbus A321neo",
          airline: "Frontier",
          airline_logo: logo("F9"),
          travel_class: "Economy",
          flight_number: "F9 2316",
        },
      ],
      total_duration: 130,
      price: 164,
      type: "Round trip",
      airline_logo: logo("F9"),
    },
    {
      flights: [
        {
          departure_airport: { ...AUS, time: "2026-11-20 07:05" },
          arrival_airport: { ...DEN, time: "2026-11-20 08:20" },
          duration: 135,
          airplane: "Boeing 737 MAX 8",
          airline: "Southwest",
          airline_logo: logo("WN"),
          travel_class: "Economy",
          flight_number: "WN 2210",
        },
      ],
      total_duration: 135,
      price: 248,
      type: "Round trip",
      airline_logo: logo("WN"),
    },
    {
      flights: [
        {
          departure_airport: { ...AUS, time: "2026-11-20 10:30" },
          arrival_airport: { ...DEN, time: "2026-11-20 11:42" },
          duration: 132,
          airplane: "Boeing 737-800",
          airline: "United",
          airline_logo: logo("UA"),
          travel_class: "Economy",
          flight_number: "UA 1712",
        },
      ],
      total_duration: 132,
      price: 286,
      type: "Round trip",
      airline_logo: logo("UA"),
    },
  ],
  other_flights: [
    {
      flights: [
        {
          departure_airport: { ...AUS, time: "2026-11-20 17:40" },
          arrival_airport: { ...DEN, time: "2026-11-20 18:55" },
          duration: 135,
          airplane: "Boeing 737-700",
          airline: "Southwest",
          airline_logo: logo("WN"),
          travel_class: "Economy",
          flight_number: "WN 1188",
        },
      ],
      total_duration: 135,
      price: 212,
      type: "Round trip",
      airline_logo: logo("WN"),
    },
    {
      flights: [
        {
          departure_airport: { ...AUS, time: "2026-11-20 06:00" },
          arrival_airport: { ...DFW, time: "2026-11-20 07:05" },
          duration: 65,
          airplane: "Airbus A321",
          airline: "American",
          airline_logo: logo("AA"),
          travel_class: "Economy",
          flight_number: "AA 2541",
        },
        {
          departure_airport: { ...DFW, time: "2026-11-20 08:10" },
          arrival_airport: { ...DEN, time: "2026-11-20 09:05" },
          duration: 115,
          airplane: "Boeing 737-800",
          airline: "American",
          airline_logo: logo("AA"),
          travel_class: "Economy",
          flight_number: "AA 1893",
        },
      ],
      layovers: [{ duration: 65, name: DFW.name, id: "DFW" }],
      total_duration: 245,
      price: 231,
      type: "Round trip",
      airline_logo: logo("AA"),
    },
  ],
};

export type SerpapiFlightsResponse = typeof serpapiFlightsAusDen;
export type SerpapiFlight = SerpapiFlightsResponse["best_flights"][number] & {
  layovers?: { duration: number; name: string; id: string }[];
};
