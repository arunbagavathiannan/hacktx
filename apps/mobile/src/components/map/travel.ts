import type { Flight } from "@/mocks/types";

// How a way of getting there reads on screen: flights by times and stops, trains/buses/
// driving by how long they take. A train or bus fare that isn't known up front says so
// instead of showing $0; driving is a gas estimate, marked "~".

export const isGround = (f: Flight) => Boolean(f.mode && f.mode !== "fly");

export function travelPrice(f: Flight) {
  if (f.priceKnown === false) return "Fare on site";
  return `${f.mode === "drive" ? "~" : ""}$${f.pricePerPerson}`;
}

export function travelDetail(f: Flight) {
  if (!isGround(f)) return `${f.depart} · ${f.stops === 0 ? "Nonstop" : `${f.stops} stop`}`;
  return f.mode === "drive" ? `${f.duration} · gas, split` : f.duration;
}
