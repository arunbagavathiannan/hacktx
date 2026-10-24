// MOCK: a SerpAPI Google Hotels response (engine=google_hotels) for Denver, Nov 20 – 22 2026,
// 2 adults per room. Real hotels and coordinates; rates are typical for a November weekend.
// Same field names as the real API.

const link = (name: string) =>
  `https://www.google.com/travel/search?q=${encodeURIComponent(`${name} Denver`)}`;

const property = (
  name: string,
  description: string,
  latitude: number,
  longitude: number,
  perNight: number,
  stars: number,
  rating: number,
  reviews: number,
  amenities: string[],
) => ({
  type: "hotel",
  name,
  description,
  link: link(name),
  gps_coordinates: { latitude, longitude },
  check_in_time: "3:00 PM",
  check_out_time: "11:00 AM",
  rate_per_night: { lowest: `$${perNight}`, extracted_lowest: perNight },
  total_rate: { lowest: `$${perNight * 2}`, extracted_lowest: perNight * 2 },
  hotel_class: `${stars}-star hotel`,
  extracted_hotel_class: stars,
  overall_rating: rating,
  reviews,
  amenities,
});

export const serpapiHotelsDenver = {
  search_parameters: {
    engine: "google_hotels",
    q: "Denver, CO",
    check_in_date: "2026-11-20",
    check_out_date: "2026-11-22",
    adults: 2,
    currency: "USD",
  },
  properties: [
    property(
      "Catbird",
      "Apartment-style rooms with kitchenettes in RiNo, near the breweries.",
      39.7685,
      -104.9749,
      189,
      3,
      4.6,
      1142,
      ["Free Wi-Fi", "Kitchenette", "Fitness center", "Pet-friendly"],
    ),
    property(
      "Kimpton Hotel Monaco Denver",
      "Colorful downtown hotel a block from the 16th Street Mall.",
      39.7477,
      -104.9918,
      219,
      4,
      4.5,
      2387,
      ["Free Wi-Fi", "Evening social hour", "Fitness center", "Restaurant"],
    ),
    property(
      "The Maven Hotel at Dairy Block",
      "Industrial-chic rooms in LoDo's Dairy Block, steps from Union Station.",
      39.7535,
      -104.9963,
      239,
      4,
      4.6,
      1695,
      ["Free Wi-Fi", "Bar", "Restaurant", "Fitness center"],
    ),
    property(
      "Hotel Teatro",
      "Boutique hotel in a 1911 landmark across from the Denver Center for the Performing Arts.",
      39.746,
      -104.999,
      249,
      4,
      4.6,
      1528,
      ["Free Wi-Fi", "Restaurant", "Room service", "Fitness center"],
    ),
    property(
      "The Ramble Hotel",
      "Design hotel in RiNo with a lobby cocktail bar, Death & Co.",
      39.7587,
      -104.9855,
      279,
      4,
      4.7,
      913,
      ["Free Wi-Fi", "Bar", "Restaurant", "Fitness center"],
    ),
    property(
      "The Crawford Hotel",
      "Rooms inside Denver Union Station, with trains to the airport downstairs.",
      39.753,
      -105.0002,
      389,
      4,
      4.8,
      1871,
      ["Free Wi-Fi", "Restaurant", "Bar", "Room service"],
    ),
  ],
};

export type SerpapiHotel = (typeof serpapiHotelsDenver)["properties"][number];
