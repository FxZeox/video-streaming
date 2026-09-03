import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { credentialsAreConfigured, isAdminAuthenticated } from "@/lib/admin-auth";
import { getProjects } from "@/lib/project-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Project Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  return <AdminDashboard authenticated={authenticated} configured={credentialsAreConfigured()} initialProjects={authenticated ? await getProjects() : []} />;
}
