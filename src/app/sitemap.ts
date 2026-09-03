import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/project-store";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/work", "/services", "/about", "/contact"];
  const projects = await getProjects();
  return [...routes.map((route) => ({ url: `${siteConfig.url}${route}`, changeFrequency: "monthly" as const })), ...projects.map((project) => ({ url: `${siteConfig.url}/work/${project.slug}`, changeFrequency: "monthly" as const }))];
}
