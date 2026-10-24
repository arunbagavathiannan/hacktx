import {
  AirplaneTilt,
  Bed,
  CheckCircle,
  CircleNotch,
  ForkKnife,
  InstagramLogo,
  ShieldCheck,
  UsersThree,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

// Placeholder vignettes for each step. Elements tagged with data-item / data-drop / data-pop /
// data-bar / data-count are picked up by the scroll animations in how-it-works.tsx.

function Notification({
  app,
  icon,
  title,
  sender,
  text,
  time,
}: {
  app: string;
  icon: ReactNode;
  title: string;
  sender: string;
  text: string;
  time: string;
}) {
  return (
    <div data-item className="hiw-surface flex items-start gap-3 px-4 py-3.5">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] text-cream/45">
          {app} · {title}
          <span className="ml-auto">{time}</span>
        </p>
        <p className="mt-0.5 text-sm text-cream">
          <span className="font-semibold">{sender}</span>{" "}
          <span className="text-cream/80">{text}</span>
        </p>
      </div>
    </div>
  );
}

export function ChatVisual() {
  const whatsapp = (
    <span className="hiw-app bg-[#25d366] text-ink">
      <WhatsappLogo size={18} weight="fill" />
    </span>
  );
  return (
    <div className="flex w-full max-w-sm flex-col gap-2.5">
      <Notification
        app="WhatsApp"
        icon={whatsapp}
        title="Weekend crew"
        sender="Sam"
        text="we should do Austin next month"
        time="now"
      />
      <Notification
        app="WhatsApp"
        icon={whatsapp}
        title="Weekend crew"
        sender="Priya"
        text="omg yes. ACL weekend??"
        time="now"
      />
      <Notification
        app="Instagram"
        icon={
          <span className="hiw-app border border-cream/15 text-cream">
            <InstagramLogo size={18} weight="regular" />
          </span>
        }
        title="jordan.r"
        sender="Jordan"
        text="i'm in if it's under $600"
        time="1m"
      />
    </div>
  );
}

export function DetectVisual() {
  return (
    <div className="flex w-full max-w-sm flex-col items-stretch gap-4">
      <div
        data-drop
        className="rounded-[22px] bg-cream p-4 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-ink font-display text-base font-semibold text-cream">
            h<span className="text-coral">.</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-ink/50">Huddle · now</p>
            <p className="font-display text-base font-semibold leading-tight tracking-[-0.01em]">
              Planning Austin with Sam?
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-ink/60">Weekend crew · Oct 9–12 · about $600 each</p>
        <div className="mt-4 flex gap-2">
          <span data-pop className="hiw-cta rounded-full bg-coral px-4 py-2 text-sm font-semibold">
            Plan it
          </span>
          <span className="rounded-full px-4 py-2 text-sm font-semibold text-ink/50">Not now</span>
        </div>
      </div>
      <p data-item className="inline-flex items-center gap-2 self-center text-xs text-cream/45">
        <ShieldCheck size={14} weight="regular" />
        Filtered on your phone. Only plan-like chats leave it.
      </p>
    </div>
  );
}

const AGENT_STEPS = [
  {
    icon: UsersThree,
    label: "Reading the chat",
    detail: "4 people · Oct 9–12 · $600 cap",
    done: true,
  },
  {
    icon: AirplaneTilt,
    label: "Searching flights DEN → AUS",
    detail: "12 options from $148",
    done: true,
  },
  { icon: Bed, label: "Finding hotels near South Congress", detail: "8 under budget", done: true },
  { icon: ForkKnife, label: "Pinning tacos and live music", detail: "Working…", done: false },
];

export function AgentVisual() {
  return (
    <div className="hiw-surface w-full max-w-sm p-2">
      <p
        data-item
        className="flex items-center gap-2 px-3 pt-2 pb-3 text-xs font-medium text-cream/50"
      >
        <span className="hiw-live" />
        Huddle is working
      </p>
      <ul>
        {AGENT_STEPS.map(({ icon: Icon, label, detail, done }) => (
          <li
            key={label}
            data-item
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 data-[running=true]:bg-cream/[0.04]"
            data-running={!done}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream/[0.06] text-cream/70">
              <Icon size={16} weight="regular" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-cream">{label}</p>
              <p className="text-xs text-cream/45">{detail}</p>
            </div>
            {done ? (
              <span data-pop className="text-coral">
                <CheckCircle size={18} weight="fill" />
              </span>
            ) : (
              <span className="hiw-spin text-cream/40">
                <CircleNotch size={18} weight="regular" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const POLL = [
  { name: "Hotel San José", price: "$289/night", votes: 4 },
  { name: "Kimber Modern", price: "$342/night", votes: 1 },
  { name: "Austin Motel", price: "$196/night", votes: 0 },
];
const VOTERS = 5;

export function VoteVisual() {
  return (
    <div className="hiw-surface w-full max-w-sm p-5">
      <p data-item className="font-display text-lg font-semibold tracking-[-0.01em] text-cream">
        Where are we staying?
      </p>
      <p data-item className="mt-0.5 text-xs text-cream/45">
        Weekend crew · 5 of 5 voted
      </p>
      <ul className="mt-4 flex flex-col gap-3.5">
        {POLL.map(({ name, price, votes }, i) => (
          <li key={name} data-item>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={i === 0 ? "font-semibold text-cream" : "text-cream/75"}>{name}</span>
              <span className="text-xs text-cream/45">
                {price} · <span data-count={votes}>{votes}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream/[0.07]">
              <div
                data-bar={votes / VOTERS}
                className={`hiw-bar h-full rounded-full ${i === 0 ? "bg-coral" : "bg-cream/30"}`}
                style={{ transform: `scaleX(${votes / VOTERS})` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div
        data-pop
        className="mt-5 flex items-center justify-between rounded-full bg-coral py-2 pr-2 pl-4 text-ink"
      >
        <span className="text-sm font-semibold">Book Hotel San José</span>
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-cream">
          Oct 9–12
        </span>
      </div>
    </div>
  );
}
