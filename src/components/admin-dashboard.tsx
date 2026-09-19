"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PortfolioProject } from "@/data/projects";
import { categories } from "@/data/categories";
import { ArrowRight, Check, Close, Eye, EyeOff, Play } from "@/components/icons";
import { siteConfig } from "@/lib/site";
import { getYouTubeThumbnailUrl, validateProject, type ProjectField, type ProjectFieldErrors } from "@/lib/project-validation";

type SaveResult = { ok: true } | { ok: false; message: string; fieldErrors?: ProjectFieldErrors };

type CloudinaryUploadConfig = {
  url: string;
  uploadPreset?: string | null;
  apiKey?: string | null;
  timestamp?: number;
  signature?: string | null;
};

type CloudinaryUploadResult = {
  secure_url?: string;
  url?: string;
  error?: { message?: string };
};

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

function sendUploadRequest({ url, data, timeout, onProgress }: {
  url: string;
  data: FormData;
  timeout: number;
  onProgress: (loaded: number, total: number) => void;
}) {
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = timeout;
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
      <p className="admin-kicker">Private administration</p><h1>Welcome<br /><span>back.</span></h1>
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
            <li><span>02</span><div><strong>Prepare the media</strong><p>Upload videos to YouTube as Unlisted. Thumbnail projects still use an image.</p></div></li>
            <li><span>03</span><div><strong>Add the media</strong><p>Paste the YouTube share link, or upload an image for the Thumbnail category.</p></div></li>
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

  async function uploadThumbnail(file: File) {
    setUploading(true);
    setUploadProgress(0);
    setFormMessage("");
    clearError("thumbnail");

    try {
      if (file.size === 0) throw new Error("The selected file is empty. Choose another file.");
      if (!file.type.startsWith("image/")) throw new Error("Choose a valid image file.");

      const cloudConfigResponse = await fetch("/api/admin/upload", { method: "GET" });
      const cloudConfig = await cloudConfigResponse.json() as CloudinaryUploadConfig & { error?: string };
      if (!cloudConfigResponse.ok) throw new Error(cloudConfig.error ?? "Upload configuration is unavailable.");
      if (!cloudConfig.url || (!cloudConfig.uploadPreset && (!cloudConfig.apiKey || !cloudConfig.signature))) {
        throw new Error("Upload configuration is incomplete. Check the Cloudinary environment variables.");
      }

      const resourceUrl = cloudConfig.url.replace("/auto/upload", "/image/upload");
      const result = await sendUploadRequest({
        url: resourceUrl,
        data: uploadFormData(file, file.name, cloudConfig),
        timeout: 10 * 60 * 1000,
        onProgress: (loaded, total) => {
          if (total) setUploadProgress(Math.max(0, Math.min(100, Math.round((loaded / total) * 100))));
        },
      });

      const url = result.secure_url ?? result.url ?? "";
      if (!url) throw new Error("The upload completed without a usable file URL. Try again.");

      update("thumbnail", url);
      update("poster", url);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Upload failed because the server could not be reached.");
    } finally {
      setUploading(false);
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

        <div className="admin-form-section"><h3>Media</h3><p>{isThumbnailOnlyProject ? "Upload the image for this thumbnail project." : "Upload the video to YouTube as Unlisted, enable embedding, then paste its share link below."}</p></div>
        {isThumbnailOnlyProject && <label className={`admin-field wide ${errors.thumbnail ? "has-error" : ""}`}><span>Thumbnail image *</span><input disabled={busy || uploading} type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void uploadThumbnail(file); }} />{uploading && <UploadProgress value={uploadProgress} label="Uploading image" />}{draft.thumbnail && !uploading && <small className="admin-uploaded">✓ Thumbnail uploaded</small>}{errors.thumbnail && <small className="admin-field-error">{errors.thumbnail}</small>}</label>}
        {!isThumbnailOnlyProject && <label className={`admin-field wide ${errors.videoUrl ? "has-error" : ""}`}><span>YouTube video URL *</span><input type="url" inputMode="url" value={source.src} aria-invalid={Boolean(errors.videoUrl)} placeholder="https://youtu.be/VIDEO_ID" onChange={(event) => {
          const url = event.target.value;
          update("sources", [{ src: url, type: "video/youtube", label: "YouTube" }]);
          const thumbnail = getYouTubeThumbnailUrl(url);
          if (thumbnail) { update("thumbnail", thumbnail); update("poster", thumbnail); }
          clearError("videoUrl");
        }} /><small className="admin-field-note">Paste the video URL only—not iframe embed code. In YouTube Studio choose Public or Unlisted and enable Allow embedding.</small>{source.src && !errors.videoUrl && <small className="admin-uploaded">✓ YouTube link added</small>}{errors.videoUrl && <small className="admin-field-error">{errors.videoUrl}</small>}</label>}
        <label className="admin-check"><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => update("featured", event.target.checked)} /><span><strong>Featured project</strong><small>Show this project in Selected Work on the homepage.</small></span></label>
      </div></div>
      <footer>{onDelete ? <button type="button" className="admin-delete" disabled={busy || uploading} onClick={() => void onDelete(draft)}>Delete project</button> : <span />}<div><button type="button" className="admin-cancel" onClick={handleClose}>Cancel</button><button className="admin-button" disabled={busy || uploading}>{uploading ? `Uploading image ${uploadProgress}%…` : busy ? "Saving…" : "Save project"}</button></div></footer>
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
