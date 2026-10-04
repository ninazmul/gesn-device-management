"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  RotateCcw,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  checkDeviceByMac,
  returnDeviceToStorage,
} from "@/lib/actions/device.actions";
import { DeviceStatusBadge } from "./DeviceStatusBadge";
import type { IDevice } from "@/types";
import {
  getStorageDeviceCategoryName,
  STORAGE_DEVICE_CATEGORIES,
} from "@/lib/constants";

interface ReturnToStorageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMac?: string;
  onSuccess?: () => void;
}

export function ReturnToStorageDialog({
  open,
  onOpenChange,
  initialMac = "",
  onSuccess,
}: ReturnToStorageDialogProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(initialMac);
  const [deviceCategory, setDeviceCategory] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundDevice, setFoundDevice] = useState<IDevice | null>(null);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!open) return;
    setIdentifier(initialMac);
    setDeviceCategory("");
    setFoundDevice(null);
    setSearchError("");
  }, [open, initialMac]);

  const handleLookup = async () => {
    const query = identifier.trim();
    if (!query) {
      toast.error("Please enter a MAC address");
      return;
    }
    if (!deviceCategory) {
      toast.error("Please select a Device Category");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setFoundDevice(null);

    try {
      const res = await checkDeviceByMac(query);
      if (res.found && res.device) {
        setFoundDevice(res.device);
      } else {
        setSearchError(res.message || "Device not found in system.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to lookup device";
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!foundDevice) return;

    if (foundDevice.status === "Storage") {
      toast.error("This device is already in Storage.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await returnDeviceToStorage({
        macAddress: identifier,
        deviceCategory,
      });
      if (res.success) {
        toast.success(res.message || "Device returned to storage!");
        onOpenChange(false);
        setIdentifier("");
        setFoundDevice(null);
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to return device to storage";
      setSearchError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIdentifier("");
    setDeviceCategory("");
    setFoundDevice(null);
    setSearchError("");
  };

  const categoryMismatch =
    foundDevice &&
    deviceCategory &&
    foundDevice.deviceType !== deviceCategory
      ? `Device category mismatch. This MAC belongs to ${getStorageDeviceCategoryName(foundDevice.deviceType)}, not ${getStorageDeviceCategoryName(deviceCategory)}.`
      : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleReset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0066ff] border border-blue-200 dark:border-blue-800/60">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Return to Storage
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Return a device to Storage using its MAC address and category.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Lookup input */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            MAC Address <span className="text-rose-500">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setSearchError("");
                  setFoundDevice(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                className="pl-9 font-mono text-xs sm:text-sm uppercase rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="storage-return-category"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Device Category <span className="text-rose-500">*</span>
          </Label>
          <select
            id="storage-return-category"
            required
            value={deviceCategory}
            onChange={(e) => {
              setDeviceCategory(e.target.value);
              setSearchError("");
            }}
            disabled={isSearching || isSubmitting}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] disabled:opacity-60"
          >
            <option value="" disabled>
              Select Device Category
            </option>
            {STORAGE_DEVICE_CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          onClick={handleLookup}
          disabled={isSearching || !identifier.trim() || !deviceCategory}
          className="w-full bg-[#0066ff] hover:bg-[#0055e0] text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Lookup"
          )}
        </Button>

        {/* Error message */}
        {searchError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Found Device Preview */}
        {foundDevice && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  {getStorageDeviceCategoryName(foundDevice.deviceType)} • #{foundDevice.sl}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {foundDevice.deviceName || foundDevice.deviceType}
                </h4>
              </div>
              <DeviceStatusBadge status={foundDevice.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
              <div>
                <span className="block text-slate-400 text-[10px]">MAC Address:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {foundDevice.macAddress || "—"}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">IP Address:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {foundDevice.ipAddress || "—"}
                </span>
              </div>
              {foundDevice.customerName && (
                <div className="col-span-2">
                  <span className="block text-slate-400 text-[10px]">Customer:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {foundDevice.customerName} {foundDevice.apNumber ? `(AP: ${foundDevice.apNumber})` : ""}
                  </span>
                </div>
              )}
            </div>

            {categoryMismatch ? (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{categoryMismatch}</span>
              </div>
            ) : foundDevice.status === "Storage" ? (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>This device is already in Storage.</span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleConfirmReturn}
                disabled={isSubmitting || !deviceCategory}
                className="w-full bg-[#0066ff] hover:bg-[#0055e0] text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Returning to Storage...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Return to Storage</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
