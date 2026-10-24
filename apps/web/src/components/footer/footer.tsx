const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#trust", label: "Trust" },
  { href: "#waitlist", label: "Waitlist" },
];

export function Footer() {
  return (
    <footer className="border-t border-cream/8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div>
          <a href="/" className="font-display text-xl font-semibold tracking-tight text-cream">
            huddle<span className="text-coral">.</span>
          </a>
          <p className="mt-2 text-sm text-cream/45">Take the plans out of the GC.</p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-cream/60">
          {LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-cream">
              {label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-cream/35">Built at HackTX &rsquo;26</p>
      </div>
    </footer>
  );
}
