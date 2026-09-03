import type { Metadata } from "next";
import { ArrowUpRight } from "@/components/icons";
import { PageHero } from "@/components/sections";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: `Contact ${siteConfig.editorName}.`, alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return <main id="main"><PageHero eyebrow="Contact" title={<>Let&apos;s make something<br /><em>worth watching.</em></>} copy="For editing enquiries and collaborations, reach out directly by email." /><section className="simple-contact"><div className="container"><p className="kicker">Email</p><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}<ArrowUpRight /></a></div></section></main>;
}
