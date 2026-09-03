import type { Metadata } from "next";
import { PageHero } from "@/components/sections";
import WorkList from "@/components/work-list";
import { getProjects } from "@/lib/project-store";

export const metadata: Metadata = { title: "Work", description: "A selection of video editing and post-production projects.", alternates: { canonical: "/work" } };

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const projects = await getProjects();
  return (
    <main id="main">
      <PageHero eyebrow="Selected work · 2024—26" title={<>Stories shaped<br /><em>frame by frame.</em></>} copy="A selection of development projects that shows how rhythm, structure, sound, and detail can turn raw footage into a finished story." />
      <section className="section work-archive">
        <div className="container">
          <div className="archive-label"><span>All projects</span><span>{projects.length.toString().padStart(2, "0")} films</span></div>
          <WorkList projects={projects} />
        </div>
      </section>
    </main>
  );
}
