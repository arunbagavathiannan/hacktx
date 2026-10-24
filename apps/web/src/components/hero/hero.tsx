import { ArrowDown, Lock, Play } from "@phosphor-icons/react/dist/ssr";
import { Globe } from "./globe";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <div aria-hidden className="hero-glow" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <a href="/" className="font-display text-xl font-semibold tracking-tight text-cream">
          huddle<span className="text-coral">.</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-cream/60 md:flex">
          <a className="transition-colors hover:text-cream" href="#how-it-works">
            How it works
          </a>
          <a className="transition-colors hover:text-cream" href="#privacy">
            Privacy
          </a>
          <a className="transition-colors hover:text-cream" href="#demo">
            Demo
          </a>
        </nav>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-6 px-6 pb-12 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-4 lg:pb-0">
        <div className="relative z-10 flex flex-col items-start">
          <p className="hero-rise inline-flex items-center gap-2 rounded-full border border-cream/10 px-3 py-1 text-xs tracking-wide text-cream/60 [--d:0ms]">
            <span className="size-1.5 rounded-full bg-coral" />
            For Android · WhatsApp + Instagram
          </p>

          <h1 className="hero-rise mt-6 font-display text-[clamp(5rem,13vw,10.5rem)] font-semibold leading-[0.82] tracking-[-0.055em] text-cream [--d:80ms]">
            Huddle
          </h1>

          <p className="hero-rise mt-6 font-display text-[clamp(1.5rem,3vw,2.25rem)] font-medium leading-tight tracking-[-0.02em] text-cream [--d:160ms]">
            Take the plans out of the <span className="text-coral">GC</span>.
          </p>

          <p className="hero-rise mt-4 max-w-md text-base leading-relaxed text-cream/60 [--d:240ms]">
            &ldquo;We should go to Austin next month&rdquo; usually dies in the group chat. Huddle
            notices it, asks if you want it planned, and comes back with real flights, hotels, and
            places for the group to vote on.
          </p>

          <div className="hero-rise mt-9 flex flex-wrap items-center gap-3 [--d:320ms]">
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              See how it works
              <ArrowDown size={16} weight="regular" />
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full border border-cream/15 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:border-cream/40"
            >
              <Play size={16} weight="fill" />
              Watch the demo
            </a>
          </div>

          <p className="hero-rise mt-8 inline-flex items-center gap-2 text-xs text-cream/40 [--d:400ms]">
            <Lock size={14} weight="regular" />
            Reads only the apps you turn on. Filtering happens on your phone.
          </p>
        </div>

        <div className="hero-globe relative -mx-6 aspect-square md:mx-0 lg:-mr-16">
          <Globe />
        </div>
      </div>
    </section>
  );
}
