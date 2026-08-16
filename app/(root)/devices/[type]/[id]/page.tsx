import { getDeviceById } from "@/lib/actions/device.actions";
import { DeviceDetailsView } from "@/components/devices/DeviceDetailsView";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface DeviceDetailsPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

export default async function DeviceDetailsPage({
  params,
}: DeviceDetailsPageProps) {
  const resolvedParams = await params;
  const device = await getDeviceById(resolvedParams.id);

  if (!device) {
    notFound();
  }

  return <DeviceDetailsView device={device} />;
}
