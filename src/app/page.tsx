import { Hero } from "@/components/hero";

export const dynamic = "force-dynamic";

export default function Home() {
  // Homepage simplified: show only the hero (main video) per request.
  return <main id="main"><Hero /></main>;
}
