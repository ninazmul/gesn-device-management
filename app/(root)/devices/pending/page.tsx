import { getPendingDevices } from "@/lib/actions/device.actions";
import { PendingDevicesClient } from "./PendingDevicesClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pending Device Approvals | GESN Device Management",
  description: "Review, approve, or reject new hardware submissions awaiting authorization.",
};

interface PendingDevicesPageProps {
  searchParams: Promise<{
    search?: string;
    deviceType?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function PendingDevicesPage({
  searchParams,
}: PendingDevicesPageProps) {
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const result = await getPendingDevices({
    search: resolvedParams.search,
    deviceType: resolvedParams.deviceType,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 25,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <PendingDevicesClient
        initialDevices={result.devices}
        total={result.total}
        page={result.page}
        limit={result.limit}
        totalPages={result.totalPages}
        byType={result.byType}
      />
    </div>
  );
}
