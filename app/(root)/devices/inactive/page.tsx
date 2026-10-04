import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Boxes } from "lucide-react";
import { getDevices } from "@/lib/actions/device.actions";
import { DeviceFilters } from "@/components/devices/DeviceFilters";
import { DeviceMobileCards } from "@/components/devices/DeviceMobileCards";
import { DeviceTable } from "@/components/devices/DeviceTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frozen and Lost Devices | GESN Device Management",
  description: "Review frozen and lost devices.",
};

const FROZEN_LOST_DEVICE_STATUSES = [
  "Frozen",
  "Lost",
] as const;

interface InactiveDevicesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    server?: string;
    sortBy?: string;
    submittedBy?: string;
    page?: string;
  }>;
}

export default async function InactiveDevicesPage({
  searchParams,
}: InactiveDevicesPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const { devices, total, totalPages, limit } = await getDevices({
    statuses: [...FROZEN_LOST_DEVICE_STATUSES],
    search: params.search,
    status: params.status,
    server: params.server,
    sortBy: params.sortBy,
    submittedBy: params.submittedBy,
    page,
    limit: 25,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/50">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                Frozen and Lost Devices
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {total}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Frozen and lost devices
            </p>
          </div>
        </div>
        <Link
          href="/devices"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>All Devices</span>
        </Link>
      </div>

      <DeviceFilters
        totalDevices={total}
        statusOptions={FROZEN_LOST_DEVICE_STATUSES}
      />

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
