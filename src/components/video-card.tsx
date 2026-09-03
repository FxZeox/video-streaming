import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play } from "@/components/icons";
import type { PortfolioProject } from "@/data/projects";

export function VideoCard({ project, large = false, priority = false }: { project: PortfolioProject; large?: boolean; priority?: boolean }) {
  return (
    <article className={`video-card ${large ? "video-card-large" : ""}`}>
      <Link href={`/work/${project.slug}`} className="video-card-media" aria-label={`View ${project.title}`}>
        <Image src={project.thumbnail} alt={`Still from ${project.title}`} fill sizes={large ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 50vw"} priority={priority} unoptimized={project.thumbnail.startsWith("http")} style={{ objectPosition: project.imagePosition }} />
        <span className="media-shade" />
        <span className="play-orb"><Play /></span>
        {project.featured && <span className="featured-badge">Selected</span>}
        <span className="duration-badge">{project.duration}</span>
      </Link>
      <div className="video-card-copy">
        <div><p className="card-eyebrow">{project.eyebrow} · {project.year}</p><h3>{project.title}</h3><p>{project.description}</p></div>
        <Link href={`/work/${project.slug}`} className="round-link" aria-label={`Open ${project.title}`}><ArrowUpRight /></Link>
      </div>
    </article>
  );
}

export function VideoGrid({ projects }: { projects: PortfolioProject[] }) {
  return <div className="video-grid">{projects.map((project, index) => <VideoCard key={project.id} project={project} large={index % 3 === 0} priority={index < 2} />)}</div>;
}
