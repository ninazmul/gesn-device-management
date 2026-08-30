"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Server,
  Radio,
  Wifi,
  Router as RouterIcon,
  Network,
} from "lucide-react";
import { DeviceStatusBadge } from "./DeviceStatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { DeviceStatusDialog } from "./DeviceStatusDialog";
import { DeviceFormDialog } from "./DeviceFormDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { deleteDevice } from "@/lib/actions/device.actions";
import { toast } from "react-hot-toast";
import type { IDevice } from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";

function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "server":
      return Server;
    case "antenna":
      return Radio;
    case "access-point":
      return Wifi;
    case "router":
      return RouterIcon;
    case "switch":
      return Network;
    default:
      return Network;
  }
}

interface DeviceMobileCardsProps {
  devices: IDevice[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  currentType?: string;
  typeName?: string;
}

export function DeviceMobileCards({
  devices,
  total,
  page,
  totalPages,
}: DeviceMobileCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canWrite } = usePermissions();
  const canWriteDevices = canWrite("devices");

  const [editingDevice, setEditingDevice] = useState<IDevice | null>(null);
  const [statusDevice, setStatusDevice] = useState<IDevice | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<IDevice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDevice) return;
    try {
      setIsDeleting(true);
      await deleteDevice(deletingDevice._id);
      toast.success(`Device #${deletingDevice.sl} deleted successfully`);
      setDeletingDevice(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete device");
    } finally {
      setIsDeleting(false);
    }
  };

  if (devices.length === 0) {
    return null; // Empty state handled in table view
  }

  return (
    <div className="space-y-3 block lg:hidden">
      {devices.map((device) => {
        const Icon = getDeviceIcon(device.deviceType);
        return (
          <div
            key={device._id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
          >
            {/* Header: SL + Name + Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/devices/${device.deviceType}/${device._id}`}
                    className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 truncate block"
                  >
                    {device.deviceName}
                  </Link>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400 font-medium">
                    <span>
                      {device.brand} • <span className="capitalize">{device.deviceType}</span>
                    </span>
                    {device.deviceType === "switch" && device.totalPorts !== undefined && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold text-[10px]">
                        {device.activePortsCount || 0}/{device.totalPorts} Ports
                      </span>
                    )}
                    {device.deviceType !== "server" && device.server && typeof device.server === "object" && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-medium text-[10px]">
                        Server: #{(device.server as IDevice).sl}
                      </span>
                    )}
                    {["antenna", "access-point", "router"].includes(device.deviceType) && device.uplinkSwitch && typeof device.uplinkSwitch === "object" && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:indigo-400 font-medium text-[10px]">
                        UpLink: #{(device.uplinkSwitch as IDevice).sl}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                  #{device.sl}
                </span>
                <button
                  type="button"
                  onClick={() => setStatusDevice(device)}
                  className="cursor-pointer"
                >
                  <DeviceStatusBadge status={device.status} size="sm" />
                </button>
              </div>
            </div>

            {/* Network Info Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400">IP:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {device.ipAddress || "—"}
                  </span>
                  {device.ipAddress && (
                    <CopyButton text={device.ipAddress} label="IP" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400">MAC:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {device.macAddress || "—"}
                  </span>
                  {device.macAddress && (
                    <CopyButton text={device.macAddress} label="MAC" />
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
              {device.onlineLink ? (
                <a
                  href={
                    device.onlineLink.startsWith("http")
                      ? device.onlineLink
                      : `http://${device.onlineLink}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Portal
                </a>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-1">
                <Link
                  href={`/devices/${device.deviceType}/${device._id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 p-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40"
                >
                  <Eye className="w-4 h-4" /> Details
                </Link>
                {canWriteDevices && (
                  <button
                    type="button"
                    onClick={() => setEditingDevice(device)}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canWriteDevices && (
                  <button
                    type="button"
                    onClick={() => setDeletingDevice(device)}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Mobile Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigatePage(page - 1)}
            disabled={page <= 1}
            className="h-8 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
          </Button>

          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigatePage(page + 1)}
            disabled={page >= totalPages}
            className="h-8 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
          >
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Modals */}
      <DeviceStatusDialog
        device={statusDevice}
        open={Boolean(statusDevice)}
        onOpenChange={(open) => !open && setStatusDevice(null)}
        onSuccess={() => router.refresh()}
      />

      <DeviceFormDialog
        open={Boolean(editingDevice)}
        onOpenChange={(open) => !open && setEditingDevice(null)}
        deviceToEdit={editingDevice}
        onSuccess={() => {
          setEditingDevice(null);
          router.refresh();
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deletingDevice)}
        onOpenChange={(open) => !open && setDeletingDevice(null)}
        title={`Delete Device #${deletingDevice?.sl}?`}
        description={`Are you sure you want to delete ${deletingDevice?.deviceName}?`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
