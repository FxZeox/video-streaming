import type { PortfolioProject, VideoSource } from "@/data/projects";

export type ProjectField =
  | "title"
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

function normalizeCategory(category: string) {
  return category.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function isThumbnailOnlyCategory(category: string) {
  const normalized = normalizeCategory(category);
  return normalized === "thumbnail" || normalized.includes("thumbnail");
}

export function getVideoThumbnailUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl);
    if (!url.hostname.toLowerCase().endsWith("cloudinary.com")) return "";
    const parts = url.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.findIndex((part, index) => part === "upload" && parts[index - 1] === "video");
    if (uploadIndex < 0 || !parts[uploadIndex + 1]) return "";
    parts.splice(uploadIndex + 1, 0, "so_0,f_jpg");
    parts[parts.length - 1] = parts[parts.length - 1].replace(/\.[^/.]+$/, ".jpg");
    url.pathname = `/${parts.join("/")}`;
    return url.toString();
  } catch {
    return "";
  }
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
  const requestedSlug = text(item.slug).toLowerCase();
  const longDescription = text(item.longDescription);
  const category = text(item.category);
  const duration = text(item.duration);
  const role = text(item.role);
  const uploadedThumbnail = text(item.thumbnail);
  const year = Number(item.year);
  const isThumbnailOnly = isThumbnailOnlyCategory(category);
  const videoUrl = text(item.sources?.[0]?.src);
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedSlug)
    ? requestedSlug
    : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const eyebrow = text(item.eyebrow) || category || "Project";
  const description = (text(item.description) || longDescription).slice(0, 400);
  const generatedThumbnail = getVideoThumbnailUrl(videoUrl);
  const thumbnail = isThumbnailOnly ? uploadedThumbnail : generatedThumbnail || uploadedThumbnail;
  const poster = isThumbnailOnly ? text(item.poster) || thumbnail : thumbnail;
  const errors: ProjectFieldErrors = {};

  if (!title) errors.title = "Project title is required.";
  else if (title.length > 140) errors.title = "Project title must be 140 characters or fewer.";

  if (!slug) errors.title = "Use at least one letter or number in the project title.";
  if (!longDescription) errors.longDescription = "Full project description is required.";
  else if (longDescription.length > 3000) errors.longDescription = "Full description must be 3,000 characters or fewer.";
  if (!category) errors.category = "Choose or enter a category.";

  const maximumYear = new Date().getFullYear() + 5;
  if (!Number.isInteger(year) || year < 1900 || year > maximumYear) errors.year = `Enter a year between 1900 and ${maximumYear}.`;

  if (isThumbnailOnly) {
    if (!thumbnail) errors.thumbnail = "Upload a thumbnail before saving.";
    else if (!validMediaLocation(thumbnail)) errors.thumbnail = "Thumbnail must be an HTTPS URL or a local /path.";
  }

  if (!isThumbnailOnly) {
    if (!videoUrl) errors.videoUrl = "Upload a video before saving.";
    else if (!validMediaLocation(videoUrl)) errors.videoUrl = "Video must be an HTTPS URL or a local /path.";
    else if (!thumbnail) errors.videoUrl = "This video could not generate a preview image. Upload it again and retry.";
  }

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
      sources: [{ src: isThumbnailOnly ? "" : videoUrl, type: text(firstSource?.type) || "video/mp4", label: text(firstSource?.label) || "Original" }],
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
