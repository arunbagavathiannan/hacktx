import { Placeholder } from "@/components/Placeholder";

// TODO(popup + timeline builder): live "Huddle is working" timeline from mocks.agentSteps.
export default function Working() {
  return (
    <Placeholder
      step="Step 2 · Agent timeline"
      title="Huddle is working"
      description="Each agent step appears live: reading the chat, searching flights, hotels, places, verifying."
      next={{ href: "/plan/summary", label: "See the plan" }}
    />
  );
}
