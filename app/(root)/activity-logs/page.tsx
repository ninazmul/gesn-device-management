import { getActivityLogs } from "@/lib/actions/activityLog.actions";
import ActivityLogsClient from "./components/ActivityLogsClient";
import { redirect } from "next/navigation";
import { getCurrentAdminProfile } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/sign-in");
  if (admin.role !== "super_admin") redirect("/access-denied");

  const initialData = await getActivityLogs({ page: 1, limit: 25 });
  return (
    <ActivityLogsClient
      initialLogs={initialData.logs}
      initialTotal={initialData.total}
      initialTotalPages={initialData.totalPages}
    />
  );
}
