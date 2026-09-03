import type { Metadata } from "next";
import { PageHero, Process, ServicesPreview } from "@/components/sections";

export const metadata: Metadata = { title: "Services", description: "Story-led video editing, motion graphics, color, and sound design.", alternates: { canonical: "/services" } };

export default function ServicesPage() {
  return <main id="main"><PageHero eyebrow="Services · Post production" title={<>Your footage,<br /><em>fully realized.</em></>} copy="From the first assembly to the final export, I shape every piece around what the story needs and what your audience should feel." /><ServicesPreview all /><Process /></main>;
}
