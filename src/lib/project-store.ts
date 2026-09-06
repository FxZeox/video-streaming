import "server-only";

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { MongoServerError, type Collection } from "mongodb";
import type { PortfolioProject } from "@/data/projects";
import { getMongoDatabase } from "@/lib/mongodb";

type ProjectDocument = PortfolioProject & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export class ProjectStoreError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const dataDirectory = process.env.ADMIN_DATA_DIR
  ? path.resolve(process.env.ADMIN_DATA_DIR)
  : path.join(os.tmpdir(), "video-streaming-data");
const dataFile = path.join(dataDirectory, "admin-projects.json");

let indexPromise: Promise<unknown> | undefined;

async function mongoProjects(): Promise<Collection<ProjectDocument> | null> {
  const database = await getMongoDatabase();
  if (!database) return null;

  const collection = database.collection<ProjectDocument>(process.env.MONGODB_PROJECTS_COLLECTION?.trim() || "projects");
  indexPromise ??= collection.createIndex({ slug: 1 }, { unique: true, name: "unique_project_slug" }).catch((error) => {
    indexPromise = undefined;
    throw error;
  });
  await indexPromise;
  return collection;
}

function normalizeProject(item: Partial<PortfolioProject>, index = 0): PortfolioProject {
  return {
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
  };
}

function fromDocument(document: ProjectDocument): PortfolioProject {
  return normalizeProject(document);
}

async function readLocalProjects(): Promise<PortfolioProject[]> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const saved = JSON.parse(raw) as Array<Partial<PortfolioProject>>;
    return (Array.isArray(saved) ? saved : []).map(normalizeProject);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function saveLocalProjects(projects: PortfolioProject[]) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, dataFile);
}

let localMutationQueue: Promise<void> = Promise.resolve();

function mutateLocalProjects<T>(mutation: (projects: PortfolioProject[]) => { projects: PortfolioProject[]; result: T }): Promise<T> {
  const operation = localMutationQueue.then(async () => {
    const { projects, result } = mutation(await readLocalProjects());
    await saveLocalProjects(projects);
    return result;
  });
  localMutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function duplicateError(error: unknown): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    if (error.keyPattern?.slug) throw new ProjectStoreError("That URL slug is already being used.", 409);
    throw new ProjectStoreError("A project with that ID already exists.", 409);
  }
  throw error;
}

export async function getProjects(): Promise<PortfolioProject[]> {
  const collection = await mongoProjects();
  if (!collection) return readLocalProjects();
  const documents = await collection.find({}).sort({ createdAt: -1, _id: 1 }).toArray();
  return documents.map(fromDocument);
}

export async function getProject(slug: string) {
  const collection = await mongoProjects();
  if (!collection) return (await readLocalProjects()).find((project) => project.slug === slug);
  const document = await collection.findOne({ slug });
  return document ? fromDocument(document) : undefined;
}

export async function addProject(project: PortfolioProject) {
  const collection = await mongoProjects();
  if (!collection) {
    return mutateLocalProjects((projects) => {
      if (projects.some((item) => item.id === project.id)) throw new ProjectStoreError("A project with that ID already exists.", 409);
      if (projects.some((item) => item.slug === project.slug)) throw new ProjectStoreError("That URL slug is already being used.", 409);
      return { projects: [project, ...projects], result: project };
    });
  }

  const now = new Date();
  try {
    await collection.insertOne({ ...project, _id: project.id, createdAt: now, updatedAt: now });
    return project;
  } catch (error) {
    return duplicateError(error);
  }
}

export async function updateProject(project: PortfolioProject) {
  const collection = await mongoProjects();
  if (!collection) {
    return mutateLocalProjects((projects) => {
      const index = projects.findIndex((item) => item.id === project.id);
      if (index < 0) throw new ProjectStoreError("Project not found. Refresh the dashboard and try again.", 404);
      if (projects.some((item, itemIndex) => itemIndex !== index && item.slug === project.slug)) throw new ProjectStoreError("That URL slug is already being used.", 409);
      const previous = projects[index];
      const updated = [...projects];
      updated[index] = project;
      return { projects: updated, result: previous };
    });
  }

  try {
    const previous = await collection.findOneAndUpdate(
      { _id: project.id },
      { $set: { ...project, updatedAt: new Date() } },
      { returnDocument: "before" },
    );
    if (!previous) throw new ProjectStoreError("Project not found. Refresh the dashboard and try again.", 404);
    return fromDocument(previous);
  } catch (error) {
    if (error instanceof ProjectStoreError) throw error;
    return duplicateError(error);
  }
}

export async function removeProject(id: string) {
  const collection = await mongoProjects();
  if (!collection) {
    return mutateLocalProjects((projects) => {
      const project = projects.find((item) => item.id === id);
      if (!project) throw new ProjectStoreError("Project not found. It may already have been deleted.", 404);
      return { projects: projects.filter((item) => item.id !== id), result: project };
    });
  }

  const removed = await collection.findOneAndDelete({ _id: id });
  if (!removed) throw new ProjectStoreError("Project not found. It may already have been deleted.", 404);
  return fromDocument(removed);
}
