"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Eye,
  Pencil,
  Plus,
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

interface DeviceTableProps {
  devices: IDevice[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  currentType?: string;
  typeName?: string;
}

export function DeviceTable({
  devices,
  total,
  page,
  totalPages,
  limit,
  currentType,
  typeName = "Device",
}: DeviceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canWrite } = usePermissions();
  const canWriteDevices = canWrite("devices");

  // Modals state
  const [editingDevice, setEditingDevice] = useState<IDevice | null>(null);
  const [statusDevice, setStatusDevice] = useState<IDevice | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<IDevice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  SL
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[200px]">
                  Device / Model
                </TableHead>
                {!currentType && (
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Type
                  </TableHead>
                )}
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  IP Address
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  MAC Address
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                  Link
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-24">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={currentType ? 7 : 8}
                    className="py-16 text-center text-slate-400"
                  >
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Network className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                        No {typeName.toLowerCase()}s found
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {searchParams.toString()
                          ? "No devices match your active search filters. Try clearing some criteria."
                          : `Get started by registering your first ${typeName.toLowerCase()} into the system.`}
                      </p>
                      {!searchParams.toString() && (
                        <Button
                          onClick={() => setIsCreateOpen(true)}
                          className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs mt-2"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Add {typeName}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => {
                  const Icon = getDeviceIcon(device.deviceType);
                  return (
                    <TableRow
                      key={device._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                    >
                      {/* SL Number */}
                      <TableCell className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        <Link
                          href={`/devices/${device.deviceType}/${device._id}`}
                          className="hover:underline"
                        >
                          #{device.sl}
                        </Link>
                      </TableCell>

                      {/* Device Name & Brand */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/devices/${device.deviceType}/${device._id}`}
                              className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors block truncate"
                            >
                              {device.deviceName}
                            </Link>
                            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400 font-medium">
                              <span>
                                {device.brand} • {device.model}
                              </span>
                              {device.deviceType === "switch" && device.totalPorts !== undefined && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold text-[10px]">
                                  {device.activePortsCount || 0}/{device.totalPorts} Ports
                                </span>
                              )}
                              {["antenna", "access-point", "router"].includes(device.deviceType) && device.uplinkSwitch && typeof device.uplinkSwitch === "object" && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium text-[10px]">
                                  UpLink: #{(device.uplinkSwitch as IDevice).sl}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Device Type (if all view) */}
                      {!currentType && (
                        <TableCell>
                          <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {device.deviceType}
                          </span>
                        </TableCell>
                      )}

                      {/* IP Address */}
                      <TableCell className="whitespace-nowrap">
                        {device.ipAddress ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                            <span>{device.ipAddress}</span>
                            <CopyButton text={device.ipAddress} label="IP Address" />
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* MAC Address */}
                      <TableCell className="whitespace-nowrap">
                        {device.macAddress ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                            <span>{device.macAddress}</span>
                            <CopyButton text={device.macAddress} label="MAC Address" />
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Online Link */}
                      <TableCell className="text-center whitespace-nowrap">
                        {device.onlineLink ? (
                          <a
                            href={
                              device.onlineLink.startsWith("http")
                                ? device.onlineLink
                                : `http://${device.onlineLink}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                            title={device.onlineLink}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="whitespace-nowrap">
                        {canWriteDevices ? (
                          <button
                            type="button"
                            onClick={() => setStatusDevice(device)}
                            className="cursor-pointer hover:opacity-85 transition-opacity"
                            title="Click to update status"
                          >
                            <DeviceStatusBadge status={device.status} />
                          </button>
                        ) : (
                          <DeviceStatusBadge status={device.status} />
                        )}
                      </TableCell>

                      {/* Row Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/devices/${device.deviceType}/${device._id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {canWriteDevices && (
                            <button
                              type="button"
                              onClick={() => setEditingDevice(device)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                              title="Edit Device"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canWriteDevices && (
                            <button
                              type="button"
                              onClick={() => setDeletingDevice(device)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete Device"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Math.min((page - 1) * limit + 1, total)}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {total.toLocaleString()}
              </span>{" "}
              records
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePage(page - 1)}
                disabled={page <= 1}
                className="h-8 rounded-lg border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>

              <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePage(page + 1)}
                disabled={page >= totalPages}
                className="h-8 rounded-lg border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status Update Dialog */}
      <DeviceStatusDialog
        device={statusDevice}
        open={Boolean(statusDevice)}
        onOpenChange={(open) => !open && setStatusDevice(null)}
        onSuccess={() => router.refresh()}
      />

      {/* Edit Form Dialog */}
      <DeviceFormDialog
        open={Boolean(editingDevice)}
        onOpenChange={(open) => !open && setEditingDevice(null)}
        deviceToEdit={editingDevice}
        onSuccess={() => {
          setEditingDevice(null);
          router.refresh();
        }}
      />

      {/* Create Dialog (from empty state) */}
      <DeviceFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultDeviceType={currentType || "antenna"}
        onSuccess={() => {
          setIsCreateOpen(false);
          router.refresh();
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={Boolean(deletingDevice)}
        onOpenChange={(open) => !open && setDeletingDevice(null)}
        title={`Delete Device #${deletingDevice?.sl}?`}
        description={`Are you sure you want to delete ${deletingDevice?.deviceName} (${deletingDevice?.brand})? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
}
