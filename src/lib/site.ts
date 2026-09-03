export const siteConfig = {
  name: "Evol Visuals",
  editorName: "Evol Visuals",
  email: "evolai143@gmail.com",
  description:
    "Independent video editor crafting films with rhythm, feeling, and a point of view.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://evolvisuals.com",
  profileImageUrl: process.env.NEXT_PUBLIC_PROFILE_IMAGE_URL ?? "/images/profile-portrait.png",
  ogImageUrl: process.env.NEXT_PUBLIC_OG_IMAGE_URL ?? process.env.NEXT_PUBLIC_PROFILE_IMAGE_URL ?? "/images/profile-portrait.png",
  socials: [] as { label: string; href: string }[],
};

export function videoAsset(path: string) {
  const base = process.env.NEXT_PUBLIC_VIDEO_BASE_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${path.replace(/^\//, "")}`;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (cloudName) {
    return `https://res.cloudinary.com/${cloudName}/video/upload/${path.replace(/^\//, "")}`;
  }

  return path.startsWith("http") ? path : "";
}
