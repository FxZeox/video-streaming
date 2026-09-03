"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const isAdmin = usePathname().startsWith("/admin");
  if (isAdmin) return children;
  return <><Navbar />{children}<Footer /></>;
}
