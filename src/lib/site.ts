export const siteConfig = {
  name: "Evol Visuals",
  editorName: "Evol Visuals",
  email: "hello@yourstudio.com",
  description:
    "Independent video editor crafting films with rhythm, feeling, and a point of view.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  socials: [] as { label: string; href: string }[],
};

export function videoAsset(path: string) {
  const base = process.env.NEXT_PUBLIC_VIDEO_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${path.replace(/^\//, "")}` : `/${path.replace(/^\//, "")}`;
}
