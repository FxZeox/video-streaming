"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import type { PortfolioProject } from "@/data/projects";
import { ArrowRight, Check, Close, Eye, EyeOff, Play } from "@/components/icons";
import { categories } from "@/data/categories";
import { siteConfig } from "@/lib/site";

const emptyProject = (): PortfolioProject => ({
  id: crypto.randomUUID(), slug: "", title: "", eyebrow: "Project", description: "", longDescription: "", thumbnail: "", poster: "",
  sources: [{ src: "", type: "video/mp4", label: "1080p" }], duration: "00:00", year: new Date().getFullYear(), role: "Video editing", tools: [], featured: true,
});

export function AdminDashboard({ authenticated, configured, initialProjects }: { authenticated: boolean; configured: boolean; initialProjects: PortfolioProject[] }) {
  const [loggedIn, setLoggedIn] = useState(authenticated);
  const [projects, setProjects] = useState(initialProjects);
  const [selected, setSelected] = useState<PortfolioProject | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "Could not sign in.");
    const projectsResponse = await fetch("/api/admin/projects", { cache: "no-store" });
    setProjects(await projectsResponse.json()); setLoggedIn(true);
  }

  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); setLoggedIn(false); setSelected(null); }

  async function save(project: PortfolioProject) {
    setBusy(true); setMessage("");
    const normalizedProject = { ...project, id: String(project.id || crypto.randomUUID()), slug: String(project.slug || "untitled") };
    const exists = projects.some((item) => String(item.id) === String(normalizedProject.id));
    const response = await fetch("/api/admin/projects", { method: exists ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalizedProject) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "Could not save project.");
    setProjects((items) => exists ? items.map((item) => String(item.id) === String(result.id) ? result : item) : [result, ...items]);
    setSelected(null); setMessage("Project saved. The portfolio now uses the updated details.");
  }

  async function remove(project: PortfolioProject) {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    const response = await fetch("/api/admin/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: String(project.id), slug: String(project.slug) }) });
    if (!response.ok) return setMessage("Could not delete the project.");
    setProjects((items) => items.filter((item) => String(item.id) !== String(project.id) && String(item.slug) !== String(project.slug))); setSelected(null); setMessage("Project deleted.");
  }

  if (!loggedIn) return <main className="admin-login"><section><Link className="admin-brand" href="/">{siteConfig.name}</Link><p className="admin-kicker">Private administration</p><h1>Welcome<br /><em>back.</em></h1>{!configured && <div className="admin-warning">Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET in <code>.env.local</code> before signing in.</div>}<form onSubmit={login}><label>Username<input name="username" autoComplete="username" required /></label><label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{message && <p className="admin-error" role="alert">{message}</p>}<button className="admin-button" disabled={busy || !configured}>{busy ? "Signing in…" : <>Sign in <ArrowRight /></>}</button></form><small>This page is intentionally not linked from the public website.</small></section></main>;

  return <main className="admin-shell">
    <header className="admin-header"><div><span className="admin-brand">{siteConfig.name}</span><span className="admin-divider" /><span>Project admin</span></div><div><Link href="/" target="_blank">View website ↗</Link><button onClick={logout}>Sign out</button></div></header>
    <div className="admin-body"><aside className="admin-sidebar"><p>Content</p><button className="active"><Play /> Projects <span>{projects.length}</span></button></aside>
      <section className="admin-content"><div className="admin-title"><div><p className="admin-kicker">Portfolio library</p><h1>Projects</h1><span>Manage the work displayed across your portfolio.</span></div><button className="admin-button" onClick={() => { setSelected(emptyProject()); setMessage(""); }}>+ Add project</button></div>
        {message && <div className={`admin-message ${message.includes("saved") ? "success" : ""}`}><Check />{message}<button onClick={() => setMessage("")}><Close /></button></div>}
        <div className="admin-projects">
          <div className="admin-table-head"><span>Project</span><span>Category</span><span>Video source</span><span>Year</span><span>Status</span><span /></div>
          {projects.map((project) => {
            const thumbStyle = project.thumbnail ? { backgroundImage: `url("${String(project.thumbnail).replace(/"/g, "%22")}")` } : { backgroundColor: "#222" };
            return (
              <article key={project.id}>
                <div className={`admin-thumb ${project.thumbnail ? "" : "admin-thumb--empty"}`} style={thumbStyle} />
                <div><strong>{project.title || "Untitled project"}</strong><small>/{project.slug || "untitled"}</small></div>
                <div><small>{project.category ?? "—"}</small></div>
                <div className="admin-source"><span>{project.sources?.[0]?.src || "No video source"}</span></div>
                <span>{project.year || new Date().getFullYear()}</span>
                <span className={project.featured ? "status-featured" : "status-live"}>{project.featured ? "Featured" : "Live"}</span>
                <button onClick={() => { setSelected(structuredClone(project)); setMessage(""); }}>Edit</button>
              </article>
            );
          })}
        </div>
        {!projects.length && <div className="admin-empty">No projects yet. Add your first video project.</div>}
      </section>
    </div>
    {selected && <ProjectEditor project={selected} busy={busy} onClose={() => setSelected(null)} onSave={save} onDelete={projects.some((item) => item.id === selected.id) ? remove : undefined} onSetBusy={setBusy} onSetMessage={setMessage} />}
  </main>;
}

function ProjectEditor({ project, busy, onClose, onSave, onDelete, onSetBusy, onSetMessage }: { project: PortfolioProject; busy: boolean; onClose: () => void; onSave: (project: PortfolioProject) => void; onDelete?: (project: PortfolioProject) => void; onSetBusy?: (b: boolean) => void; onSetMessage?: (m: string) => void }) {
  const [draft, setDraft] = useState(project);
  const [uploading, setUploading] = useState(false);
  const [localMessage, setLocalMessage] = useState("");
  const update = <K extends keyof PortfolioProject>(key: K, value: PortfolioProject[K]) => setDraft((item) => ({ ...item, [key]: value }));
  const autoSlug = (title: string) => title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  // No server-side image listing — admin uploads directly to Cloudinary.
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Project editor"><button className="admin-backdrop" onClick={onClose} aria-label="Close editor" /><form onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><header><div><p className="admin-kicker">{onDelete ? "Edit project" : "New project"}</p><h2>{draft.title || "Untitled project"}</h2></div><button type="button" onClick={onClose} aria-label="Close"><Close /></button></header><div className="admin-form-body">
      <div className="admin-form-grid">
        <Field label="Project title" value={draft.title} onChange={(value) => { update("title", value); if (!onDelete) update("slug", autoSlug(value)); }} required />
        <Field label="URL slug" value={draft.slug} onChange={(value) => update("slug", value)} required />
        <Field label="Type / eyebrow" value={draft.eyebrow} onChange={(value) => update("eyebrow", value)} />
        <Field label="Year" type="number" value={String(draft.year)} onChange={(value) => update("year", Number(value))} />
        <Field label="Role" value={draft.role} onChange={(value) => update("role", value)} />
        <Field label="Card description" value={draft.description} onChange={(value) => update("description", value)} wide />
        <TextField label="Full project description" value={draft.longDescription} onChange={(value) => update("longDescription", value)} />

        <label className="admin-field"><span>Category</span>
          <input list="category-options" value={draft.category ?? ""} onChange={(e) => update("category", e.target.value)} placeholder="Select or type a category" />
          <datalist id="category-options">{categories.map((c) => <option key={c.slug} value={c.label} />)}</datalist>
        </label>

        <div className="admin-form-section"><h3>Media</h3><p>Upload thumbnail and video files. Files are uploaded to Cloudinary.</p></div>
        <label className="admin-field"><span>Upload thumbnail</span><input disabled={busy || uploading} type="file" accept="image/*" onChange={async (e) => {
          const file = e.currentTarget.files?.[0]; if (!file) return; (onSetBusy ?? setUploading)(true);
          try {
            const fd = new FormData(); fd.append("file", file);
            const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
            const json = await res.json();
            if (res.ok) update("thumbnail", json.path);
              if (res.ok) update("poster", json.path);
            else (onSetMessage ?? setLocalMessage)(json.error ?? "Upload failed");
          } catch (err) { (onSetMessage ?? setLocalMessage)("Upload failed"); }
          finally { (onSetBusy ?? setUploading)(false); }
        }} /></label>
        <label className="admin-field wide"><span>Upload video</span><input disabled={busy || uploading} type="file" accept="video/*" onChange={async (e) => {
          const file = e.currentTarget.files?.[0]; if (!file) return; (onSetBusy ?? setUploading)(true);
          try {
            const fd = new FormData(); fd.append("file", file);
            const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
            const json = await res.json();
            if (res.ok) update("sources", [{ ...draft.sources[0], src: json.path, type: file.type }]);
              // if poster absent, set poster to video thumbnail placeholder (no-op here)
            else (onSetMessage ?? setLocalMessage)(json.error ?? "Upload failed");
          } catch (err) { (onSetMessage ?? setLocalMessage)("Upload failed"); }
          finally { (onSetBusy ?? setUploading)(false); }
        }} /></label>
        <Field label="Video MIME type" value={draft.sources[0]?.type ?? "video/mp4"} onChange={(value) => update("sources", [{ ...draft.sources[0], type: value }])} />
        <Field label="Quality label" value={draft.sources[0]?.label ?? "1080p"} onChange={(value) => update("sources", [{ ...draft.sources[0], label: value }])} />
        <Field label="Tools (comma separated)" value={(draft.tools ?? []).join(", ")} onChange={(value) => update("tools", value.split(",").map((item) => item.trim()).filter(Boolean))} wide />
      <label className="admin-check"><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => update("featured", event.target.checked)} /><span><strong>Featured project</strong><small>Show this project in Selected Work on the homepage.</small></span></label>
    </div></div><footer>{onDelete ? <button type="button" className="admin-delete" onClick={() => onDelete(draft)}>Delete project</button> : <span />}<div><button type="button" className="admin-cancel" onClick={onClose}>Cancel</button><button className="admin-button" disabled={busy}>{busy ? "Saving…" : "Save project"}</button></div></footer></form></div>;
}

function Field({ label, value, onChange, wide, ...props }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) { return <label className={`admin-field ${wide ? "wide" : ""}`}><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>; }
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="admin-field wide"><span>{label}</span><textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
