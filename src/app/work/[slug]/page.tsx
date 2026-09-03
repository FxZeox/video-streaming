import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";
import { getProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = await getProject((await params).slug);
  if (!project) return {};
  return { title: project.title, description: project.description, alternates: { canonical: `/work/${project.slug}` }, openGraph: { title: project.title, description: project.description, images: [project.poster], type: "video.other" } };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  return <main id="main" className="project-page">
    <section className="project-hero"><div className="container"><Link href="/work" className="back-link">← All work</Link><div className="project-title"><div><p className="kicker">{project.eyebrow} · {project.year}</p><h1>{project.title}</h1></div><span>{project.duration}</span></div><VideoPlayer title={project.title} poster={project.poster} sources={project.sources} /></div></section>
    <section className="project-details"><div className="container project-details-grid"><div><p className="kicker">The project</p><p className="project-lead">{project.longDescription}</p></div><dl><div><dt>Year</dt><dd>{project.year}</dd></div><div><dt>Duration</dt><dd>{project.duration}</dd></div><div><dt>Role</dt><dd>{project.role}</dd></div><div><dt>Tools</dt><dd>{(project.tools ?? []).join(" · ") || "Not specified"}</dd></div></dl></div></section>
  </main>;
}
