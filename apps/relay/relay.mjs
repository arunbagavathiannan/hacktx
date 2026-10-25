// Mac relay: Huddle's side of one iMessage group chat. It reads new messages from
// ~/Library/Messages/chat.db (read-only), spots a plan with Huddle's detector, speaks in the
// chat through Messages, and runs the planner when the group types "send". The phone app only
// shows the plan (GET /state). Runs on the Mac because iOS pauses apps in the background.
// Run: HOST=0.0.0.0 CHAT="Austin crew" node apps/relay/relay.mjs
// Needs Full Disk Access (to read Messages) and permission to control Messages, for your terminal.
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { DatabaseSync } from "node:sqlite";

const CHAT = process.env.CHAT;
const PORT = Number(process.env.PORT ?? 8790);
if (!CHAT) throw new Error('Set CHAT to the group name or contact, e.g. CHAT="Austin crew"');

// Supabase URL and anon key, the same ones the app uses (apps/mobile/.env).
const env = Object.fromEntries(
  readFileSync(new URL("../mobile/.env", import.meta.url), "utf8")
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^["']|["']$/g, "")]),
);
const SUPABASE = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE || !ANON) throw new Error("apps/mobile/.env needs the Supabase URL and anon key");

// Optional phone/email → name, e.g. { "+15125551234": "Sam" }.
let names = {};
try {
  names = JSON.parse(readFileSync(new URL("./names.json", import.meta.url), "utf8"));
} catch {}

const db = new DatabaseSync(`${homedir()}/Library/Messages/chat.db`, { readOnly: true });
const chat = db
  .prepare(
    "SELECT ROWID id, guid, display_name name FROM chat WHERE display_name = ? OR chat_identifier = ? LIMIT 1",
  )
  .get(CHAT, CHAT);
if (!chat) throw new Error(`No chat named "${CHAT}" in Messages`);

const rows = db.prepare(`
  SELECT m.ROWID id, m.text, m.attributedBody body, m.is_from_me me, m.date / 1000000 ms, h.id handle
  FROM message m JOIN chat_message_join j ON j.message_id = m.ROWID
  LEFT JOIN handle h ON h.ROWID = m.handle_id
  WHERE j.chat_id = ? AND m.ROWID > ? ORDER BY m.ROWID`);

// Newer macOS keeps the text only in attributedBody (a serialized NSAttributedString).
function bodyText(buf) {
  if (!buf) return null;
  const b = Buffer.from(buf);
  let i = b.indexOf("NSString");
  if (i < 0) return null;
  i += "NSString".length + 5;
  let len = b[i++];
  if (len === 0x81) {
    len = b.readUInt16LE(i);
    i += 2;
  }
  return b.subarray(i, i + len).toString("utf8");
}

// ---- Huddle in the chat ----

const SEND_WORD = /^send( it)?[.!]*$/i;
// Before Huddle has said anything, it reads the chat once it goes quiet for this long.
const DETECT_AFTER_MS = 2500;

// listening → offered (asked to plan) → planning ⇄ asking (a question) → done
const state = { phase: "listening", planId: null, summary: null, last: null, error: null };
const transcript = []; // { sender, text, sentAt }, the group's messages since the relay started
let lastId = db.prepare("SELECT MAX(ROWID) n FROM message").get().n ?? 0;
let detectTimer = null;

const SEND = `on run argv
  tell application "Messages" to send (item 1 of argv) to chat id (item 2 of argv)
end run`;

// Speaks in the chat (from your account, so every line starts with "Huddle:").
function say(text) {
  execFile("osascript", ["-e", SEND, `Huddle: ${text}`, chat.guid], (err) => {
    if (err) console.error("Couldn't send to Messages:", err.message);
  });
}

async function call(fn, body) {
  const res = await fetch(`${SUPABASE}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${ANON}`,
      apikey: ANON,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${fn} failed (${res.status})`);
  return data;
}

async function detect() {
  try {
    const result = await call("detect", { user_name: "You", messages: transcript.slice(-30) });
    if (state.phase !== "listening" || !result.isPlan) return;
    state.phase = "offered";
    state.summary = result.summary;
    console.log(`Plan spotted: ${result.summary}`);
    say(
      `Want me to plan the ${result.summary}? Talk it over, then type "send" and I'll get started.`,
    );
  } catch (err) {
    console.error("Detect failed:", err.message);
  }
}

// "send": the block since Huddle's last line goes to the planner (the whole chat, for context).
async function onSend() {
  if (state.phase !== "offered" && state.phase !== "asking") return;
  const continuing = state.phase === "asking";
  state.phase = "planning";
  // Steps from before this run don't count as it asking or finishing (see watchPlan).
  runFrom = (await lastStep()) + 1;
  try {
    const { plan_id } = await call("agent", {
      plan_id: state.planId ?? undefined,
      user_name: "You",
      chat_name: chat.name || CHAT,
      chat: transcript,
    });
    state.planId = plan_id;
    console.log(`${continuing ? "Continuing" : "Planning"}: plan ${plan_id}`);
    if (!continuing) say("On it! Open Huddle to watch me plan.");
  } catch (err) {
    // "Already working": a run is still going, so just keep watching it.
    if (/already working/i.test(err.message)) return;
    state.phase = continuing ? "asking" : "offered";
    console.error("Planner didn't start:", err.message);
    say(`I couldn't start planning (${err.message}). Type "send" to try again.`);
  }
}

let runFrom = 0; // first step_index of the current planner run

async function rest(path) {
  const res = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    headers: { authorization: `Bearer ${ANON}`, apikey: ANON },
  });
  return res.json();
}

async function lastStep() {
  if (!state.planId) return -1;
  const steps = await rest(
    `agent_steps?plan_id=eq.${state.planId}&select=step_index&order=step_index.desc&limit=1`,
  ).catch(() => []);
  return steps[0]?.step_index ?? -1;
}

// While the planner works: watch this run's steps for a question or the finished plan. Only
// steps from this run count, so an earlier question never looks like a new one.
async function watchPlan() {
  if (state.phase !== "planning" || !state.planId) return;
  try {
    const steps = await rest(
      `agent_steps?plan_id=eq.${state.planId}&step_index=gte.${runFrom}&select=tool,status&order=step_index`,
    );
    const last = steps.at(-1);
    if (!last || steps.some((s) => s.status === "running")) return;
    const [plan] = await rest(`plans?id=eq.${state.planId}&select=status,pending_question`);
    if (last.tool === "ask_user" && plan?.status === "needs_input") {
      state.phase = "asking";
      say(`${plan.pending_question ?? "What should I plan?"} Talk it over, then type "send".`);
    } else if (last.tool === "verify" && last.status === "done") {
      state.phase = "done";
      say(`The ${state.summary ?? "trip"} plan is ready! Open Huddle to see it and book.`);
      console.log("Plan finished. Huddle stopped reading the chat; restart for the next plan.");
    } else if (last.tool === "error" || plan?.status === "failed") {
      state.phase = "done";
      say("I hit a snag planning this one. Sorry! Open Huddle for details.");
    }
  } catch (err) {
    console.error("Plan check failed:", err.message);
  }
}

function readChat() {
  if (state.phase === "done") return;
  const before = transcript.length;
  for (const r of rows.all(chat.id, lastId)) {
    lastId = r.id;
    const text = (r.text ?? bodyText(r.body))?.trim();
    // Huddle's own lines come back through the chat; they aren't the group talking.
    if (!text || text.startsWith("Huddle:")) continue;
    if (SEND_WORD.test(text)) {
      onSend();
      continue;
    }
    const sender = r.me ? "You" : (names[r.handle] ?? r.handle ?? "Friend");
    // Messages counts time from 2001-01-01 (the query turns it into milliseconds).
    const sentAt = new Date(Date.UTC(2001, 0, 1) + r.ms).toISOString();
    transcript.push({ sender, text, sentAt });
    state.last = { from: sender, text };
  }
  // Before Huddle speaks, it reads the chat by itself once the group pauses.
  if (state.phase === "listening" && transcript.length > before) {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(detect, DETECT_AFTER_MS);
  }
}

setInterval(() => {
  readChat();
  watchPlan();
}, 1500);

// The phone app reads this to show the plan: GET /state.
createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify({ chat: chat.name || CHAT, ...state }));
}) // HOST=0.0.0.0 lets the phone on the same network reach it.
  .listen(PORT, process.env.HOST ?? "127.0.0.1", () =>
    console.log(`Huddle is listening to "${CHAT}" on port ${PORT}`),
  );
