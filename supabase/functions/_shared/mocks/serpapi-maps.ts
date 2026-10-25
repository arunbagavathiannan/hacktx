// MOCK: SerpAPI Google Maps search results (engine=google_maps, type=search) for Denver.
// Real places and coordinates; place ids are mock ids. Same field names as the real API.

const place = (
  id: string,
  title: string,
  type: string,
  address: string,
  latitude: number,
  longitude: number,
  rating: number,
  reviews: number,
  price?: string,
) => ({
  position: 0,
  title,
  place_id: `mock_${id}`,
  gps_coordinates: { latitude, longitude },
  rating,
  reviews,
  price,
  type,
  address,
});

export const mapsDenverRestaurants = {
  local_results: [
    place(
      "hop_alley",
      "Hop Alley",
      "Chinese restaurant",
      "3500 Larimer St, Denver, CO 80205",
      39.7676,
      -104.9727,
      4.6,
      1904,
      "$$$",
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
      "$$",
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
      "$$",
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
      "$$$",
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
      "$$",
    ),
  ],
};

export const mapsDenverActivities = {
  local_results: [
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

// Fields the tool reads. Live results have many more, and some may be missing.
export interface MapsPlace {
  title: string;
  place_id?: string;
  gps_coordinates?: { latitude: number; longitude: number };
  rating?: number;
  reviews?: number;
  price?: string;
  type?: string;
  address?: string;
  thumbnail?: string;
}

export interface MapsResponse {
  local_results?: MapsPlace[];
}
