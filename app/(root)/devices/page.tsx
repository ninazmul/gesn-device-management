import { getDevices } from "@/lib/actions/device.actions";
import { DeviceTable } from "@/components/devices/DeviceTable";
import { DeviceMobileCards } from "@/components/devices/DeviceMobileCards";
import { DeviceFilters } from "@/components/devices/DeviceFilters";
import { AllDevicesHeader } from "./AllDevicesHeader";

export const dynamic = "force-dynamic";

interface DevicesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    brand?: string;
    model?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function AllDevicesPage({ searchParams }: DevicesPageProps) {
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const { devices, total, totalPages, limit } = await getDevices({
    search: resolvedParams.search,
    status: resolvedParams.status,
    brand: resolvedParams.brand,
    model: resolvedParams.model,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 25,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <AllDevicesHeader total={total} />


      {/* Filter Toolbar */}
      <DeviceFilters totalDevices={total} />

      {/* Desktop High-Density Table */}
      <div className="hidden lg:block">
        <DeviceTable
          devices={devices}
          total={total}
          page={page}
          totalPages={totalPages}
          limit={limit}
          typeName="Device"
        />
      </div>

      {/* Mobile Card Layout */}
      <DeviceMobileCards
        devices={devices}
        total={total}
        page={page}
        totalPages={totalPages}
        limit={limit}
        typeName="Device"
      />
    </div>
  );
}
