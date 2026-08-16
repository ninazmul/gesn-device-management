import { getDashboardStats } from "@/lib/actions/dashboard.actions";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return <DashboardClient stats={stats} />;
}
