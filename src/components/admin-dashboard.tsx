"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PortfolioProject } from "@/data/projects";
import { categories } from "@/data/categories";
import { ArrowRight, Check, Close, Eye, EyeOff, Play } from "@/components/icons";
import { siteConfig } from "@/lib/site";
import { validateProject, type ProjectField, type ProjectFieldErrors } from "@/lib/project-validation";

type SaveResult = { ok: true } | { ok: false; message: string; fieldErrors?: ProjectFieldErrors };

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

export function AdminDashboard({ authenticated, configured, initialProjects }: { authenticated: boolean; configured: boolean; initialProjects: PortfolioProject[] }) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(authenticated);
  const [projects, setProjects] = useState(initialProjects);
  const [selected, setSelected] = useState<PortfolioProject | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const exists = projects.some((item) => item.id === project.id);
    try {
      const response = await fetch("/api/admin/projects", {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      const result = await response.json();
      if (response.status === 401) {
        setLoggedIn(false);
        return { ok: false, message: result.error ?? "Your session expired." };
      }
      if (!response.ok) return { ok: false, message: result.error ?? "Could not save the project.", fieldErrors: result.fieldErrors };
      setProjects((items) => exists ? items.map((item) => item.id === result.id ? result : item) : [result, ...items]);
      setSelected(null);
      setMessage("Project saved. It is now visible on the website.");
      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not connect to the server. Your project was not saved." };
    } finally {
      setBusy(false);
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
        <div className="admin-title"><div><p className="admin-kicker">Portfolio library</p><h1>Projects</h1><span>Manage the work displayed across your portfolio.</span></div><button className="admin-button" onClick={() => { setSelected(emptyProject()); setMessage(""); }}>+ Add project</button></div>
        <section className="admin-guide" aria-labelledby="publishing-guide-title">
          <div className="admin-guide-heading"><div><span>Quick guide</span><h2 id="publishing-guide-title">Publishing a project</h2></div><p>Complete these steps in order. Required fields are marked with an asterisk.</p></div>
          <ol>
            <li><span>01</span><div><strong>Add the story</strong><p>Enter a clear title, project type, year, category, and both descriptions.</p></div></li>
            <li><span>02</span><div><strong>Upload a thumbnail</strong><p>Use a 16:9 JPG, PNG, or WebP image. A 1600 × 900 image works best.</p></div></li>
            <li><span>03</span><div><strong>Upload the video</strong><p>Choose an MP4 or WebM file up to 100 MB. Duration is detected automatically.</p></div></li>
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
            <button onClick={() => { setSelected(structuredClone(project)); setMessage(""); }}>Edit</button>
          </article>)}
        </div> : <div className="admin-empty">No projects yet. Add your first video project.</div>}
      </section>
    </div>
    {selected && <ProjectEditor project={selected} busy={busy} onClose={() => setSelected(null)} onSave={save} onDelete={projects.some((item) => item.id === selected.id) ? remove : undefined} />}
  </main>;
}

function ProjectEditor({ project, busy, onClose, onSave, onDelete }: { project: PortfolioProject; busy: boolean; onClose: () => void; onSave: (project: PortfolioProject) => Promise<SaveResult>; onDelete?: (project: PortfolioProject) => Promise<void> }) {
  const [draft, setDraft] = useState(project);
  const [uploading, setUploading] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const update = <K extends keyof PortfolioProject>(key: K, value: PortfolioProject[K]) => setDraft((item) => ({ ...item, [key]: value }));
  const clearError = (field: ProjectField) => setErrors((current) => ({ ...current, [field]: undefined }));
  const autoSlug = (title: string) => title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function detectDuration(file: File) {
    return new Promise<string>((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      const finish = (value: string) => { URL.revokeObjectURL(url); resolve(value); };
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
    setFormMessage("");
    const validation = validateProject(draft);
    if (!validation.success) {
      setErrors(validation.errors);
      setFormMessage("Please complete all required fields before saving.");
      requestAnimationFrame(() => event.currentTarget.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
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
    setFormMessage("");
    clearError(kind === "thumbnail" ? "thumbnail" : "videoUrl");
    try {
      const detectedDuration = kind === "video" ? await detectDuration(file) : "";
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) return setFormMessage(result.error ?? "Upload failed.");
      if (kind === "thumbnail") {
        update("thumbnail", result.path);
        update("poster", result.path);
      } else {
        update("sources", [{ ...draft.sources?.[0], src: result.path, type: file.type || "video/mp4", label: draft.sources?.[0]?.label || "1080p" }]);
        if (detectedDuration) update("duration", detectedDuration);
      }
    } catch {
      setFormMessage("Upload failed because the server could not be reached.");
    } finally {
      setUploading(false);
    }
  }

  const source = draft.sources?.[0] ?? { src: "", type: "video/mp4", label: "1080p" };
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Project editor">
    <button className="admin-backdrop" onClick={onClose} aria-label="Close editor" />
    <form onSubmit={submit} noValidate>
      <header><div><p className="admin-kicker">{onDelete ? "Edit project" : "New project"}</p><h2>{draft.title || "Untitled project"}</h2></div><button type="button" onClick={onClose} aria-label="Close"><Close /></button></header>
      <div className="admin-form-body"><div className="admin-form-grid">
        {formMessage && <div className="admin-form-summary" role="alert">{formMessage}</div>}
        <Field name="title" label="Project title *" value={draft.title} error={errors.title} onChange={(value) => { update("title", value); clearError("title"); if (!onDelete) { update("slug", autoSlug(value)); clearError("slug"); } }} />
        <Field name="slug" label="URL slug *" value={draft.slug} error={errors.slug} onChange={(value) => { update("slug", autoSlug(value)); clearError("slug"); }} />
        <Field name="eyebrow" label="Project type *" value={draft.eyebrow} error={errors.eyebrow} onChange={(value) => { update("eyebrow", value); clearError("eyebrow"); }} placeholder="Brand film" />
        <Field name="year" label="Year *" type="number" value={String(draft.year || "")} error={errors.year} onChange={(value) => { update("year", Number(value)); clearError("year"); }} />
        <Field name="description" label="Card description *" value={draft.description} error={errors.description} onChange={(value) => { update("description", value); clearError("description"); }} wide />
        <TextField name="longDescription" label="Full project description *" value={draft.longDescription} error={errors.longDescription} onChange={(value) => { update("longDescription", value); clearError("longDescription"); }} />
        <label className={`admin-field ${errors.category ? "has-error" : ""}`}><span>Category *</span><input list="category-options" value={draft.category ?? ""} aria-invalid={Boolean(errors.category)} onChange={(event) => { update("category", event.target.value); clearError("category"); }} placeholder="Select or type a category" /><datalist id="category-options">{categories.filter((item) => item.slug !== "all").map((item) => <option key={item.slug} value={item.label} />)}</datalist>{errors.category && <small className="admin-field-error">{errors.category}</small>}</label>

        <div className="admin-form-section"><h3>Media</h3><p>Upload the project thumbnail and video. Duration is detected automatically from the video file.</p></div>
        <label className={`admin-field wide ${errors.thumbnail ? "has-error" : ""}`}><span>Thumbnail image *</span><input disabled={busy || uploading} type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file, "thumbnail"); }} />{draft.thumbnail && <small className="admin-uploaded">✓ Thumbnail uploaded</small>}{errors.thumbnail && <small className="admin-field-error">{errors.thumbnail}</small>}</label>
        <label className={`admin-field wide ${errors.videoUrl ? "has-error" : ""}`}><span>Video file *</span><input disabled={busy || uploading} type="file" accept="video/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file, "video"); }} />{source.src && <small className="admin-uploaded">✓ Video source added</small>}{errors.videoUrl && <small className="admin-field-error">{errors.videoUrl}</small>}</label>
        <Field label="Video MIME type" value={source.type ?? "video/mp4"} onChange={(value) => update("sources", [{ ...source, type: value }])} />
        <Field label="Quality label" value={source.label ?? "1080p"} onChange={(value) => update("sources", [{ ...source, label: value }])} />
        <label className="admin-check"><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => update("featured", event.target.checked)} /><span><strong>Featured project</strong><small>Show this project in Selected Work on the homepage.</small></span></label>
      </div></div>
      <footer>{onDelete ? <button type="button" className="admin-delete" disabled={busy || uploading} onClick={() => void onDelete(draft)}>Delete project</button> : <span />}<div><button type="button" className="admin-cancel" onClick={onClose}>Cancel</button><button className="admin-button" disabled={busy || uploading}>{uploading ? "Uploading…" : busy ? "Saving…" : "Save project"}</button></div></footer>
    </form>
  </div>;
}

function Field({ label, value, onChange, wide, name, error, ...props }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean; name?: ProjectField; error?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name">) {
  return <label className={`admin-field ${wide ? "wide" : ""} ${error ? "has-error" : ""}`}><span>{label}</span><input name={name} value={value} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} {...props} />{error && <small className="admin-field-error">{error}</small>}</label>;
}

function TextField({ label, value, onChange, name, error }: { label: string; value: string; onChange: (value: string) => void; name: ProjectField; error?: string }) {
  return <label className={`admin-field wide ${error ? "has-error" : ""}`}><span>{label}</span><textarea name={name} rows={5} value={value} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} />{error && <small className="admin-field-error">{error}</small>}</label>;
}
