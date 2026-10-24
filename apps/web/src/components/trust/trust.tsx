"use client";

import {
  ChatCircleDots,
  Database,
  Eye,
  HandTap,
  LockKey,
  SealCheck,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { animate, createScope, onScroll, splitText, stagger, utils } from "animejs";
import { useEffect, useRef } from "react";

// Talking points from pitch/notes.md ("Why you can trust Huddle's agent"). Same motion language
// as How it works: heading words rise out of a clip mask, then the grid staggers in.

const POINTS: { icon: typeof Eye; title: string; body: string }[] = [
  {
    icon: Eye,
    title: "You see every step",
    body: "The live “Huddle is working” timeline shows each search and decision as it happens. No black box.",
  },
  {
    icon: HandTap,
    title: "It proposes. You decide.",
    body: "Nothing is booked, sent, or paid without a tap from you. The agent never acts on its own.",
  },
  {
    icon: UsersThree,
    title: "The group votes",
    body: "Huddle tallies the votes and goes with the group. It doesn't overrule anyone.",
  },
  {
    icon: Database,
    title: "Real data, not guesses",
    body: "Prices and places come straight from Google Flights, Google Hotels, and Google Places, with sources shown.",
  },
  {
    icon: ChatCircleDots,
    title: "It asks when it's unsure",
    body: "Missing dates or a budget? Huddle asks the group instead of assuming.",
  },
  {
    icon: LockKey,
    title: "Private by default",
    body: "Only the apps you turn on. Filtering happens on your phone, and only chats that look like plans go to the AI.",
  },
];

const EASE = "outExpo";

export function Trust() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const scope = createScope({
      root,
      mediaQueries: { reduce: "(prefers-reduced-motion: reduce)" },
    }).add((self) => {
      if (!root.current || self?.matches.reduce) return;
      const $ = (selector: string) =>
        Array.from((root.current as HTMLElement).querySelectorAll<HTMLElement>(selector));

      const title = splitText(".trust-title", { words: { wrap: "clip" } });
      utils.set(title.words, { translateY: "105%" });
      animate(title.words, {
        translateY: "0%",
        duration: 1100,
        delay: stagger(70),
        ease: EASE,
        autoplay: onScroll({ target: ".trust-title", enter: "88% top", repeat: false }),
      });

      utils.set($(".trust-intro"), { opacity: 0, translateY: 20 });
      animate($(".trust-intro"), {
        opacity: 1,
        translateY: 0,
        duration: 1000,
        delay: stagger(90, { start: 250 }),
        ease: EASE,
        autoplay: onScroll({ target: ".trust-title", enter: "88% top", repeat: false }),
      });

      // Grid cells rise in row by row; the icon pops slightly after its cell.
      const cells = $(".trust-cell");
      utils.set(cells, { opacity: 0, translateY: 32 });
      utils.set($(".trust-icon"), { scale: 0.5, opacity: 0 });
      animate(cells, {
        opacity: 1,
        translateY: 0,
        duration: 1100,
        delay: stagger(90),
        ease: EASE,
        autoplay: onScroll({ target: ".trust-grid", enter: "85% top", repeat: false }),
      });
      animate($(".trust-icon"), {
        opacity: { to: 1, duration: 300, ease: "outQuad" },
        scale: 1,
        duration: 800,
        delay: stagger(90, { start: 200 }),
        ease: "outBack(2)",
        autoplay: onScroll({ target: ".trust-grid", enter: "85% top", repeat: false }),
      });

      utils.set($(".trust-verify"), { opacity: 0, translateY: 32 });
      animate($(".trust-verify"), {
        opacity: 1,
        translateY: 0,
        duration: 1100,
        ease: EASE,
        autoplay: onScroll({ target: ".trust-verify", enter: "88% top", repeat: false }),
      });

      return () => title.revert();
    });

    return () => scope.revert();
  }, []);

  return (
    <section
      id="trust"
      ref={root}
      className="relative mx-auto w-full max-w-7xl scroll-mt-8 px-6 py-28 md:px-10 md:py-40"
    >
      <div className="max-w-3xl">
        <p className="trust-intro inline-flex items-center gap-2 rounded-full border border-cream/10 px-3 py-1 text-xs tracking-wide text-cream/60">
          <span className="size-1.5 rounded-full bg-coral" />
          Why you can trust Huddle
        </p>
        <h2 className="trust-title mt-6 font-display text-[clamp(2.75rem,6.5vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-cream">
          An agent you&rsquo;d hand the plans to.
        </h2>
        <p className="trust-intro mt-6 max-w-xl text-base leading-relaxed text-cream/60 md:text-lg">
          Nobody gives an agent real decisions, or real money, unless they can see what it&rsquo;s
          doing. So Huddle shows its work and leaves the calls to you.
        </p>
      </div>

      <ul className="trust-grid mt-16 grid gap-px overflow-hidden rounded-3xl border border-cream/8 bg-cream/8 sm:grid-cols-2 md:mt-24 lg:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="trust-cell bg-ink p-7 md:p-9">
            <span className="trust-icon grid size-11 place-items-center rounded-full bg-coral/12 text-coral">
              <Icon size={22} weight="regular" />
            </span>
            <h3 className="mt-6 font-display text-xl font-semibold tracking-[-0.02em] text-cream md:text-2xl">
              {title}
            </h3>
            <p className="mt-2.5 text-[15px] leading-relaxed text-cream/55">{body}</p>
          </li>
        ))}
      </ul>

      <div className="trust-verify mt-6 flex flex-col gap-6 rounded-3xl bg-coral p-7 text-ink md:mt-8 md:flex-row md:items-center md:gap-10 md:p-10">
        <SealCheck size={44} weight="fill" className="shrink-0" />
        <div className="max-w-3xl">
          <h3 className="font-display text-2xl font-semibold tracking-[-0.025em] md:text-3xl">
            A second pass checks the plan before you see it.
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/75 md:text-base">
            Agents that skip the coupon or book the wrong date make headlines. Huddle&rsquo;s
            verifier rechecks every price and link against the search results, matches dates and
            people to the chat, holds the budget, and looks for deals. If something&rsquo;s off, it
            fixes it or asks the group.
          </p>
        </div>
      </div>
    </section>
  );
}
