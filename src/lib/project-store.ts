import "server-only";

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { PortfolioProject } from "@/data/projects";

const dataDirectory = process.env.ADMIN_DATA_DIR
  ? path.resolve(process.env.ADMIN_DATA_DIR)
  : path.join(os.tmpdir(), "video-streaming-data");
const dataFile = path.join(dataDirectory, "admin-projects.json");

export async function getProjects(): Promise<PortfolioProject[]> {
  try {
    // If Cloudinary is configured, try to load the JSON from Cloudinary first
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const publicId = process.env.ADMIN_DATA_PUBLIC_ID ?? "admin-projects";

    let saved: Array<Partial<PortfolioProject>> = [];

    if (cloudName && apiKey && apiSecret) {
      try {
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
        const metaResp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/raw/upload/${publicId}`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        if (metaResp.ok) {
          const meta = await metaResp.json();
          const url = meta.secure_url || meta.url;
          if (url) {
            const contentResp = await fetch(url);
            if (contentResp.ok) {
              const raw = await contentResp.text();
              saved = JSON.parse(raw) as Array<Partial<PortfolioProject>>;
            }
          }
        }
      } catch {
        // Fall back to local file if Cloudinary read fails
        saved = [];
      }
    }

    // If not loaded from Cloudinary, try local file
    if (!saved || !saved.length) {
      try {
        const raw = await fs.readFile(dataFile, "utf8");
        saved = JSON.parse(raw) as Array<Partial<PortfolioProject>>;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") saved = [];
        else throw error;
      }
    }

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
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const publicId = process.env.ADMIN_DATA_PUBLIC_ID ?? "admin-projects";

  const json = `${JSON.stringify(projects, null, 2)}\n`;

  if (cloudName && apiKey && apiSecret) {
    // Upload as a raw Cloudinary asset using application/x-www-form-urlencoded with a data URI
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const fileParam = `data:application/json;base64,${Buffer.from(json, "utf8").toString("base64")}`;
    const params = new URLSearchParams({
      file: fileParam,
      public_id: publicId,
      resource_type: "raw",
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
      overwrite: "true",
    });

    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Cloudinary upload failed: ${resp.status} ${body}`);
    }
    return;
  }

  // Fallback to local filesystem
  await fs.mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await fs.writeFile(temporaryFile, json, "utf8");
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
