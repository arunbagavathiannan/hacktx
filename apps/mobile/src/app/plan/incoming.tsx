import { Placeholder } from "@/components/Placeholder";

// TODO(popup + timeline builder): simulate the group chat + heads-up "Plan it?" popup.
export default function Incoming() {
  return (
    <Placeholder
      step="Step 1 · Popup"
      title="Planning Denver with Sam?"
      description="Heads-up notification Huddle shows when a chat turns into a plan."
      next={{ href: "/plan/working", label: "Plan it" }}
    />
  );
}
