import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/actions/dashboard.actions";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getCurrentAdminProfile } from "@/lib/auth-guard";
import { hasPermissionLevel } from "@/lib/rbac-utils";
import type { ModulePermissions } from "@/types";

export const dynamic = "force-dynamic";

/** Ordered list of fallback routes for users without dashboard access */
const FALLBACK_ROUTES: { module: "devices" | "billing" | "customers" | "catalog" | "activity_logs" | "settings"; path: string }[] = [
  { module: "devices", path: "/devices" },
  { module: "billing", path: "/billing" },
  { module: "customers", path: "/customers" },
  { module: "catalog", path: "/catalog" },
  { module: "activity_logs", path: "/activity-logs" },
  { module: "settings", path: "/settings" },
];

export default async function DashboardPage() {
  const admin = await getCurrentAdminProfile();

  // If no profile, layout already handles redirect to /sign-in or /access-denied
  if (!admin) redirect("/sign-in");

  // Safely resolve permissions — Partial<ModulePermissions> | undefined → ModulePermissions
  const resolvedPerms: ModulePermissions = {
    dashboard: "none",
    devices: "none",
    customers: "none",
    billing: "none",
    catalog: "none",
    admins: "none",
    activity_logs: "none",
    settings: "none",
    ...(admin.permissions || {}),
  };

  const canReadDashboard =
    admin.role === "super_admin" ||
    hasPermissionLevel(resolvedPerms, "dashboard", "read");

  if (!canReadDashboard) {
    // Redirect to the first module this user can read
    for (const { module, path } of FALLBACK_ROUTES) {
      if (hasPermissionLevel(resolvedPerms, module, "read")) {
        redirect(path);
      }
    }
    // All modules are "none" — show access-denied
    redirect("/access-denied");
  }

  const stats = await getDashboardStats();
  return <DashboardClient stats={stats} />;
}
