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
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { DeviceStatusBadge } from "./DeviceStatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { DeviceStatusDialog } from "./DeviceStatusDialog";
import { DeviceFormDialog } from "./DeviceFormDialog";
import { RejectDeviceDialog } from "./RejectDeviceDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import {
  deleteDevice,
  deleteStoredDevice,
  toggleDeviceOnline,
  approveDevice,
} from "@/lib/actions/device.actions";
import { formatDisplaySL } from "@/lib/utils";
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

function getDeviceTypeTheme(type: string) {
  switch (type?.toLowerCase()) {
    case "antenna":
      return {
        bg: "bg-[#e0f2fe] dark:bg-sky-950/60",
        border: "border-[#bae6fd] dark:border-sky-800/60",
        text: "text-[#0284c7] dark:text-sky-400",
      };
    case "access-point":
      return {
        bg: "bg-[#f3e8ff] dark:bg-purple-950/60",
        border: "border-[#e9d5ff] dark:border-purple-800/60",
        text: "text-[#9333ea] dark:text-purple-400",
      };
    case "router":
      return {
        bg: "bg-[#e0e7ff] dark:bg-indigo-950/60",
        border: "border-[#c7d2fe] dark:border-indigo-800/60",
        text: "text-[#4f46e5] dark:text-indigo-400",
      };
    case "switch":
      return {
        bg: "bg-[#dcfce7] dark:bg-emerald-950/60",
        border: "border-[#bbf7d0] dark:border-emerald-800/60",
        text: "text-[#16a34a] dark:text-emerald-400",
      };
    case "server":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/60",
        border: "border-blue-200/60 dark:border-blue-800/60",
        text: "text-blue-600 dark:text-blue-400",
      };
    default:
      return {
        bg: "bg-sky-50 dark:bg-sky-950/40",
        border: "border-sky-200/50 dark:border-sky-800/50",
        text: "text-sky-600 dark:text-sky-400",
      };
  }
}

interface DeviceMobileCardsProps {
  devices: IDevice[];
  total: number;
  page: number;
  totalPages: number;
  limit?: number;
  currentType?: string;
  typeName?: string;
  storageMode?: boolean;
}

export function DeviceMobileCards({
  devices,
  total,
  page,
  totalPages,
  limit = 25,
  currentType,
  storageMode = false,
}: DeviceMobileCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isSuperAdmin,
    isEngineer,
    admin,
    canApproveDevice,
    canApprovePendingDevice,
    canDeleteDevice,
    canEditDevice,
    canArchiveDevice,
    can,
  } = usePermissions();
  const canManageServer = isSuperAdmin || isEngineer || can("server_manage");
  const canRemoveDevice = storageMode
    ? isSuperAdmin || isEngineer
    : canDeleteDevice;

  const [editingDevice, setEditingDevice] = useState<IDevice | null>(null);
  const [statusDevice, setStatusDevice] = useState<IDevice | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<IDevice | null>(null);
  const [rejectingDevice, setRejectingDevice] = useState<IDevice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const navigatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleToggleActive = async (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    if (!isSuperAdmin) {
      toast.error("Only Super Admins can activate or toggle devices.");
      return;
    }
    try {
      setTogglingId(deviceId);
      const res = await toggleDeviceOnline(deviceId);
      toast.success(
        `Device ${res.newStatus === "Online" ? "set online" : "set to Pending"}`,
      );
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update device",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDevice) return;
    try {
      setIsDeleting(true);
      if (storageMode) {
        await deleteStoredDevice(deletingDevice._id);
      } else {
        await deleteDevice(deletingDevice._id);
      }
      toast.success(`Device #${deletingDevice.sl} deleted successfully`);
      setDeletingDevice(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete device",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveDevice = async (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    try {
      setApprovingId(deviceId);
      await approveDevice(deviceId);
      toast.success("Device approved and set to Online!");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve device",
      );
    } finally {
      setApprovingId(null);
    }
  };

  if (devices.length === 0) {
    return null; // Empty state handled in table view
  }

  return (
    <div className="space-y-3 block lg:hidden">
      {devices.map((device, index) => {
        const Icon = getDeviceIcon(device.deviceType);
        const displaySerial = (page - 1) * limit + index + 1;
        return (
          <div
            key={device._id}
            className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header: SL + Name + Status */}
            {(() => {
              const devTheme = getDeviceTypeTheme(device.deviceType);
              const isOnline = device.status === "Online";
              const isPendingOrMaint =
                device.status === "Pending" || device.status === "Maintenance";

              const dotColor =
                device.status === "Online"
                  ? "bg-emerald-500"
                  : device.status === "Storage"
                    ? "bg-blue-500"
                    : device.status === "Lost"
                      ? "bg-rose-500"
                      : device.status === "Pending" ||
                          device.status === "Maintenance"
                        ? "bg-amber-500"
                        : device.status === "Frozen"
                          ? "bg-slate-400"
                          : "bg-slate-400";

              return (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className={`p-1.5 rounded-lg border shrink-0 ${devTheme.bg} ${devTheme.border} ${devTheme.text}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5"
                        title={`Status: ${device.status}`}
                      >
                        {isOnline && (
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              device.status === "Online"
                                ? "bg-emerald-400"
                                : "bg-blue-400"
                            }`}
                          />
                        )}
                        {isPendingOrMaint && (
                          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full opacity-60 bg-amber-400" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor} ring-2 ring-white dark:ring-slate-900`}
                        />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/devices/${device.deviceType}/${device._id}`}
                        className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 truncate block"
                      >
                        {device.deviceName}
                      </Link>
                      <div className="mt-1 flex min-w-0 flex-col gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {device.deviceType === "access-point" ? (
                          <>
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              {device.server &&
                                typeof device.server === "object" &&
                                (device.server as IDevice).deviceName && (
                                  <span className="truncate">
                                    {(device.server as IDevice).deviceName}
                                  </span>
                                )}
                              {device.apNumber && (
                                <span className="inline-flex items-center rounded-md bg-blue-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {device.apNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-1">
                              {device.uplinkSwitch &&
                                typeof device.uplinkSwitch === "object" && (
                                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                    UpLink: #
                                    {formatDisplaySL(
                                      (device.uplinkSwitch as IDevice).sl,
                                    )}
                                  </span>
                                )}
                              {device.submittedBy?.email &&
                                (admin?.email &&
                                device.submittedBy.email.toLowerCase() ===
                                  admin.email.toLowerCase() ? (
                                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-400">
                                    Added by you
                                  </span>
                                ) : isSuperAdmin || isEngineer ? (
                                  <span
                                    className="text-[10px] text-slate-400"
                                    title={`Added by ${device.submittedBy.email}`}
                                  >
                                    Added by{" "}
                                    {device.submittedBy.name ||
                                      device.submittedBy.email.split("@")[0]}
                                  </span>
                                ) : null)}
                            </div>
                          </>
                        ) : (
                          <div className="flex min-w-0 flex-wrap items-center gap-1">
                            {!currentType && (
                              <span className="capitalize">
                                {device.deviceType}
                              </span>
                            )}
                            {device.deviceType === "switch" &&
                              device.totalPorts !== undefined && (
                                <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-400">
                                  {device.activePortsCount || 0}/
                                  {device.totalPorts} Ports
                                </span>
                              )}
                            {device.deviceType !== "server" &&
                              device.server &&
                              typeof device.server === "object" &&
                              (device.server as IDevice).deviceName && (
                                <span className="truncate">
                                  {(device.server as IDevice).deviceName}
                                </span>
                              )}
                            {["antenna", "access-point", "router"].includes(
                              device.deviceType,
                            ) &&
                              device.uplinkSwitch &&
                              typeof device.uplinkSwitch === "object" && (
                                <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                  UpLink: #
                                  {formatDisplaySL(
                                    (device.uplinkSwitch as IDevice).sl,
                                  )}
                                </span>
                              )}
                            {device.deviceType !== "access-point" &&
                              device.submittedBy?.email &&
                              (admin?.email &&
                              device.submittedBy.email.toLowerCase() ===
                                admin.email.toLowerCase() ? (
                                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-400">
                                  Submitted by you
                                </span>
                              ) : isSuperAdmin || isEngineer ? (
                                <span
                                  className="text-[10px] text-slate-400"
                                  title={`Submitted by ${device.submittedBy.email}`}
                                >
                                  By:{" "}
                                  {device.submittedBy.name ||
                                    device.submittedBy.email.split("@")[0]}
                                </span>
                              ) : null)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        #{displaySerial}
                      </span>
                      {(canEditDevice ||
                        canArchiveDevice ||
                        canApproveDevice) &&
                      (device.deviceType !== "server" || canManageServer) ? (
                        <button
                          type="button"
                          onClick={() => setStatusDevice(device)}
                          className="inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          aria-label={`Update status for ${device.deviceName}`}
                        >
                          <DeviceStatusBadge status={device.status} size="sm" />
                        </button>
                      ) : (
                        <DeviceStatusBadge status={device.status} size="sm" />
                      )}
                      {isSuperAdmin && (
                        <button
                          type="button"
                          disabled={togglingId === device._id}
                          onClick={(e) => handleToggleActive(e, device._id)}
                          aria-label={
                            device.status === "Online"
                              ? "Set device to Pending"
                              : "Set device Online"
                          }
                          className={`relative inline-flex h-8 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                            togglingId === device._id
                              ? "opacity-50 cursor-wait"
                              : ""
                          }`}
                          title={
                            device.status === "Online"
                              ? "Super Admin: Click to set to Pending"
                              : "Super Admin: Click to set Online"
                          }
                        >
                          <span
                            className={`pointer-events-none relative inline-flex h-4 w-7 rounded-full transition-colors ${
                              device.status === "Online"
                                ? "bg-emerald-500"
                                : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                device.status === "Online"
                                  ? "translate-x-3"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {device.macAddress && (
              <div className="mt-2 flex min-w-0 items-center gap-2 border-t border-slate-100 pt-2 text-xs dark:border-slate-800/60">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  MAC
                </span>
                <div className="flex min-w-0 items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-800/50">
                  <span className="truncate font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {device.macAddress}
                  </span>
                  <CopyButton text={device.macAddress} label="MAC" />
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2 dark:border-slate-800/60">
              {device.onlineLink ? (
                <a
                  href={
                    device.onlineLink.startsWith("http")
                      ? device.onlineLink
                      : `http://${device.onlineLink}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Portal
                </a>
              ) : (
                <span />
              )}

              <div className="flex flex-wrap items-center justify-end gap-0.5">
                {/* Quick Approve/Reject for Pending Devices */}
                {device.status === "Pending" &&
                  canApprovePendingDevice &&
                  (device.deviceType !== "server" || canManageServer) && (
                    <>
                      <button
                        type="button"
                        disabled={approvingId === device._id}
                        onClick={(e) => handleApproveDevice(e, device._id)}
                        className="flex min-h-10 items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                        title="Approve Device"
                      >
                        {approvingId === device._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingDevice(device)}
                        className="flex min-h-10 items-center gap-1 rounded-lg border border-rose-700 bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800"
                        title="Reject Device"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                {/* Preserve registration rejection details for Frozen devices */}
                {device.status === "Frozen" &&
                  (device.rejectionReason || device.rejectedBy?.reason) && (
                    <span
                      className="flex items-center gap-1 text-xs text-rose-500 p-2"
                      title={`Frozen after rejection: ${device.rejectionReason || device.rejectedBy?.reason}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">
                        {device.rejectionReason || device.rejectedBy?.reason}
                      </span>
                    </span>
                  )}
                <Link
                  href={`/devices/${device.deviceType}/${device._id}`}
                  className="flex min-h-10 items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 px-3 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40"
                >
                  <Eye className="w-4 h-4" /> Details
                </Link>
                {(canEditDevice ||
                  (device.status === "Frozen" &&
                    Boolean(device.rejectedBy?.reason || device.rejectionReason) &&
                    admin?.role === "editor" &&
                    (device.deviceType !== "server" || canManageServer))) && (
                  <button
                    type="button"
                    onClick={() => setEditingDevice(device)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    title={
                      device.status === "Frozen" &&
                      Boolean(device.rejectedBy?.reason || device.rejectionReason)
                        ? "Update & Resubmit"
                        : "Edit Device"
                    }
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canRemoveDevice && (
                  <button
                    type="button"
                    onClick={() => setDeletingDevice(device)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

      <RejectDeviceDialog
        device={rejectingDevice}
        open={Boolean(rejectingDevice)}
        onOpenChange={(open) => !open && setRejectingDevice(null)}
        onSuccess={() => {
          setRejectingDevice(null);
          router.refresh();
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deletingDevice)}
        onOpenChange={(open) => !open && setDeletingDevice(null)}
        title={`Delete Device #${deletingDevice?.sl}?`}
        description={`Are you sure you want to delete ${deletingDevice?.deviceName}${storageMode ? " from Storage" : ""}?`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
