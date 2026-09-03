import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { projects as seedProjects, type PortfolioProject } from "@/data/projects";

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "admin-projects.json");

export async function getProjects(): Promise<PortfolioProject[]> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const saved = JSON.parse(raw) as Array<Partial<PortfolioProject>>;
    return saved.map((item, index) => {
      const fallback = seedProjects.find((project) => project.id === item.id) ?? seedProjects[0];
      return {
        ...fallback,
        ...item,
        id: String(item.id ?? `project-${index + 1}`),
        tools: Array.isArray(item.tools) ? item.tools : [],
        sources: Array.isArray(item.sources) && item.sources.length ? item.sources : fallback.sources,
      };
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return seedProjects;
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
