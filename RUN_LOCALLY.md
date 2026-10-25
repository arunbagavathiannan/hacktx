# Run Huddle on your laptop

Huddle runs in your web browser on any Mac, Windows or Linux laptop. These steps take about
5 minutes.

## 1. Install the tools (once)

- **Node.js 24**: download the LTS version from https://nodejs.org
- **Git**: https://git-scm.com (already installed on most Macs)

You don't need to install pnpm; the commands below run it through `npx`.

## 2. Get the code

```bash
git clone https://github.com/arunbagavathiannan/hacktx.git
cd hacktx
npx pnpm@10.31.0 install
```

## 3. Add the keys (for the live version)

Create a file named `.env` inside `apps/mobile/` with these three lines:

```
EXPO_PUBLIC_SUPABASE_URL=<ask the team>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ask the team>
EXPO_PUBLIC_HUDDLE_LIVE=1
```

Ask a teammate for the two values privately (not in a public chat). `.env` is never committed
to git.

Skip this step to run the offline sample demo instead: it works with no keys and makes no
API calls.

## 4. Start the app

```bash
cd apps/mobile
npx expo start --web
```

Open **http://localhost:8081** in your browser. For a phone-sized view, open the browser's
developer tools and switch to a phone screen size.

## 5. Try it

1. Go through onboarding (or tap **Skip**).
2. Tap **Simulate a plan** to open the group chat (**hackers**).
3. Pick who's talking with the **From** row, and type messages.

**The stage demo (fast, dummy data):** send **"Are we ever going to go on the Japan trip"**.
The rest of the group's chat plays by itself, then tap **Plan it** for a quick Tokyo plan:
timeline, map, and booking. It makes no API calls.

**The live agent:** type any other trip chat (for example *"we should go to Nashville in
March, $800 each"*). Huddle detects the plan with Muse Spark, asks the group anything that's
missing, and plans with real flights, hotels and places from SerpAPI. This uses the team's
API credits, so keep test runs short.

## Troubleshooting

- **"Port 8081 is in use":** another copy is already running. Stop it, or run
  `npx expo start --web --port 8082` and open http://localhost:8082.
- **The page is blank:** wait for the first build to finish (about 30 seconds), then refresh.
- **It says "Couldn't read the chat" or doesn't plan:** check that `apps/mobile/.env` has
  the right values, then stop the app (Ctrl + C) and start it again. `.env` is only read at
  start.
- **Stuck on an old screen:** go back to Home and tap **Simulate a plan** again; every run
  starts fresh.
