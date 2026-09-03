import { videoAsset } from "@/lib/site";

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
};

export const projects: PortfolioProject[] = [
  {
    id: "01",
    slug: "after-the-summit",
    title: "After the Summit",
    eyebrow: "Brand film",
    description: "An atmospheric story shaped by pace, silence, and scale.",
    longDescription: "A development project exploring the quiet moments between effort and arrival. Replace this copy with the story, brief, and creative decisions behind your finished film.",
    thumbnail: "/images/alpine.webp",
    poster: "/images/alpine.webp",
    sources: [{ src: videoAsset("videos/demo-reel.webm"), type: "video/webm", label: "Development preview" }],
    duration: "02:34",
    year: 2026,
    role: "Edit, color & sound design",
    tools: ["Premiere Pro", "After Effects", "DaVinci Resolve"],
    featured: true,
  },
  {
    id: "02",
    slug: "form-in-motion",
    title: "Form in Motion",
    eyebrow: "Fashion film",
    description: "A tactile study in movement, shape, and hard light.",
    longDescription: "A visual-first edit built around match cuts, fabric movement, and a carefully restrained soundscape. This is placeholder project context, ready for your real credits and process notes.",
    thumbnail: "/images/fashion.webp",
    poster: "/images/fashion.webp",
    sources: [{ src: videoAsset("videos/demo-reel.webm"), type: "video/webm", label: "Development preview" }],
    duration: "01:18",
    year: 2026,
    role: "Edit & motion graphics",
    tools: ["Premiere Pro", "After Effects"],
    featured: true,
  },
  {
    id: "03",
    slug: "the-night-shift",
    title: "The Night Shift",
    eyebrow: "Short film",
    description: "A nocturnal portrait cut to the pulse of a city after dark.",
    longDescription: "A cinematic development piece balancing energy with moments of stillness. Use this area later to explain how your edit solved the project brief.",
    thumbnail: "/images/city.webp",
    poster: "/images/city.webp",
    sources: [{ src: videoAsset("videos/demo-reel.webm"), type: "video/webm", label: "Development preview" }],
    duration: "03:42",
    year: 2025,
    role: "Edit, color & sound design",
    tools: ["DaVinci Resolve", "Audition"],
    featured: true,
  },
  {
    id: "04",
    slug: "cutting-room",
    title: "Cutting Room",
    eyebrow: "Studio portrait",
    description: "A quiet look at the craft that happens beyond the frame.",
    longDescription: "A moody studio piece about process, precision, and the last ten percent. All names and descriptions in this demo are intentionally fictional placeholders.",
    thumbnail: "/images/edit-suite.webp",
    poster: "/images/edit-suite.webp",
    sources: [{ src: videoAsset("videos/demo-reel.webm"), type: "video/webm", label: "Development preview" }],
    duration: "01:56",
    year: 2025,
    role: "Direction & edit",
    tools: ["Premiere Pro", "Photoshop", "Audition"],
  },
  {
    id: "05",
    slug: "distant-light",
    title: "Distant Light",
    eyebrow: "Campaign film",
    description: "A human story built from intimate details and open landscapes.",
    longDescription: "A placeholder campaign cut focused on emotional build, visual continuity, and an understated finish.",
    thumbnail: "/images/alpine.webp",
    poster: "/images/alpine.webp",
    sources: [{ src: videoAsset("videos/demo-reel.webm"), type: "video/webm", label: "Development preview" }],
    duration: "02:08",
    year: 2025,
    role: "Offline edit",
    tools: ["Premiere Pro", "After Effects"],
    imagePosition: "70% center",
  },
  {
    id: "06",
    slug: "red-study",
    title: "Red Study No. 01",
    eyebrow: "Visual experiment",
    description: "Rhythm and texture reduced to their essential forms.",
    longDescription: "A short-form visual experiment. Replace this content and source URL from the central projects data file when your final video is ready.",
    thumbnail: "/images/fashion.webp",
    poster: "/images/fashion.webp",
    sources: [{ src: videoAsset("videos/demo-reel.webm"), type: "video/webm", label: "Development preview" }],
    duration: "00:48",
    year: 2024,
    role: "Concept, edit & grade",
    tools: ["After Effects", "DaVinci Resolve"],
    imagePosition: "20% center",
  },
];

export const featuredProjects = projects.filter((project) => project.featured);

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
