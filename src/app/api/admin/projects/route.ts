import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { addProject, getProjects, ProjectStoreError, removeProject, updateProject } from "@/lib/project-store";
import { validateProject, type ProjectFieldErrors } from "@/lib/project-validation";

class ApiError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function unauthorized() {
  return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
}

async function readBody(request: Request) {
  try { return await request.json() as unknown; }
  catch { throw new ApiError("The project request is not valid JSON."); }
}

function validationError(errors: ProjectFieldErrors) {
  return NextResponse.json({ error: "Please correct the highlighted fields.", fieldErrors: errors }, { status: 422 });
}

function refreshPortfolio(...slugs: string[]) {
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/sitemap.xml");
  for (const slug of slugs.filter(Boolean)) revalidatePath(`/work/${slug}`);
}

export async function GET() {
  if (!await isAdminAuthenticated()) return unauthorized();
  return NextResponse.json(await getProjects(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return unauthorized();
  try {
    const validated = validateProject(await readBody(request));
    if (!validated.success) return validationError(validated.errors);
    const project = validated.project;
    await addProject(project);
    refreshPortfolio(project.slug);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError || error instanceof ProjectStoreError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the project." }, { status });
  }
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) return unauthorized();
  try {
    const validated = validateProject(await readBody(request));
    if (!validated.success) return validationError(validated.errors);
    const project = validated.project;
    const previous = await updateProject(project);
    refreshPortfolio(previous.slug, project.slug);
    return NextResponse.json(project);
  } catch (error) {
    const status = error instanceof ApiError || error instanceof ProjectStoreError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the project." }, { status });
  }
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) return unauthorized();
  try {
    const payload = await readBody(request) as { id?: unknown };
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    if (!id) throw new ApiError("A project ID is required.");

    const removed = await removeProject(id);

    refreshPortfolio(removed.slug);
    const assetUrls = [...new Set([removed.thumbnail, removed.poster, ...(removed.sources ?? []).map((source) => source.src)].filter(Boolean))];
    const cleanup = await Promise.allSettled(assetUrls.map((url) => deleteCloudinaryAsset(url)));
    const assetsDeleted = cleanup.filter((result) => result.status === "fulfilled" && result.value).length;
    return NextResponse.json({ ok: true, deletedId: removed.id, assetsDeleted });
  } catch (error) {
    const status = error instanceof ApiError || error instanceof ProjectStoreError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete the project." }, { status });
  }
}
