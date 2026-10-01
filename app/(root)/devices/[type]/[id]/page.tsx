import { getDeviceById } from "@/lib/actions/device.actions";
import { DeviceDetailsView } from "@/components/devices/DeviceDetailsView";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdminProfile } from "@/lib/auth-guard";

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
  const typeSlug = resolvedParams.type.toLowerCase().trim();

  if (typeSlug === "server") {
    const admin = await getCurrentAdminProfile();
    if (!admin) redirect("/sign-in");
    const role = admin.role;
    const hasServerView =
      role === "super_admin" ||
      role === "engineer" ||
      Boolean(admin.granularPermissions?.server_view);
    if (!hasServerView) redirect("/access-denied");
  }

  const device = await getDeviceById(resolvedParams.id);

  if (!device) {
    notFound();
  }

  if (device.deviceType === "server") {
    const admin = await getCurrentAdminProfile();
    if (!admin) redirect("/sign-in");
    const role = admin.role;
    const hasServerView =
      role === "super_admin" ||
      role === "engineer" ||
      Boolean(admin.granularPermissions?.server_view);
    if (!hasServerView) redirect("/access-denied");
  }

  return <DeviceDetailsView device={device} />;
}
