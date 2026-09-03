export const siteConfig = {
  name: "Fahad B Ali",
  editorName: "Fahad B Ali",
  email: "hello@yourstudio.com",
  description:
    "Independent video editor crafting films with rhythm, feeling, and a point of view.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  socials: [],
} as const;

export function videoAsset(path: string) {
  const base = process.env.NEXT_PUBLIC_VIDEO_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${path.replace(/^\//, "")}` : `/${path.replace(/^\//, "")}`;
}
