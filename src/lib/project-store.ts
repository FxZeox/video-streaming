import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type { PortfolioProject } from "@/data/projects";

const dataDirectory = process.env.ADMIN_DATA_DIR
  ? path.resolve(process.env.ADMIN_DATA_DIR)
  : path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "admin-projects.json");

export async function getProjects(): Promise<PortfolioProject[]> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const saved = JSON.parse(raw) as Array<Partial<PortfolioProject>>;
    return (Array.isArray(saved) ? saved : []).map((item, index) => ({
      id: String(item.id ?? item.slug ?? `project-${index + 1}`),
      slug: String(item.slug ?? `project-${index + 1}`),
      title: String(item.title ?? "Untitled project"),
      eyebrow: String(item.eyebrow ?? "Project"),
      description: String(item.description ?? ""),
      longDescription: String(item.longDescription ?? ""),
      thumbnail: String(item.thumbnail ?? ""),
      poster: String(item.poster ?? item.thumbnail ?? ""),
      sources: Array.isArray(item.sources) && item.sources.length ? item.sources.map((source) => ({
        src: String(source?.src ?? ""),
        type: String(source?.type ?? "video/mp4"),
        label: String(source?.label ?? "Original"),
      })) : [{ src: "", type: "video/mp4", label: "Original" }],
      duration: String(item.duration ?? "00:00"),
      year: Number(item.year) || new Date().getFullYear(),
      role: String(item.role ?? "Video editing"),
      tools: Array.isArray(item.tools) ? item.tools.map(String) : [],
      featured: Boolean(item.featured),
      imagePosition: item.imagePosition ? String(item.imagePosition) : undefined,
      category: item.category ? String(item.category) : undefined,
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function getProject(slug: string) {
  return (await getProjects()).find((project) => project.slug === slug);
}

export async function saveProjects(projects: PortfolioProject[]) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, dataFile);
}

let mutationQueue: Promise<void> = Promise.resolve();

export function mutateProjects<T>(mutation: (projects: PortfolioProject[]) => Promise<{ projects: PortfolioProject[]; result: T }> | { projects: PortfolioProject[]; result: T }): Promise<T> {
  const operation = mutationQueue.then(async () => {
    const current = await getProjects();
    const { projects, result } = await mutation(current);
    await saveProjects(projects);
    return result;
  });
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
