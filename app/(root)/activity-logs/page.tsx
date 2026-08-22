import { getActivityLogs } from "@/lib/actions/activityLog.actions";
import ActivityLogsClient from "./components/ActivityLogsClient";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const initialData = await getActivityLogs({ page: 1, limit: 25 });
  return (
    <ActivityLogsClient
      initialLogs={initialData.logs}
      initialTotal={initialData.total}
      initialTotalPages={initialData.totalPages}
    />
  );
}
