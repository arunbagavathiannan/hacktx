# Next steps

What Huddle does after the hackathon MVP. Use this to answer "what would you build next?"
and to pick up work if we have time left. Not part of the demo.

## Privacy

Huddle reads people's chats, so privacy has to be built in, not added later.

**Already in the MVP**
- Only chats from apps the user turns on (WhatsApp, Instagram) are read.
- Messages are filtered on the phone; only chats that look like plans go to the AI.
- The agent can't send messages, book, or pay without a tap.

**Next**
- **Per-chat control:** turn Huddle on or off for each group chat, plus a "pause Huddle" switch.
- **Friends' consent:** let group members know Huddle is in use and let them opt out of
  having their messages analyzed.
- **Data retention:** delete raw messages right after detection; keep only the plan.
  Auto-delete old plans; "delete my data" in settings.
- **On-device detection:** run the plan detector on the phone so most messages never leave it.
- **Clear disclosure:** a plain-language screen explaining notification access before the
  user grants it (Google Play requires this anyway).
- **Security:** encrypt stored plans, row-level security in Supabase, no API keys in the app.

## Payments

Mentor feedback: users only trust an agent with money if it's accurate and they stay in
control (example: ordering agents that skipped the $30 coupons and made the news).

**Plan**
1. **Stripe** for card payments (check with MLH for sponsor credits or offers).
2. **Confirm before pay:** the agent shows the final price, what's included, and the
   cancellation policy; nothing is charged without a tap.
3. **Split the cost:** each group member pays their share through their own payment link.
4. **Deal and coupon check:** before checkout, the agent checks for discounts and shows what
   it applied, so it never skips a coupon.
5. **Spending limits:** a max per trip set by the user; the agent can't go over it.
6. **Receipts and undo:** every booking has a receipt in the app and a clear cancel path.

**Open questions**
- Real booking needs partner APIs (hotels, airlines); SerpAPI only finds options. Which
  booking partners?
- How Huddle makes money: a small booking fee, affiliate commissions from booking partners,
  or a premium tier. Not decided.

## Platforms

- **iOS:** iMessage/SMS through a Shortcuts automation (iOS doesn't let apps read other apps'
  notifications).
- **More chat apps:** Messenger, Discord, and others through the same notification listener.
- **Web app:** plan from a laptop; the landing page is the first step.

## Features

- **Memory:** remembers the group's preferences and past trips.
- **Daily brief:** reminders of plans friends mentioned in past chats.
- **Preferences:** checkboxes for what you like, fed into the plan.
- **Gamification:** streaks or badges for groups that actually follow through on plans.
