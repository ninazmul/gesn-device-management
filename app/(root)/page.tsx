import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/actions/dashboard.actions";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getCurrentAdminProfile } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = await getCurrentAdminProfile();

  // If no profile, layout already handles redirect to /sign-in or /access-denied
  if (!admin) redirect("/sign-in");

  const stats = await getDashboardStats();
  return <DashboardClient stats={stats} />;
}
