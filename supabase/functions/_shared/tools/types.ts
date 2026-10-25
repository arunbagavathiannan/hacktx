// Shared types for the planner agent's tools. Tool definitions use the OpenAI function-calling
// shape, which Muse Spark accepts (see "Agent design" in CLAUDE.md).

export type Category = "flight" | "hotel" | "restaurant" | "activity";

export type PlanStatus = "planning" | "needs_input" | "voting" | "ready" | "booked" | "failed";

export interface ChatMessage {
  sender: string;
  text: string;
  sentAt: string;
}

export interface Place {
  city: string;
  airport?: string;
  lat?: number;
  lng?: number;
}

// A real way to book one option, from SerpAPI (Google Flights booking options or Google
// Hotels property prices). Huddle links out; it never takes payment.
export interface BookingOffer {
  ref: string;
  seller: string;
  // Per person for flights, the whole stay for one room for hotels.
  priceCents: number;
  url?: string;
  phone?: string;
  official?: boolean;
  // Google Flights hands off with a POST (open it as a form submit).
  bookingRequest?: { url: string; post_data: string };
}

export interface Booking {
  confirmationCode: string;
  refs: string[];
  totalCents: number;
  createdAt: string;
  // Cheapest live offer first, per option. Empty without SerpAPI.
  offers: BookingOffer[];
}

// extract_trip output, stored in plans.trip.
export interface Trip {
  origin?: Place;
  destination?: Place;
  startDate?: string;
  endDate?: string;
  people: string[];
  budgetPerPersonUsd?: number;
  constraints: string[];
  // Things the chat didn't settle (e.g. "dates", "budget"). The agent asks about these.
  missing: string[];
  booking?: Booking;
}

// A search result in one common shape, whatever API it came from. `ref` (e.g. "hotel_2") is
// the id the model uses for every later tool call.
export interface Option {
  ref: string;
  category: Category;
  title: string;
  subtitle?: string;
  priceCents?: number;
  currency: "USD";
  url?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  // Raw fields from the source API, so the verifier can check prices and links against them.
  details: Record<string, unknown>;
}

// An option saved to plan_options.
export interface StoredOption extends Option {
  id: string;
  isSelected: boolean;
}

export interface Vote {
  optionId: string;
  voterName: string;
}

export interface Plan {
  id: string;
  status: PlanStatus;
  title: string | null;
  summary: string | null;
  trip: Trip;
  pendingQuestion: string | null;
}

export type PlanPatch = Partial<Omit<Plan, "id">>;

// Where tools read and write plan state. supabaseStore() in production, memoryStore() in tests.
export interface PlanStore {
  getPlan(planId: string): Promise<Plan>;
  updatePlan(planId: string, patch: PlanPatch): Promise<void>;
  insertOptions(planId: string, options: Option[]): Promise<StoredOption[]>;
  listOptions(planId: string): Promise<StoredOption[]>;
  insertVotes(planId: string, votes: Vote[]): Promise<void>;
  listVotes(planId: string): Promise<Vote[]>;
  // Marks one option as the winner of its category and clears the others.
  selectOption(planId: string, category: Category, optionId: string): Promise<void>;
}

export interface ToolContext {
  planId: string;
  store: PlanStore;
  // Recent messages from the chat the plan came from.
  chat: ChatMessage[];
  // The phone owner (the person who tapped the notification).
  userName: string;
  // Search results from this run, by ref. pin_on_map saves picks from here.
  found: Map<string, Option>;
  // True only when the user tapped "Book" in the app. book refuses otherwise.
  bookingConfirmed: boolean;
}

export interface ToolResult {
  // One line for agent_steps.result_summary ("Found 5 hotels from $189/night").
  summary: string;
  // What goes back to the model as the tool message.
  data: unknown;
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export type ToolArgs = Record<string, unknown>;

export interface Tool<A = ToolArgs> {
  name: string;
  description: string;
  parameters: JsonSchema;
  // One line for agent_steps.input_summary ("Searching flights AUS → DEN").
  describe(args: A): string;
  // Overrides runTool's default 8 s limit (book makes several SerpAPI calls).
  timeoutMs?: number;
  run(args: A, ctx: ToolContext): Promise<ToolResult>;
}

// Thrown by a tool for a problem the model can fix or work around. runTool sends the message
// back to the model instead of failing the run.
export class ToolError extends Error {}
