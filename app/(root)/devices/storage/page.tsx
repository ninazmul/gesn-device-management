import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";
import { DeviceMobileCards } from "@/components/devices/DeviceMobileCards";
import { DeviceTable } from "@/components/devices/DeviceTable";
import { getDevices } from "@/lib/actions/device.actions";

export const dynamic = "force-dynamic";

interface StoragePageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
  }>;
}

export default async function StoragePage({ searchParams }: StoragePageProps) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  const { devices, total, totalPages, limit } = await getDevices({
    deviceType: params.type,
    status: "Available",
    page,
    limit: 25,
  });
  const typeLabel = params.type
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const heading = typeLabel
    ? `${typeLabel} Storage`
    : "Device Storage";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066ff] dark:bg-blue-950/50 dark:text-blue-400">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {heading}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {total.toLocaleString()} available {total === 1 ? "device" : "devices"} in storage
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      {total > 0 ? (
        <>
          <div className="hidden lg:block">
            <DeviceTable
              devices={devices}
              total={total}
              page={page}
              totalPages={totalPages}
              limit={limit}
              typeName="Stored Device"
              storageMode
            />
          </div>
          <DeviceMobileCards
            devices={devices}
            total={total}
            page={page}
            totalPages={totalPages}
            limit={limit}
            storageMode
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No devices are currently in storage.
        </div>
      )}
    </div>
  );
}
