import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getProjects, saveProjects } from "@/lib/project-store";
import type { PortfolioProject } from "@/data/projects";

function validate(input: unknown): PortfolioProject {
  if (!input || typeof input !== "object") throw new Error("Invalid project data.");
  const item = input as Partial<PortfolioProject>;
  if (!item.id || !item.title || !item.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) throw new Error("ID, title, and a URL-safe slug are required.");
  if (!item.thumbnail || !item.sources?.[0]?.src) throw new Error("Thumbnail and video URL are required.");
  return {
    id: String(item.id).slice(0, 80), slug: item.slug, title: String(item.title).slice(0, 140), eyebrow: String(item.eyebrow ?? "Project").slice(0, 80),
    description: String(item.description ?? "").slice(0, 400), longDescription: String(item.longDescription ?? "").slice(0, 3000), thumbnail: String(item.thumbnail), poster: String(item.poster),
    // allow poster to fall back to thumbnail if not provided
    poster: String(item.poster ?? item.thumbnail),
    sources: item.sources.map((source) => ({ src: String(source.src), type: String(source.type ?? "video/mp4"), label: String(source.label ?? "Original") })),
    duration: String(item.duration ?? "00:00").slice(0, 20), year: Number(item.year) || new Date().getFullYear(), role: String(item.role ?? "Video editing").slice(0, 200),
    tools: Array.isArray(item.tools) ? item.tools.map(String).slice(0, 20) : [], featured: Boolean(item.featured), imagePosition: item.imagePosition ? String(item.imagePosition) : undefined,
    category: item.category ? String(item.category).slice(0, 80) : undefined,
  };
}

async function unauthorized() { return NextResponse.json({ error: "Unauthorized." }, { status: 401 }); }

export async function GET() {
  if (!await isAdminAuthenticated()) return unauthorized();
  return NextResponse.json(await getProjects(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return unauthorized();
  try {
    const project = validate(await request.json());
    const projects = await getProjects();
    if (projects.some((item) => item.id === project.id || item.slug === project.slug)) return NextResponse.json({ error: "That ID or slug already exists." }, { status: 409 });
    projects.unshift(project); await saveProjects(projects);
    return NextResponse.json(project, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save project." }, { status: 400 }); }
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) return unauthorized();
  try {
    const project = validate(await request.json());
    const projects = await getProjects();
    const index = projects.findIndex((item) => item.id === project.id);
    if (index < 0) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (projects.some((item, itemIndex) => itemIndex !== index && item.slug === project.slug)) return NextResponse.json({ error: "That slug already exists." }, { status: 409 });
    projects[index] = project; await saveProjects(projects);
    return NextResponse.json(project);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update project." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) return unauthorized();
  const { id } = await request.json().catch(() => ({ id: "" })) as { id: string };
  const projects = await getProjects();
  const next = projects.filter((project) => project.id !== id);
  if (next.length === projects.length) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  await saveProjects(next);
  return NextResponse.json({ ok: true });
}
