import { ChatsCircle } from "@phosphor-icons/react/dist/ssr";

// Placeholder landing page. The real one (three.js hero, motion, anime.js) replaces this.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-neutral-950 px-8 text-center">
      <ChatsCircle size={64} color="#fafafa" weight="duotone" />
      <h1 className="text-5xl font-bold tracking-tight text-neutral-50">Huddle</h1>
      <p className="text-lg text-neutral-400">Take the plans out of the GC.</p>
    </main>
  );
}
