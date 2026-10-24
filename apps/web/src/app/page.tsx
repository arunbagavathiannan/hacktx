import { Hero } from "@/components/hero/hero";
import { HowItWorks } from "@/components/how-it-works/how-it-works";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <HowItWorks />
    </main>
  );
}
