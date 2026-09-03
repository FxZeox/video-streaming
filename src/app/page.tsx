import { Hero } from "@/components/hero";
import { FeaturedWork } from "@/components/sections";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <FeaturedWork />
    </main>
  );
}
