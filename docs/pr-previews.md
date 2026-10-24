# Testing a PR

Every PR gets **preview links** posted on it by Vercel:

| Link | What it is |
|---|---|
| `huddle-app` | The Expo app's web build at phone size. Open it on your laptop (DevTools → phone view) or on your phone's browser. |
| `huddle-web` | The landing page. |

Click the link in the PR's Vercel comment, test, and leave feedback on the PR. No installs.

Limits: the web build can't show Android-only parts (notification listener, real notifications,
native maps). Those are tested on the demo phone.

## One-time setup (Arun)

1. Sign in at [vercel.com](https://vercel.com) with GitHub and allow access to `hacktx` only.
2. **Add New → Project → import `arunbagavathiannan/hacktx`.**
   - Project name: `huddle-web`, Root Directory: `apps/web`. Framework: Next.js (auto). Deploy.
3. **Add New → Project → import the same repo again.**
   - Project name: `huddle-app`, Root Directory: `apps/mobile`. Settings come from
     `apps/mobile/vercel.json`. Deploy.
4. Done. Every PR now gets both preview links, and `main` deploys to production.
