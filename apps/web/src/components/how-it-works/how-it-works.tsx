"use client";

import { ChatsCircle, ListChecks, Sparkle, UsersThree } from "@phosphor-icons/react/dist/ssr";
import {
  animate,
  createScope,
  createTimeline,
  onScroll,
  splitText,
  stagger,
  type Target,
  utils,
} from "animejs";
import { type ReactNode, useEffect, useRef } from "react";
import { AgentVisual, ChatVisual, DetectVisual, VoteVisual } from "./visuals";

// Placeholder copy. Scroll motion is anime.js: a coral rail that fills with the scroll, steps
// that light up as the rail reaches them, and vignettes that build themselves on entry. Only
// transform and opacity are animated, so it stays on the compositor.

const STEPS: {
  label: string;
  icon: typeof ChatsCircle;
  title: string;
  body: string;
  visual: ReactNode;
}[] = [
  {
    label: "The chat",
    icon: ChatsCircle,
    title: "Someone floats a plan",
    body: "Your friends talk the way they always do, in WhatsApp groups and Instagram DMs. Huddle reads the messages from your notifications, only for the apps you turn on.",
    visual: <ChatVisual />,
  },
  {
    label: "The nudge",
    icon: Sparkle,
    title: "Huddle spots it",
    body: "When a chat starts sounding like a trip, Muse Spark pulls out who, where, when, and the budget. You get one quiet popup asking if you want it planned.",
    visual: <DetectVisual />,
  },
  {
    label: "The agent",
    icon: ListChecks,
    title: "The agent gets to work",
    body: "Tap the popup and Huddle is already on it. You watch it search real flights, hotels, and places, pin them on a map, and double-check prices before you see a thing.",
    visual: <AgentVisual />,
  },
  {
    label: "The group",
    icon: UsersThree,
    title: "Everyone votes. Done.",
    body: "The group picks between a few good options instead of fifty tabs. Huddle tallies the votes and proposes the final plan. Nothing gets booked until you tap.",
    visual: <VoteVisual />,
  },
];

const EASE = "outExpo";

// Per-element end value read from a data attribute, e.g. data-bar="0.8".
const fromData = (key: string) => (el: Target) => Number((el as HTMLElement).dataset[key]);

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const scope = createScope({
      root,
      mediaQueries: { reduce: "(prefers-reduced-motion: reduce)" },
    }).add((self) => {
      if (!root.current || self?.matches.reduce) return;
      const $ = (selector: string, el: ParentNode = root.current as HTMLElement) =>
        Array.from(el.querySelectorAll<HTMLElement>(selector));

      // Heading: words rise out of a clip mask.
      const title = splitText(".hiw-title", { words: { wrap: "clip" } });
      utils.set($("[data-count]"), { innerHTML: 0 });
      utils.set(title.words, { translateY: "105%" });
      animate(title.words, {
        translateY: "0%",
        duration: 1100,
        delay: stagger(70),
        ease: EASE,
        autoplay: onScroll({ target: ".hiw-title", enter: "88% top", repeat: false }),
      });

      utils.set($(".hiw-intro"), { opacity: 0, translateY: 20 });
      animate($(".hiw-intro"), {
        opacity: 1,
        translateY: 0,
        duration: 1000,
        delay: stagger(90, { start: 250 }),
        ease: EASE,
        autoplay: onScroll({ target: ".hiw-title", enter: "88% top", repeat: false }),
      });

      // Rail: fills to wherever the middle of the screen is, lerped so it glides.
      animate(".hiw-rail__fill", {
        scaleY: [0, 1],
        ease: "linear",
        autoplay: onScroll({
          target: ".hiw-steps",
          enter: "center top",
          leave: "center bottom",
          sync: 0.6,
        }),
      });

      for (const step of $("[data-step]")) {
        const dot = step.querySelector<HTMLElement>(".hiw-dot");
        if (dot) {
          onScroll({
            target: dot,
            enter: "center center",
            leave: "top top",
            onUpdate: (o) => step.toggleAttribute("data-active", o.progress > 0),
          });
        }

        const copy = $("[data-reveal]", step);
        utils.set(copy, { opacity: 0, translateY: 28 });
        animate(copy, {
          opacity: 1,
          translateY: 0,
          duration: 1100,
          delay: stagger(80),
          ease: EASE,
          autoplay: onScroll({ target: step, enter: "82% top", repeat: false }),
        });

        const visual = step.querySelector<HTMLElement>(".hiw-visual");
        if (!visual) continue;

        // Gentle parallax on the vignette's frame, separate from its own build-in.
        animate(visual, {
          translateY: [40, -40],
          ease: "linear",
          autoplay: onScroll({
            target: visual,
            enter: "bottom top",
            leave: "top bottom",
            sync: 0.5,
          }),
        });

        const items = $("[data-item]", visual);
        const drops = $("[data-drop]", visual);
        const pops = $("[data-pop]", visual);
        const bars = $("[data-bar]", visual);
        const counts = $("[data-count]", visual);
        utils.set(items, { opacity: 0, translateY: 24, scale: 0.97 });
        utils.set(drops, { opacity: 0, translateY: -48, scale: 0.92 });
        utils.set(pops, { opacity: 0, scale: 0.6 });
        utils.set(bars, { scaleX: 0 });

        const tl = createTimeline({
          autoplay: onScroll({ target: visual, enter: "78% top", repeat: false }),
        });
        if (drops.length) {
          tl.add(drops, {
            opacity: { to: 1, duration: 500, ease: "outQuad" },
            translateY: 0,
            scale: 1,
            duration: 1000,
            ease: "outBack(1.3)",
          });
        }
        if (items.length) {
          tl.add(
            items,
            {
              opacity: 1,
              translateY: 0,
              scale: 1,
              duration: 900,
              delay: stagger(110),
              ease: EASE,
            },
            drops.length ? "-=500" : 0,
          );
        }
        if (bars.length) {
          tl.add(
            bars,
            {
              scaleX: fromData("bar"),
              duration: 1200,
              delay: stagger(120),
              ease: "outQuart",
            },
            "-=600",
          );
          tl.add(
            counts,
            {
              innerHTML: fromData("count"),
              modifier: utils.round(0),
              duration: 1200,
              delay: stagger(120),
              ease: "outQuart",
            },
            "<<",
          );
        }
        if (pops.length) {
          tl.add(
            pops,
            {
              opacity: { to: 1, duration: 300, ease: "outQuad" },
              scale: 1,
              duration: 700,
              delay: stagger(140),
              ease: "outBack(2)",
            },
            "-=500",
          );
        }
      }

      return () => title.revert();
    });

    return () => scope.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={root}
      className="relative mx-auto w-full max-w-7xl scroll-mt-8 px-6 py-28 md:px-10 md:py-40"
    >
      <div className="max-w-3xl">
        <p className="hiw-intro inline-flex items-center gap-2 rounded-full border border-cream/10 px-3 py-1 text-xs tracking-wide text-cream/60">
          <span className="size-1.5 rounded-full bg-coral" />
          How it works
        </p>
        <h2 className="hiw-title mt-6 font-display text-[clamp(2.75rem,6.5vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-cream">
          From &ldquo;we should&rdquo; to booked.
        </h2>
        <p className="hiw-intro mt-6 max-w-xl text-base leading-relaxed text-cream/60 md:text-lg">
          Huddle sits quietly on your phone until a group chat turns into a plan. Then it does the
          boring part, so the trip actually happens.
        </p>
      </div>

      <div className="hiw-steps relative mt-20 md:mt-32">
        <div aria-hidden className="hiw-rail">
          <div className="hiw-rail__fill" />
        </div>

        <ol>
          {STEPS.map(({ label, icon: Icon, title, body, visual }, i) => (
            <li
              key={title}
              data-step
              className="hiw-step relative grid items-center gap-10 pb-28 pl-14 last:pb-0 md:pl-24 md:pb-44 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16"
            >
              <div className="relative max-w-md">
                <span aria-hidden className="hiw-dot">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  data-reveal
                  className="hiw-label inline-flex items-center gap-2 text-sm font-medium text-cream/50"
                >
                  <Icon size={18} weight="regular" />
                  {label}
                </p>
                <h3
                  data-reveal
                  className="mt-4 font-display text-[clamp(1.875rem,3.4vw,2.75rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-cream"
                >
                  {title}
                </h3>
                <p data-reveal className="mt-4 text-base leading-relaxed text-cream/60">
                  {body}
                </p>
              </div>

              <div className="hiw-visual">{visual}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
