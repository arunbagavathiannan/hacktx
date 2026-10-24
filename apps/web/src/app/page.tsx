import { Footer } from "@/components/footer/footer";
import { Hero } from "@/components/hero/hero";
import { HowItWorks } from "@/components/how-it-works/how-it-works";
import { Trust } from "@/components/trust/trust";
import { Waitlist } from "@/components/waitlist/waitlist";

// Section order follows AstroWind's landing page: hero → steps → features → call to action → footer.
export default function Home() {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <Hero />
        <HowItWorks />
        <Trust />
        <Waitlist />
      </main>
      <Footer />
    </>
  );
}
