import type { PortfolioProject, VideoSource } from "@/data/projects";

export type ProjectField =
  | "title"
  | "slug"
  | "eyebrow"
  | "description"
  | "longDescription"
  | "category"
  | "year"
  | "thumbnail"
  | "videoUrl";

export type ProjectFieldErrors = Partial<Record<ProjectField, string>>;

export type ProjectValidationResult =
  | { success: true; project: PortfolioProject }
  | { success: false; errors: ProjectFieldErrors };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validMediaLocation(value: string) {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:");
  } catch {
    return false;
  }
}

export function validateProject(input: unknown): ProjectValidationResult {
  if (!input || typeof input !== "object") return { success: false, errors: { title: "Invalid project data." } };

  const item = input as Partial<PortfolioProject>;
  const title = text(item.title);
  const slug = text(item.slug).toLowerCase();
  const eyebrow = text(item.eyebrow);
  const description = text(item.description);
  const longDescription = text(item.longDescription);
  const category = text(item.category);
  const duration = text(item.duration);
  const role = text(item.role);
  const thumbnail = text(item.thumbnail);
  const poster = text(item.poster) || thumbnail;
  const year = Number(item.year);
  const videoUrl = text(item.sources?.[0]?.src);
  const errors: ProjectFieldErrors = {};

  if (!title) errors.title = "Project title is required.";
  else if (title.length > 140) errors.title = "Project title must be 140 characters or fewer.";

  if (!slug) errors.slug = "URL slug is required.";
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = "Use lowercase letters, numbers, and single hyphens only.";

  if (!eyebrow) errors.eyebrow = "Project type is required.";
  if (!description) errors.description = "Card description is required.";
  else if (description.length > 400) errors.description = "Card description must be 400 characters or fewer.";
  if (!longDescription) errors.longDescription = "Full project description is required.";
  else if (longDescription.length > 3000) errors.longDescription = "Full description must be 3,000 characters or fewer.";
  if (!category) errors.category = "Choose or enter a category.";

  const maximumYear = new Date().getFullYear() + 5;
  if (!Number.isInteger(year) || year < 1900 || year > maximumYear) errors.year = `Enter a year between 1900 and ${maximumYear}.`;

  if (!thumbnail) errors.thumbnail = "Upload a thumbnail before saving.";
  else if (!validMediaLocation(thumbnail)) errors.thumbnail = "Thumbnail must be an HTTPS URL or a local /path.";

  if (!videoUrl) errors.videoUrl = "Upload a video before saving.";
  else if (!validMediaLocation(videoUrl)) errors.videoUrl = "Video must be an HTTPS URL or a local /path.";

  if (Object.keys(errors).length) return { success: false, errors };

  const firstSource = item.sources?.[0] as VideoSource | undefined;
  return {
    success: true,
    project: {
      id: text(item.id) || crypto.randomUUID(),
      slug,
      title,
      eyebrow,
      description,
      longDescription,
      thumbnail,
      poster,
      sources: [{ src: videoUrl, type: text(firstSource?.type) || "video/mp4", label: text(firstSource?.label) || "Original" }],
      duration: duration || "00:00",
      year,
      role: role || "Video editing",
      tools: Array.isArray(item.tools) ? item.tools.map(text).filter(Boolean).slice(0, 20) : [],
      featured: Boolean(item.featured),
      imagePosition: text(item.imagePosition) || undefined,
      category,
    },
  };
}
