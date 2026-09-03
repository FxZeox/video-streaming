export type VideoSource = {
  src: string;
  type?: string;
  label?: string;
};

export type PortfolioProject = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  longDescription: string;
  thumbnail: string;
  poster: string;
  sources: VideoSource[];
  duration: string;
  year: number;
  role: string;
  tools: string[];
  featured?: boolean;
  imagePosition?: string;
  category?: string;
};

export const projects: PortfolioProject[] = [];

export const featuredProjects: PortfolioProject[] = [];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
