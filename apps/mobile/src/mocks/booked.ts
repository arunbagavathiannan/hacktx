// MOCK: booking confirmation for the demo. Nothing is booked or paid; the `book` tool is
// mocked end to end (see CLAUDE.md "Real vs. mocked"). These are the assumptions the booked
// screen uses to turn the picked flight/hotel/activity into a per-person cost.

export const booking = {
  confirmation: "HDL-DEN-1113", // shown as a reference code, clearly labeled as simulated
  bookedBy: "you", // Member.id
  // Hotel split: Fri + Sat night, 2 rooms (two queens each) shared by the 5 of you.
  stay: { nights: 2, rooms: 2 },
};
