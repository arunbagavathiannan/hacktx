"use client";

import { AndroidLogo, ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { animate, createScope, onScroll, splitText, stagger, utils } from "animejs";
import { type FormEvent, useEffect, useRef, useState } from "react";

const EASE = "outExpo";

export function Waitlist() {
  const root = useRef<HTMLElement>(null);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const scope = createScope({
      root,
      mediaQueries: { reduce: "(prefers-reduced-motion: reduce)" },
    }).add((self) => {
      if (!root.current || self?.matches.reduce) return;
      const $ = (selector: string) =>
        Array.from((root.current as HTMLElement).querySelectorAll<HTMLElement>(selector));
      const enter = () => onScroll({ target: ".wl-panel", enter: "85% top", repeat: false });

      utils.set($(".wl-panel"), { opacity: 0, translateY: 48, scale: 0.97 });
      animate($(".wl-panel"), {
        opacity: { to: 1, duration: 600, ease: "outQuad" },
        translateY: 0,
        scale: 1,
        duration: 1300,
        ease: EASE,
        autoplay: enter(),
      });

      const title = splitText(".wl-title", { words: { wrap: "clip" } });
      utils.set(title.words, { translateY: "105%" });
      animate(title.words, {
        translateY: "0%",
        duration: 1100,
        delay: stagger(70, { start: 250 }),
        ease: EASE,
        autoplay: enter(),
      });

      utils.set($(".wl-rise"), { opacity: 0, translateY: 20 });
      animate($(".wl-rise"), {
        opacity: 1,
        translateY: 0,
        duration: 1000,
        delay: stagger(90, { start: 550 }),
        ease: EASE,
        autoplay: enter(),
      });

      return () => title.revert();
    });

    return () => scope.revert();
  }, []);

  // MOCK: no waitlist backend yet. The email stays in the browser; we only show the success state.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email.trim()) setJoined(true);
  };

  return (
    <section
      id="waitlist"
      ref={root}
      className="relative mx-auto w-full max-w-7xl scroll-mt-8 px-6 pb-24 md:px-10 md:pb-32"
    >
      <div className="wl-panel relative isolate overflow-hidden rounded-[2rem] border border-cream/8 bg-[#1a1714] px-6 py-16 text-center md:px-16 md:py-24">
        <div aria-hidden className="wl-glow" />

        <p className="wl-rise mx-auto inline-flex items-center gap-2 rounded-full border border-cream/10 px-3 py-1 text-xs tracking-wide text-cream/60">
          <AndroidLogo size={14} weight="regular" />
          Coming to Android first
        </p>

        <h2 className="wl-title mx-auto mt-6 max-w-3xl font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-cream">
          Your next trip is already in the <span className="text-coral">GC</span>.
        </h2>

        <p className="wl-rise mx-auto mt-6 max-w-lg text-base leading-relaxed text-cream/60 md:text-lg">
          Join the waitlist and we&rsquo;ll let you know when Huddle is ready to plan it.
        </p>

        <div className="wl-rise mx-auto mt-10 max-w-md">
          {joined ? (
            <p
              role="status"
              className="wl-done inline-flex items-center gap-2.5 rounded-full bg-cream/6 px-6 py-3.5 text-sm font-medium text-cream"
            >
              <CheckCircle size={20} weight="fill" className="text-coral" />
              You&rsquo;re on the list. We&rsquo;ll be in touch.
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-2 rounded-full sm:flex-row sm:border sm:border-cream/12 sm:bg-ink/60 sm:p-1.5"
            >
              <label htmlFor="waitlist-email" className="sr-only">
                Email
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 rounded-full border border-cream/12 bg-ink/60 px-5 py-3 text-sm text-cream placeholder:text-cream/35 focus:border-coral/60 focus:outline-none sm:border-0 sm:bg-transparent"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Join the waitlist
                <ArrowRight size={16} weight="regular" />
              </button>
            </form>
          )}
        </div>

        <p className="wl-rise mt-6 text-xs text-cream/40">
          No spam. One email when it&rsquo;s ready.
        </p>
      </div>
    </section>
  );
}
