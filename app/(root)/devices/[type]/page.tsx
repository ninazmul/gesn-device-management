import { getDevices } from "@/lib/actions/device.actions";
import { DeviceTable } from "@/components/devices/DeviceTable";
import { DeviceMobileCards } from "@/components/devices/DeviceMobileCards";
import { DeviceFilters } from "@/components/devices/DeviceFilters";
import { PRIMARY_DEVICE_TYPES } from "@/lib/constants";
import { DeviceSectionHeader } from "./DeviceSectionHeader";

export const dynamic = "force-dynamic";

interface DeviceTypePageProps {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    brand?: string;
    model?: string;
    sortBy?: string;
    page?: string;
  }>;
}

function getDeviceTypeInfo(slug: string) {
  const found = PRIMARY_DEVICE_TYPES.find(
    (t) => t.slug.toLowerCase() === slug.toLowerCase()
  );
  if (found) return found;

  // Capitalize custom type
  const name = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { slug, name, icon: "Network", isProtected: false };
}

export default async function DeviceTypePage({
  params,
  searchParams,
}: DeviceTypePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const typeSlug = resolvedParams.type.toLowerCase().trim();
  const typeInfo = getDeviceTypeInfo(typeSlug);

  const page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page, 10)
    : 1;

  const { devices, total, totalPages, limit } = await getDevices({
    deviceType: typeSlug,
    search: resolvedSearchParams.search,
    status: resolvedSearchParams.status,
    brand: resolvedSearchParams.brand,
    model: resolvedSearchParams.model,
    sortBy: resolvedSearchParams.sortBy,
    page,
    limit: 25,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <DeviceSectionHeader
        typeSlug={typeSlug}
        typeName={typeInfo.name}
        total={total}
      />

      {/* Filter Toolbar */}
      <DeviceFilters currentType={typeSlug} totalDevices={total} />

      {/* Desktop High-Density Table */}
      <div className="hidden lg:block">
        <DeviceTable
          devices={devices}
          total={total}
          page={page}
          totalPages={totalPages}
          limit={limit}
          currentType={typeSlug}
          typeName={typeInfo.name}
        />
      </div>

      {/* Mobile Card Layout */}
      <DeviceMobileCards
        devices={devices}
        total={total}
        page={page}
        totalPages={totalPages}
        limit={limit}
        currentType={typeSlug}
        typeName={typeInfo.name}
      />
    </div>
  );
}
