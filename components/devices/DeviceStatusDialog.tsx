"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DEVICE_STATUSES, STATUS_CONFIG } from "@/lib/constants";
import { updateDeviceStatus } from "@/lib/actions/device.actions";
import { formatDisplaySL } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { usePermissions } from "@/components/providers/PermissionContext";
import { Loader2, Lock } from "lucide-react";
import type { DeviceStatus, IDevice } from "@/types";

interface DeviceStatusDialogProps {
  device: IDevice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeviceStatusDialog({
  device,
  open,
  onOpenChange,
  onSuccess,
}: DeviceStatusDialogProps) {
  const { isSuperAdmin } = usePermissions();
  const [selectedStatus, setSelectedStatus] = useState<DeviceStatus>(
    (device?.status as DeviceStatus) || "Pending"
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sync selected status when device changes
  if (device && selectedStatus !== device.status && !isLoading) {
    setSelectedStatus(device.status);
  }

  const handleUpdate = async () => {
    if (!device) return;
    try {
      setIsLoading(true);
      await updateDeviceStatus(device._id, selectedStatus);
      toast.success(`Updated status for #${formatDisplaySL(device.sl)} to ${selectedStatus}`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Update Device Status
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set operational state for <span className="font-semibold text-slate-800 dark:text-slate-200">#{formatDisplaySL(device.sl)} — {device.deviceName}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2.5 py-4">
          {DEVICE_STATUSES.map((status) => {
            const isSelected = selectedStatus === status;
            const config = STATUS_CONFIG[status];
            const isRestricted = status === "Active" && !isSuperAdmin;

            return (
              <button
                key={status}
                type="button"
                disabled={isRestricted}
                onClick={() => !isRestricted && setSelectedStatus(status)}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all ${
                  isRestricted
                    ? "opacity-45 bg-slate-50 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 cursor-not-allowed text-slate-400"
                    : isSelected
                    ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 ring-2 ring-sky-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.dot}`} />
                  <span className="truncate">{status}</span>
                </div>
                {isRestricted && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0 ml-1">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl border-slate-200 dark:border-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={isLoading || selectedStatus === device.status}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
