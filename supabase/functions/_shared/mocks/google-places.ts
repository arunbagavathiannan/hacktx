// MOCK: Google Places API (New) Text Search results (places:searchText) for Denver. Real places
// and coordinates; ids are mock ids. Same field names as the real API.

const mapsUri = (name: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} Denver`)}`;

const place = (
  id: string,
  name: string,
  type: string,
  formattedAddress: string,
  latitude: number,
  longitude: number,
  rating: number,
  userRatingCount: number,
  priceLevel?: string,
) => ({
  id: `mock_${id}`,
  displayName: { text: name, languageCode: "en" },
  primaryTypeDisplayName: { text: type, languageCode: "en" },
  formattedAddress,
  location: { latitude, longitude },
  rating,
  userRatingCount,
  priceLevel,
  googleMapsUri: mapsUri(name),
});

export const placesDenverRestaurants = {
  places: [
    place(
      "hop_alley",
      "Hop Alley",
      "Chinese restaurant",
      "3500 Larimer St, Denver, CO 80205",
      39.7676,
      -104.9727,
      4.6,
      1904,
      "PRICE_LEVEL_EXPENSIVE",
    ),
    place(
      "work_and_class",
      "Work & Class",
      "Latin American restaurant",
      "2500 Larimer St #101, Denver, CO 80205",
      39.7586,
      -104.9858,
      4.6,
      2671,
      "PRICE_LEVEL_MODERATE",
    ),
    place(
      "denver_central_market",
      "Denver Central Market",
      "Food court",
      "2669 Larimer St, Denver, CO 80205",
      39.7603,
      -104.9842,
      4.6,
      5310,
      "PRICE_LEVEL_MODERATE",
    ),
    place(
      "tavernetta",
      "Tavernetta",
      "Italian restaurant",
      "1889 16th St, Denver, CO 80202",
      39.7535,
      -105.0003,
      4.7,
      2215,
      "PRICE_LEVEL_EXPENSIVE",
    ),
    place(
      "snooze_union_station",
      "Snooze, an A.M. Eatery",
      "Breakfast restaurant",
      "1701 Wynkoop St, Denver, CO 80202",
      39.753,
      -104.9998,
      4.5,
      3488,
      "PRICE_LEVEL_MODERATE",
    ),
  ],
};

export const placesDenverActivities = {
  places: [
    place(
      "red_rocks",
      "Red Rocks Park and Amphitheatre",
      "Amphitheater",
      "18300 W Alameda Pkwy, Morrison, CO 80465",
      39.6654,
      -105.2057,
      4.9,
      31402,
    ),
    place(
      "meow_wolf",
      "Meow Wolf Denver | Convergence Station",
      "Art museum",
      "1338 1st St, Denver, CO 80204",
      39.7414,
      -105.0095,
      4.6,
      18733,
    ),
    place(
      "union_station",
      "Denver Union Station",
      "Historical landmark",
      "1701 Wynkoop St, Denver, CO 80202",
      39.7527,
      -104.9999,
      4.6,
      14208,
    ),
    place(
      "denver_art_museum",
      "Denver Art Museum",
      "Art museum",
      "100 W 14th Ave Pkwy, Denver, CO 80204",
      39.7371,
      -104.9893,
      4.7,
      12960,
    ),
    place(
      "botanic_gardens",
      "Denver Botanic Gardens",
      "Botanical garden",
      "1007 York St, Denver, CO 80206",
      39.732,
      -104.9601,
      4.7,
      11845,
    ),
  ],
};

export type GooglePlace = (typeof placesDenverRestaurants)["places"][number];
