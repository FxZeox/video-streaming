"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PortfolioProject } from "@/data/projects";
import { categories } from "@/data/categories";
import { VideoGrid } from "@/components/video-card";

export default function WorkList({ projects }: { projects: PortfolioProject[] }) {
  const search = useSearchParams();
  const initial = search?.get("category") ?? "all";
  const [selected, setSelected] = useState(initial || "all");
  const cats = categories;
  const labelFor = (slug: string) => cats.find((c) => c.slug === slug)?.label ?? slug;
  const filtered = selected === "all" ? projects : projects.filter((p) => (p.category ?? "").toLowerCase() === labelFor(selected).toLowerCase());
  return (
    <>
      <nav className="category-nav" aria-label="Project categories">
        <ul>
          {cats.map((c) => (
            <li key={c.slug} className={selected === c.slug ? "active" : ""}>
              <button onClick={() => setSelected(c.slug)} aria-pressed={selected === c.slug}>{c.label}</button>
            </li>
          ))}
        </ul>
      </nav>
      <VideoGrid projects={filtered} />
    </>
  );
}
