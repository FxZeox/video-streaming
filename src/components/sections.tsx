import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Spark } from "@/components/icons";
import { processSteps, services, testimonials } from "@/data/content";
import { getProjects } from "@/lib/project-store";
import { VideoCard } from "@/components/video-card";
import { siteConfig } from "@/lib/site";

export function SectionHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action?: { label: string; href: string } }) {
  return <div className="section-heading"><div><p className="kicker">{eyebrow}</p><h2>{title}</h2></div>{copy && <p>{copy}</p>}{action && <Link href={action.href} className="text-link">{action.label} <ArrowUpRight /></Link>}</div>;
}

export async function FeaturedWork() {
  const featuredProjects = (await getProjects()).filter((project) => project.featured);
  return <section className="section section-work"><div className="container"><SectionHeading eyebrow="01 / Selected work" title="A few stories, shaped in the edit." copy="From first assembly to final color—each project is built to hold attention and leave a mark." action={{ label: "Explore all work", href: "/work" }} /><div className="featured-grid">{featuredProjects.map((project, index) => <VideoCard key={project.id} project={project} large={index === 0} />)}</div></div></section>;
}

export function ServicesPreview({ all = false }: { all?: boolean }) {
  const items = all ? services : services.slice(0, 4);
  return <section className={`section services-section ${all ? "services-full" : ""}`}><div className="container"><SectionHeading eyebrow={all ? "Capabilities" : "02 / What I do"} title={all ? "Post-production, from raw footage to final frame." : "Everything your footage needs."} copy="A focused, collaborative post-production service tailored to your story, your audience, and where the work needs to live." />
    <div className="services-list">{items.map((service) => <article key={service.number} className="service-row"><span>{service.number}</span><h3>{service.title}</h3><p>{service.description}</p><Spark /></article>)}</div>
    {!all && <Link className="text-link services-more" href="/services">See all services <ArrowRight /></Link>}
  </div></section>;
}

export function AboutPreview() {
  return <section className="section about-preview"><div className="container about-grid"><div className="about-image-wrap"><Image src="/images/edit-suite.webp" alt="Placeholder portrait area inside an editing studio" fill sizes="(max-width: 768px) 100vw, 46vw" /><span className="image-note">Your portrait / studio image</span></div><div className="about-copy"><p className="kicker">03 / Behind the timeline</p><h2>Good editing is something you <em>feel</em> before you notice.</h2><p>I&apos;m {siteConfig.editorName}, an independent video editor focused on clear storytelling, emotional pacing, and thoughtful craft. This introduction is ready for your own voice, background, and perspective.</p><p>My job is to find the strongest version of the story already hiding in the footage—and make every second earn its place.</p><Link className="text-link" href="/about">More about my approach <ArrowUpRight /></Link></div></div></section>;
}

export function Process() {
  return <section className="section process-section"><div className="container"><SectionHeading eyebrow="04 / The process" title="Clear, collaborative, considered." copy="No mystery. Just a simple process that keeps the project moving and the creative sharp." /><div className="process-grid">{processSteps.map((step) => <article key={step.number}><span>{step.number}</span><div className="process-dot" /><h3>{step.title}</h3><p>{step.description}</p></article>)}</div></div></section>;
}

export function Testimonials() {
  return <section className="section testimonials-section"><div className="container"><p className="kicker">05 / Kind words</p><div className="testimonials-grid">{testimonials.map((item, index) => <figure key={index}><blockquote>“{item.quote}”</blockquote><figcaption><strong>{item.name}</strong><span>{item.company} · Placeholder</span></figcaption></figure>)}</div></div></section>;
}

export function PageHero({ eyebrow, title, copy }: { eyebrow: string; title: React.ReactNode; copy: string }) {
  return <section className="page-hero"><div className="container"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p className="page-intro">{copy}</p></div></section>;
}
