import { Placeholder } from "@/components/Placeholder";

// TODO(map builder): three.js globe zoom -> styled map + pins -> place detail sheet.
export default function MapScreen() {
  return (
    <Placeholder
      step="Step 4 · Map"
      title="Pick from the map"
      description="Globe zooms into Denver, then pins for hotels, food, and things to do. Tap a pin for details and add it to the plan."
      next={{ href: "/plan/booked", label: "Book the plan" }}
    />
  );
}
