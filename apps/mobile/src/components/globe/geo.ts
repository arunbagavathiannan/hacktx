// Tiny, offline world model for the globe intro: no textures, no network.
// LAND is a coarse land mask: for each 5° latitude band (keyed by its southern edge),
// the longitude ranges that are mostly land. Good enough for a dotted globe at a glance.

const LAND: Record<number, Array<[number, number]>> = {
  80: [
    [-95, -20],
    [10, 30],
    [45, 65],
    [95, 105],
  ],
  75: [
    [-122, -18],
    [12, 28],
    [55, 68],
    [95, 115],
  ],
  70: [
    [-165, -140],
    [-125, -70],
    [-58, -20],
    [20, 30],
    [52, 160],
  ],
  65: [
    [-180, -170],
    [-168, -62],
    [-55, -25],
    [-24, -13],
    [13, 180],
  ],
  60: [
    [-166, -95],
    [-80, -62],
    [-50, -40],
    [-22, -14],
    [5, 180],
  ],
  55: [
    [-160, -152],
    [-136, -93],
    [-77, -61],
    [-7, -2],
    [5, 18],
    [22, 137],
    [155, 163],
  ],
  50: [
    [-130, -56],
    [-10, -6],
    [-5, 2],
    [4, 140],
    [142, 145],
    [156, 162],
  ],
  45: [
    [-125, -53],
    [-5, 143],
  ],
  40: [
    [-124, -70],
    [-9, 3],
    [8, 28],
    [41, 48],
    [53, 132],
    [140, 145],
  ],
  35: [
    [-123, -76],
    [-9, -1],
    [-2, 11],
    [12, 18],
    [20, 122],
    [126, 129],
    [132, 141],
  ],
  30: [
    [-120, -80],
    [-10, 122],
    [130, 135],
  ],
  25: [
    [-115, -97],
    [-82, -80],
    [-15, 34],
    [35, 50],
    [56, 122],
  ],
  20: [
    [-106, -97],
    [-84, -75],
    [-17, 37],
    [39, 60],
    [69, 88],
    [89, 121],
  ],
  15: [
    [-105, -83],
    [-74, -68],
    [-17, 40],
    [43, 52],
    [73, 83],
    [94, 108],
    [120, 122],
  ],
  10: [
    [-90, -83],
    [-73, -62],
    [-17, 51],
    [74, 80],
    [98, 109],
    [120, 126],
  ],
  5: [
    [-84, -52],
    [-13, 49],
    [79, 82],
    [98, 104],
    [117, 127],
  ],
  0: [
    [-80, -50],
    [9, 42],
    [95, 105],
    [109, 119],
    [120, 128],
  ],
  [-5]: [
    [-81, -40],
    [9, 41],
    [101, 106],
    [110, 117],
    [119, 123],
    [131, 150],
  ],
  [-10]: [
    [-80, -35],
    [12, 40],
    [105, 115],
    [138, 150],
  ],
  [-15]: [
    [-77, -38],
    [13, 41],
    [48, 50],
    [130, 143],
  ],
  [-20]: [
    [-71, -39],
    [12, 40],
    [44, 50],
    [122, 146],
  ],
  [-25]: [
    [-70, -41],
    [14, 35],
    [43, 48],
    [114, 150],
  ],
  [-30]: [
    [-71, -48],
    [15, 32],
    [114, 153],
  ],
  [-35]: [
    [-71, -52],
    [18, 28],
    [116, 124],
    [135, 152],
  ],
  [-40]: [
    [-73, -57],
    [140, 150],
    [174, 178],
  ],
  [-45]: [
    [-74, -63],
    [145, 148],
    [168, 175],
  ],
  [-50]: [
    [-75, -66],
    [166, 170],
  ],
  [-55]: [
    [-74, -65],
    [-61, -58],
  ],
  [-65]: [[-65, -55]],
  [-70]: [
    [-180, -130],
    [-75, -55],
    [0, 180],
  ],
  [-75]: [[-180, 180]],
  [-80]: [[-180, 180]],
  [-85]: [[-180, 180]],
  [-90]: [[-180, 180]],
};

export function isLand(lat: number, lng: number) {
  const band = Math.floor(lat / 5) * 5;
  const ranges = LAND[band];
  if (!ranges) return false;
  return ranges.some(([a, b]) => lng >= a && lng <= b);
}

// Three.js convention: y is up, the prime meridian faces +x after the 180° shift.
export function latLngToXYZ(lat: number, lng: number, r = 1): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

// Evenly spread points on the sphere (Fibonacci lattice), kept only where there's land.
export function landDots(count: number) {
  const out: Array<{ lat: number; lng: number }> = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const lat = (Math.asin(y) * 180) / Math.PI;
    let lng = ((i * golden * 180) / Math.PI) % 360;
    if (lng > 180) lng -= 360;
    if (isLand(lat, lng)) out.push({ lat, lng });
  }
  return out;
}

// Angular distance in degrees between two lat/lng points.
export function degreesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const cos =
    Math.sin(a.lat * r) * Math.sin(b.lat * r) +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((a.lng - b.lng) * r);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / r;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// The camera's swing (DESIGN.md "Motion": calm, not bouncy): one ease-out that starts moving
// right away and settles without overshoot. Stays inside 0-1 for any t in 0-1.
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
