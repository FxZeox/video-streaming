"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PortfolioProject } from "@/data/projects";
import { categories } from "@/data/categories";
import { ArrowRight, Check, Close, Eye, EyeOff, Play } from "@/components/icons";
import { siteConfig } from "@/lib/site";
import { getVideoThumbnailUrl, validateProject, type ProjectField, type ProjectFieldErrors } from "@/lib/project-validation";

type SaveResult = { ok: true } | { ok: false; message: string; fieldErrors?: ProjectFieldErrors };

type CloudinaryUploadConfig = {
  url: string;
  uploadPreset?: string | null;
  apiKey?: string | null;
  timestamp?: number;
  signature?: string | null;
  accountPlan?: string | null;
  plan?: string | null;
  maxVideoBytes?: number | null;
};

type CloudinaryUploadResult = {
  secure_url?: string;
  url?: string;
  done?: boolean;
  error?: { message?: string };
};

const LARGE_UPLOAD_THRESHOLD = 100 * 1024 * 1024;
const UPLOAD_CHUNK_SIZE = 20 * 1024 * 1024;

function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 100 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

function uploadFormData(file: Blob, filename: string, config: CloudinaryUploadConfig) {
  const data = new FormData();
  data.append("file", file, filename);
  if (config.uploadPreset) {
    data.append("upload_preset", config.uploadPreset);
  } else {
    data.append("api_key", String(config.apiKey));
    data.append("timestamp", String(config.timestamp));
    data.append("signature", String(config.signature));
  }
  return data;
}

function sendUploadRequest({ url, data, headers, timeout, onProgress }: {
  url: string;
  data: FormData;
  headers?: Record<string, string>;
  timeout: number;
  onProgress: (loaded: number, total: number) => void;
}) {
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = timeout;
    for (const [name, value] of Object.entries(headers ?? {})) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      let payload: CloudinaryUploadResult = {};
      try { payload = JSON.parse(xhr.responseText || "{}"); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(payload);
      const detail = payload.error?.message ?? `Cloudinary rejected the upload (HTTP ${xhr.status}).`;
      reject(new Error(detail));
    };
    xhr.onerror = () => reject(new Error("The upload connection was interrupted. Check your internet connection and retry."));
    xhr.ontimeout = () => reject(new Error("The upload timed out. Check your connection and retry."));
    xhr.send(data);
  });
}

async function uploadInChunks(file: File, config: CloudinaryUploadConfig, url: string, onPercent: (percent: number) => void) {
  const uploadId = crypto.randomUUID();
  let finalResult: CloudinaryUploadResult = {};

  for (let start = 0; start < file.size; start += UPLOAD_CHUNK_SIZE) {
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end, file.type);
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        finalResult = await sendUploadRequest({
          url,
          data: uploadFormData(chunk, file.name, config),
          headers: {
            "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
            "X-Unique-Upload-Id": uploadId,
          },
          timeout: 10 * 60 * 1000,
          onProgress: (loaded) => onPercent(Math.min(99, Math.round(((start + loaded) / file.size) * 100))),
        });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, attempt * 750));
      }
    }

    if (lastError) throw lastError;
  }

  onPercent(100);
  return finalResult;
}

const emptyProject = (): PortfolioProject => ({
  id: crypto.randomUUID(),
  slug: "",
  title: "",
  eyebrow: "",
  description: "",
  longDescription: "",
  thumbnail: "",
  poster: "",
  sources: [{ src: "", type: "video/mp4", label: "1080p" }],
  duration: "",
  year: new Date().getFullYear(),
  role: "",
  tools: [],
  featured: true,
  category: "",
});

function restoreDraftProject(projectId: string): PortfolioProject | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(`admin-project-draft:${projectId}`);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as Partial<PortfolioProject>;
    return {
      ...emptyProject(),
      ...parsed,
      id: parsed.id ?? projectId,
      sources: Array.isArray(parsed.sources) && parsed.sources.length ? parsed.sources : [{ src: "", type: "video/mp4", label: "1080p" }],
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
    };
  } catch {
    return null;
  }
}

export function AdminDashboard({ authenticated, configured, initialProjects }: { authenticated: boolean; configured: boolean; initialProjects: PortfolioProject[] }) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(authenticated);
  const [projects, setProjects] = useState(initialProjects);
  const [selected, setSelected] = useState<PortfolioProject | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loggedIn || typeof window === "undefined") return;
    const lastOpenId = window.localStorage.getItem("admin-project-last-open");
    if (!lastOpenId) return;

    const restored = restoreDraftProject(lastOpenId);
    if (!restored) return;
    const timer = window.setTimeout(() => setSelected(restored), 0);
    return () => window.clearTimeout(timer);
  }, [loggedIn]);

  const openProject = (project: PortfolioProject) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin-project-last-open", project.id);
    }
    setSelected(project);
  };

  const closeProject = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("admin-project-last-open");
    }
    setSelected(null);
  };

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Could not sign in.");
      const projectsResponse = await fetch("/api/admin/projects", { cache: "no-store" });
      if (!projectsResponse.ok) return setMessage("Signed in, but projects could not be loaded.");
      setProjects(await projectsResponse.json());
      setLoggedIn(true);
    } catch {
      setMessage("Could not connect to the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setSelected(null);
  }

  async function save(project: PortfolioProject): Promise<SaveResult> {
    setBusy(true);
    setMessage("");
    const finalProject = project.id === "new-project" ? { ...project, id: crypto.randomUUID() } : project;
    const exists = projects.some((item) => item.id === finalProject.id);
    try {
      const response = await fetch("/api/admin/projects", {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalProject),
      });
      const result = await response.json();
      if (response.status === 401) {
        setLoggedIn(false);
        return { ok: false, message: result.error ?? "Your session expired." };
      }
      if (!response.ok) return { ok: false, message: result.error ?? "Could not save the project.", fieldErrors: result.fieldErrors };
      setProjects((items) => exists ? items.map((item) => item.id === result.id ? result : item) : [result, ...items]);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`admin-project-draft:${project.id}`);
        window.localStorage.removeItem("admin-project-draft:new-project");
        if (finalProject.id !== project.id) {
          window.localStorage.removeItem(`admin-project-draft:${finalProject.id}`);
        }
      }
      // Close the editor and clear the 'last open' marker so a refresh doesn't restore the placeholder
      try {
        closeProject();
      } catch {
        setSelected(null);
      }
      setMessage("Project saved. It is now visible on the website.");
      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not connect to the server. Your project was not saved." };
    } finally {
      setBusy(false);
    }
  }

  function clearDraft(projectId: string) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`admin-project-draft:${projectId}`);
    }
  }

  async function remove(project: PortfolioProject) {
    if (!window.confirm(`Delete “${project.title}”? This removes it from the website.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id }),
      });
      const result = await response.json();
      if (response.status === 401) { setLoggedIn(false); return; }
      if (!response.ok) { setMessage(result.error ?? "Could not delete the project."); return; }
      setProjects((items) => items.filter((item) => item.id !== project.id));
      clearDraft(project.id);
      setSelected(null);
      setMessage("Project deleted from the website.");
      router.refresh();
    } catch {
      setMessage("Could not connect to the server. The project was not deleted.");
    } finally {
      setBusy(false);
    }
  }

  if (!loggedIn) return (
    <main className="admin-login"><section>
      <Link className="admin-brand" href="/">{siteConfig.name}</Link>
      <p className="admin-kicker">Private administration</p><h1>Welcome<br /><em>back.</em></h1>
      {!configured && <div className="admin-warning">Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET in <code>.env.local</code> before signing in.</div>}
      <form onSubmit={login}>
        <label>Username<input name="username" autoComplete="username" required /></label>
        <label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {message && <p className="admin-error" role="alert">{message}</p>}
        <button className="admin-button" disabled={busy || !configured}>{busy ? "Signing in…" : <>Sign in <ArrowRight /></>}</button>
      </form><small>This page is intentionally not linked from the public website.</small>
    </section></main>
  );

  return <main className="admin-shell">
    <header className="admin-header"><div><span className="admin-brand">{siteConfig.name}</span><span className="admin-divider" /><span>Project admin</span></div><div><Link href="/" target="_blank">View website ↗</Link><button onClick={logout}>Sign out</button></div></header>
    <div className="admin-body">
      <aside className="admin-sidebar"><p>Content</p><button className="active"><Play /> Projects <span>{projects.length}</span></button></aside>
      <section className="admin-content">
        <div className="admin-title"><div><p className="admin-kicker">Portfolio library</p><h1>Projects</h1><span>Manage the work displayed across your portfolio.</span></div><button className="admin-button" onClick={() => {
          const draft = typeof window !== "undefined" ? restoreDraftProject("new-project") ?? emptyProject() : emptyProject();
          if (!draft.id || draft.id === "new-project") {
            draft.id = crypto.randomUUID();
          }
          openProject(draft);
          setMessage("");
        }}>+ Add project</button></div>
        <section className="admin-guide" aria-labelledby="publishing-guide-title">
          <div className="admin-guide-heading"><div><span>Quick guide</span><h2 id="publishing-guide-title">Publishing a project</h2></div><p>Complete these steps in order. Required fields are marked with an asterisk.</p></div>
          <ol>
            <li><span>01</span><div><strong>Add the details</strong><p>Enter a clear title, year, category, and full project description.</p></div></li>
            <li><span>02</span><div><strong>Choose a category</strong><p>Thumbnail projects use an image. Every other category uses a video.</p></div></li>
            <li><span>03</span><div><strong>Upload the media</strong><p>Keep this page open until the upload progress reaches 100%.</p></div></li>
            <li><span>04</span><div><strong>Save and review</strong><p>Open “View website” to check the card and playback. Use Edit or Delete here anytime.</p></div></li>
          </ol>
        </section>
        {message && <div className={`admin-message ${message.includes("saved") || message.includes("deleted") ? "success" : ""}`} role="status"><Check />{message}<button onClick={() => setMessage("")} aria-label="Dismiss message"><Close /></button></div>}
        {projects.length ? <div className="admin-projects">
          <div className="admin-table-head"><span>Project</span><span>Category</span><span>Video source</span><span>Year</span><span>Status</span><span /></div>
          {projects.map((project) => <article key={project.id}>
            <div className={`admin-thumb ${project.thumbnail ? "" : "admin-thumb--empty"}`} style={project.thumbnail ? { backgroundImage: `url("${project.thumbnail.replace(/"/g, "%22")}")` } : undefined} />
            <div><strong>{project.title}</strong><small>/{project.slug}</small></div>
            <div><small>{project.category || "—"}</small></div>
            <div className="admin-source"><span>{project.sources?.[0]?.src || "No video source"}</span></div>
            <span>{project.year}</span><span className={project.featured ? "status-featured" : "status-live"}>{project.featured ? "Featured" : "Live"}</span>
            <button onClick={() => { const draft = structuredClone(project); openProject(draft); setMessage(""); }}>Edit</button>
          </article>)}
        </div> : <div className="admin-empty">No projects yet. Add your first video project.</div>}
      </section>
    </div>
    {selected && <ProjectEditor project={selected} busy={busy} onClose={closeProject} onSave={save} onDelete={projects.some((item) => item.id === selected.id) ? remove : undefined} />}
  </main>;
}

function ProjectEditor({ project, busy, onClose, onSave, onDelete }: { project: PortfolioProject; busy: boolean; onClose: () => void; onSave: (project: PortfolioProject) => Promise<SaveResult>; onDelete?: (project: PortfolioProject) => Promise<void> }) {
  const draftKey = `admin-project-draft:${project.id}`;
  const [draft, setDraft] = useState<PortfolioProject>(() => {
    if (typeof window === "undefined") return project;
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) return project;
    try {
      const parsed = JSON.parse(saved) as Partial<PortfolioProject>;
      return { ...project, ...parsed, sources: Array.isArray(parsed.sources) && parsed.sources.length ? parsed.sources : project.sources, tools: Array.isArray(parsed.tools) ? parsed.tools : project.tools };
    } catch {
      return project;
    }
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formMessage, setFormMessage] = useState("");

  const persistDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
    if (project.id === "new-project" || draft.id === "new-project") {
      window.localStorage.setItem("admin-project-draft:new-project", JSON.stringify(draft));
    }
    window.localStorage.setItem("admin-project-last-open", project.id);
  }, [draft, draftKey, project.id]);

  const handleClose = () => {
    persistDraft();
    onClose();
  };
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const update = <K extends keyof PortfolioProject>(key: K, value: PortfolioProject[K]) => setDraft((item) => ({ ...item, [key]: value }));
  const clearError = (field: ProjectField) => setErrors((current) => ({ ...current, [field]: undefined }));
  const autoSlug = (title: string) => title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBeforeUnload = () => {
      persistDraft();
    };
    const handlePageHide = () => {
      persistDraft();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [persistDraft]);

  function detectDuration(file: File) {
    return new Promise<string>((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      let finished = false;
      const timeout = window.setTimeout(() => finish(""), 10000);
      const finish = (value: string) => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        URL.revokeObjectURL(url);
        video.removeAttribute("src");
        resolve(value);
      };
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const total = Math.max(0, Math.round(video.duration));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = String(total % 60).padStart(2, "0");
        finish(hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`);
      };
      video.onerror = () => finish("");
      video.src = url;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormMessage("");
    const validation = validateProject(draft);
    if (!validation.success) {
      setErrors(validation.errors);
      setFormMessage("Please complete all required fields before saving.");
      requestAnimationFrame(() => form?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setErrors({});
    const result = await onSave(validation.project);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormMessage(result.message);
    }
  }

  async function upload(file: File, kind: "thumbnail" | "video") {
    setUploading(true);
    setUploadingVideo(kind === "video");
    setUploadProgress(0);
    setFormMessage("");
    clearError(kind === "thumbnail" ? "thumbnail" : "videoUrl");

    try {
      if (file.size === 0) throw new Error("The selected file is empty. Choose another file.");
      const expectedType = kind === "thumbnail" ? "image/" : "video/";
      if (!file.type.startsWith(expectedType)) {
        throw new Error(kind === "thumbnail" ? "Choose a valid image file." : "Choose a valid video file.");
      }

      const cloudConfigResponse = await fetch("/api/admin/upload", { method: "GET" });
      const cloudConfig = await cloudConfigResponse.json() as CloudinaryUploadConfig & { error?: string };
      if (!cloudConfigResponse.ok) throw new Error(cloudConfig.error ?? "Upload configuration is unavailable.");
      if (!cloudConfig.url || (!cloudConfig.uploadPreset && (!cloudConfig.apiKey || !cloudConfig.signature))) {
        throw new Error("Upload configuration is incomplete. Check the Cloudinary environment variables.");
      }

      if (kind === "video" && cloudConfig.maxVideoBytes && file.size > cloudConfig.maxVideoBytes) {
        const planName = cloudConfig.plan ? `${cloudConfig.plan} plan` : "current plan";
        throw new Error(
          `This video is ${formatFileSize(file.size)}, but your Cloudinary ${planName} allows up to ${formatFileSize(cloudConfig.maxVideoBytes)} per video. Compress the file below that limit or upgrade Cloudinary before uploading.`,
        );
      }

      const resourceUrl = cloudConfig.url.replace("/auto/upload", kind === "video" ? "/video/upload" : "/image/upload");
      const result = kind === "video" && file.size > LARGE_UPLOAD_THRESHOLD
        ? await uploadInChunks(file, cloudConfig, resourceUrl, setUploadProgress)
        : await sendUploadRequest({
          url: resourceUrl,
          data: uploadFormData(file, file.name, cloudConfig),
          timeout: 30 * 60 * 1000,
          onProgress: (loaded, total) => {
            if (total) setUploadProgress(Math.max(0, Math.min(100, Math.round((loaded / total) * 100))));
          },
        });

      const url = result.secure_url ?? result.url ?? "";
      if (!url) throw new Error("The upload completed without a usable file URL. Try again.");

      if (kind === "thumbnail") {
        update("thumbnail", url);
        update("poster", url);
      } else {
        const detectedDuration = await detectDuration(file);
        update("sources", [{ ...draft.sources?.[0], src: url, type: file.type || "video/mp4", label: draft.sources?.[0]?.label || "1080p" }]);
        const generatedThumbnail = getVideoThumbnailUrl(url);
        if (generatedThumbnail) {
          update("thumbnail", generatedThumbnail);
          update("poster", generatedThumbnail);
        }
        if (detectedDuration) update("duration", detectedDuration);
      }
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Upload failed because the server could not be reached.");
    } finally {
      setUploading(false);
      setUploadingVideo(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  }

  const source = draft.sources?.[0] ?? { src: "", type: "video/mp4", label: "1080p" };
  const normalizedCategory = (draft.category ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const isThumbnailOnlyProject = normalizedCategory === "thumbnail" || normalizedCategory.includes("thumbnail");
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Project editor">
    <button className="admin-backdrop" onClick={handleClose} aria-label="Close editor" />
    <form onSubmit={submit} noValidate>
      <header><div><p className="admin-kicker">{onDelete ? "Edit project" : "New project"}</p><h2>{draft.title || "Untitled project"}</h2></div><button type="button" onClick={handleClose} aria-label="Close"><Close /></button></header>
      <div className="admin-form-body"><div className="admin-form-grid">
        {formMessage && <div className="admin-form-summary" role="alert">{formMessage}</div>}
        <Field name="title" label="Project title *" value={draft.title} error={errors.title} onChange={(value) => { update("title", value); clearError("title"); if (!onDelete) update("slug", autoSlug(value)); }} />
        <Field name="year" label="Year *" type="number" value={String(draft.year || "")} error={errors.year} onChange={(value) => { update("year", Number(value)); clearError("year"); }} />
        <TextField name="longDescription" label="Full project description *" value={draft.longDescription} error={errors.longDescription} onChange={(value) => { update("longDescription", value); clearError("longDescription"); }} />
        <label className={`admin-field ${errors.category ? "has-error" : ""}`}><span>Category *</span><input list="category-options" value={draft.category ?? ""} aria-invalid={Boolean(errors.category)} onChange={(event) => { update("category", event.target.value); clearError("category"); }} placeholder="Select or type a category" /><datalist id="category-options">{categories.filter((item) => item.slug !== "all").map((item) => <option key={item.slug} value={item.label} />)}</datalist>{errors.category && <small className="admin-field-error">{errors.category}</small>}</label>

        <div className="admin-form-section"><h3>Media</h3><p>{isThumbnailOnlyProject ? "Upload the image for this thumbnail project." : "Upload the project video. Its preview image and duration are generated automatically."}</p></div>
        {isThumbnailOnlyProject && <label className={`admin-field wide ${errors.thumbnail ? "has-error" : ""}`}><span>Thumbnail image *</span><input disabled={busy || uploading} type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file, "thumbnail"); }} />{uploading && !uploadingVideo && <UploadProgress value={uploadProgress} label="Uploading image" />}{draft.thumbnail && !uploading && <small className="admin-uploaded">✓ Thumbnail uploaded</small>}{errors.thumbnail && <small className="admin-field-error">{errors.thumbnail}</small>}</label>}
        {!isThumbnailOnlyProject && <label className={`admin-field wide ${errors.videoUrl ? "has-error" : ""}`}><span>Video file *</span><input disabled={busy || uploading} type="file" accept="video/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file, "video"); }} />{uploadingVideo && <UploadProgress value={uploadProgress} label="Uploading video" />}{source.src && !uploading && <small className="admin-uploaded">✓ Video source added</small>}{errors.videoUrl && <small className="admin-field-error">{errors.videoUrl}</small>}</label>}
        {!isThumbnailOnlyProject && <Field label="Video MIME type" value={source.type ?? "video/mp4"} onChange={(value) => update("sources", [{ ...source, type: value }])} />}
        {!isThumbnailOnlyProject && <Field label="Quality label" value={source.label ?? "1080p"} onChange={(value) => update("sources", [{ ...source, label: value }])} />}
        <label className="admin-check"><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => update("featured", event.target.checked)} /><span><strong>Featured project</strong><small>Show this project in Selected Work on the homepage.</small></span></label>
      </div></div>
      <footer>{onDelete ? <button type="button" className="admin-delete" disabled={busy || uploading} onClick={() => void onDelete(draft)}>Delete project</button> : <span />}<div><button type="button" className="admin-cancel" onClick={handleClose}>Cancel</button><button className="admin-button" disabled={busy || uploading}>{uploading ? (uploadingVideo ? `Uploading ${uploadProgress}%…` : "Uploading…") : busy ? "Saving…" : "Save project"}</button></div></footer>
    </form>
  </div>;
}

function UploadProgress({ value, label }: { value: number; label: string }) {
  return <span className="admin-upload-progress" role="status" aria-live="polite">
    <span><span>{label}</span><strong>{value}%</strong></span>
    <span className="admin-upload-track"><span style={{ width: `${value}%` }} /></span>
  </span>;
}

function Field({ label, value, onChange, wide, name, error, ...props }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean; name?: ProjectField; error?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name">) {
  return <label className={`admin-field ${wide ? "wide" : ""} ${error ? "has-error" : ""}`}><span>{label}</span><input name={name} value={value} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} {...props} />{error && <small className="admin-field-error">{error}</small>}</label>;
}

function TextField({ label, value, onChange, name, error }: { label: string; value: string; onChange: (value: string) => void; name: ProjectField; error?: string }) {
  return <label className={`admin-field wide ${error ? "has-error" : ""}`}><span>{label}</span><textarea name={name} rows={5} value={value} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} />{error && <small className="admin-field-error">{error}</small>}</label>;
}
