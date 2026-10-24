// MOCK: hand-traced Denver basemap for the SVG map stand-in (no Google Maps key yet).
// Approximate real coordinates, [lat, lng]. Swap MapCanvas for react-native-maps later
// and this file goes away.

export type Line = Array<[number, number]>;

export type Road = { name: string; kind: "highway" | "major"; points: Line; labelAt?: number };

export const roads: Road[] = [
  {
    name: "I-25",
    kind: "highway",
    labelAt: 7,
    points: [
      [39.86, -104.987],
      [39.82, -104.988],
      [39.79, -104.99],
      [39.7785, -105.003],
      [39.762, -105.014],
      [39.744, -105.019],
      [39.73, -105.014],
      [39.711, -104.999],
      [39.7, -104.987],
      [39.683, -104.96],
      [39.66, -104.93],
      [39.62, -104.89],
    ],
  },
  {
    name: "I-70",
    kind: "highway",
    labelAt: 5,
    points: [
      [39.705, -105.23],
      [39.735, -105.17],
      [39.78, -105.11],
      [39.784, -105.06],
      [39.7785, -105.003],
      [39.777, -104.96],
      [39.777, -104.9],
      [39.78, -104.83],
    ],
  },
  {
    name: "6th Ave",
    kind: "highway",
    points: [
      [39.7255, -105.012],
      [39.7255, -105.06],
      [39.726, -105.15],
    ],
  },
  {
    name: "Colfax Ave",
    kind: "major",
    labelAt: 1,
    points: [
      [39.7402, -105.1],
      [39.7402, -104.95],
      [39.7402, -104.85],
    ],
  },
  {
    name: "Speer Blvd",
    kind: "major",
    labelAt: 2,
    points: [
      [39.718, -104.973],
      [39.725, -104.979],
      [39.733, -104.987],
      [39.7405, -104.996],
      [39.7475, -105.0015],
      [39.756, -105.012],
      [39.762, -105.018],
    ],
  },
  {
    name: "Broadway",
    kind: "major",
    points: [
      [39.65, -104.9875],
      [39.7445, -104.9875],
    ],
  },
  {
    name: "Colorado Blvd",
    kind: "major",
    points: [
      [39.65, -104.9407],
      [39.78, -104.9407],
    ],
  },
  {
    name: "Alameda Ave",
    kind: "major",
    points: [
      [39.7114, -105.2],
      [39.7114, -104.9],
    ],
  },
  {
    name: "Downing St",
    kind: "major",
    points: [
      [39.65, -104.9733],
      [39.78, -104.9733],
    ],
  },
  {
    name: "Federal Blvd",
    kind: "major",
    points: [
      [39.65, -105.025],
      [39.8, -105.025],
    ],
  },
  {
    name: "Evans Ave",
    kind: "major",
    points: [
      [39.6783, -105.05],
      [39.6783, -104.9],
    ],
  },
];

export const rivers: Array<{ name: string; points: Line; width: number }> = [
  {
    name: "South Platte River",
    width: 5,
    points: [
      [39.64, -105.016],
      [39.67, -105.013],
      [39.7, -105.01],
      [39.725, -105.016],
      [39.745, -105.012],
      [39.7548, -105.0074],
      [39.77, -104.995],
      [39.785, -104.975],
      [39.81, -104.955],
      [39.85, -104.93],
    ],
  },
  {
    name: "Cherry Creek",
    width: 2.5,
    points: [
      [39.712, -104.955],
      [39.718, -104.972],
      [39.725, -104.979],
      [39.733, -104.987],
      [39.7405, -104.996],
      [39.7475, -105.0015],
      [39.7548, -105.0074],
    ],
  },
];

// Parks as rough ellipses: center, radius in degrees (lat, lng).
export const parks: Array<{ name: string; lat: number; lng: number; rLat: number; rLng: number }> =
  [
    { name: "City Park", lat: 39.7475, lng: -104.9505, rLat: 0.0055, rLng: 0.0085 },
    { name: "Washington Park", lat: 39.7, lng: -104.9705, rLat: 0.006, rLng: 0.004 },
    { name: "Cheesman Park", lat: 39.733, lng: -104.9665, rLat: 0.0025, rLng: 0.0035 },
    { name: "Sloan's Lake", lat: 39.7485, lng: -105.0475, rLat: 0.004, rLng: 0.006 },
  ];

export const neighborhoods: Array<{ name: string; lat: number; lng: number }> = [
  { name: "LODO", lat: 39.7575, lng: -104.9935 },
  { name: "RINO", lat: 39.7665, lng: -104.9805 },
  { name: "HIGHLANDS", lat: 39.7625, lng: -105.0255 },
  { name: "CAPITOL HILL", lat: 39.7255, lng: -104.9725 },
  { name: "BAKER", lat: 39.7135, lng: -104.995 },
  { name: "CHERRY CREEK", lat: 39.7185, lng: -104.951 },
  { name: "PLATT PARK", lat: 39.6845, lng: -104.9845 },
];
