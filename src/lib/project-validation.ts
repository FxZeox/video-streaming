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

export function getYouTubeVideoId(videoUrl: string) {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let candidate = "";
    if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      candidate = url.searchParams.get("v") ?? "";
      if (!candidate) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) candidate = parts[1] ?? "";
      }
    }
    if (host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed") candidate = parts[1] ?? "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : "";
  } catch {
    return "";
  }
}

export function getYouTubeThumbnailUrl(videoUrl: string) {
  const videoId = getYouTubeVideoId(videoUrl);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
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
  const submittedVideoUrl = text(item.sources?.[0]?.src);
  const youtubeVideoId = getYouTubeVideoId(submittedVideoUrl);
  const videoUrl = youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : submittedVideoUrl;
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedSlug)
    ? requestedSlug
    : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const eyebrow = text(item.eyebrow) || category || "Project";
  const description = (text(item.description) || longDescription).slice(0, 400);
  const generatedThumbnail = getYouTubeThumbnailUrl(videoUrl);
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
    if (!videoUrl) errors.videoUrl = "Paste the unlisted YouTube video link before saving.";
    else if (!youtubeVideoId) errors.videoUrl = "Enter a valid YouTube, YouTube Shorts, or youtu.be link.";
    else if (!thumbnail) errors.videoUrl = "The YouTube thumbnail could not be generated. Check the link and retry.";
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
      sources: [{ src: isThumbnailOnly ? "" : videoUrl, type: isThumbnailOnly ? text(firstSource?.type) || "video/mp4" : "video/youtube", label: isThumbnailOnly ? text(firstSource?.label) || "Original" : "YouTube" }],
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
