import { Placeholder } from "@/components/Placeholder";

// TODO(booked + share builder): confirmation + share card back to the group chat.
export default function Booked() {
  return (
    <Placeholder
      step="Step 5 · Booked"
      title="You're going to Denver"
      description="Confirmation (mocked) and a share card to send back to the group chat."
      next={{ href: "/", label: "Done" }}
    />
  );
}
