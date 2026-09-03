import { AboutPreview, FeaturedWork, Process, ServicesPreview, Testimonials } from "@/components/sections";
import { Hero } from "@/components/hero";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <main id="main"><Hero /><FeaturedWork /><ServicesPreview /><AboutPreview /><Process /><Testimonials /></main>;
}
