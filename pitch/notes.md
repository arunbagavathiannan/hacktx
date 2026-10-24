# Pitch notes

Talking points for the script (`/pitch`) and Devpost (`/submit`). Keep this updated as we
get feedback.

## Thesis

**Huddle takes the plans out of the GC.** Every feature should answer: does this help a
group chat actually turn into a trip? If not, it goes in "What's next", not the demo.

## Why you can trust Huddle's agent

Mentor feedback: users won't hand an agent real decisions (or money) unless they trust it.
Example of what goes wrong: food-ordering agents that placed orders without applying the $30
coupons meant to cover them, which became bad press.

How Huddle earns trust (say this in the pitch, show it in the demo):
- **You see every step.** The live "Huddle is working" timeline shows each search and
  decision as it happens.
- **People decide, the agent proposes.** Nothing is booked, sent, or paid without a tap.
- **The group votes.** The agent tallies; it doesn't overrule the group.
- **Real data, not guesses.** Prices and places come from SerpAPI and Google, with sources shown.
- **It asks when it's unsure.** Missing dates or budget? It asks instead of assuming.
- **Privacy:** only chats from apps you turn on, filtered on the phone, and only plan-like
  chats go to the AI.

## What's next (for "what would you build next?")

1. **Payments and real booking.** Stripe (check with MLH for sponsor offers), with
   confirm-before-pay, spending limits, and automatic coupon/deal checks.
2. **iOS.** iMessage/SMS through a Shortcuts automation.
3. **More chat apps.** Messenger, Discord, and others through the same notification listener.
4. **Web app.** Plan from a laptop, not just a phone (the landing page is the first step).
5. **Memory.** Remembers the group's preferences and past trips.
6. **Daily brief.** Reminds you of plans friends mentioned in past chats.

## Likely judge questions

- *Is it reading my friends' messages?* See privacy above.
- *What's real vs. mocked?* Notification reading, the agent, maps, and search results are real.
  Booking is mocked.
- *Why not Meta's API?* Meta doesn't expose personal chats to outside apps; notifications
  work with the apps people already use.
- *How do you stop the agent from making mistakes with money?* See trust above.
