import { Placeholder } from "@/components/Placeholder";

// TODO(onboarding + summary builder): trip summary + tap-to-answer clarifications.
export default function Summary() {
  return (
    <Placeholder
      step="Step 3 · Summary"
      title="Denver weekend"
      description="Who, where, when, budget, plus one or two quick questions the chat didn't answer."
      next={{ href: "/plan/map", label: "Open the map" }}
    />
  );
}
