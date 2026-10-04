"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XCircle, Loader2 } from "lucide-react";
import { rejectDevice } from "@/lib/actions/device.actions";
import { DEVICE_REJECTION_REASONS } from "@/lib/constants";
import { formatDisplaySL } from "@/lib/utils";
import { toast } from "react-hot-toast";
import type { IDevice } from "@/types";

interface RejectDeviceDialogProps {
  device: IDevice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RejectDeviceDialog({
  device,
  open,
  onOpenChange,
  onSuccess,
}: RejectDeviceDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setReason("");
  }, [open, device?._id]);

  if (!device) return null;

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!DEVICE_REJECTION_REASONS.some((option) => option === reason)) {
      toast.error("Please select a rejection reason.");
      return;
    }

    try {
      setIsSubmitting(true);
      await rejectDevice(device._id, reason.trim());
      toast.success(
        `Device #${formatDisplaySL(device.sl)} was rejected and set to Frozen.`,
      );
      setReason("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject device",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Reject Device #{formatDisplaySL(device.sl)}
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a rejection reason for{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {device.deviceName}
            </span>
            .
          </p>
        </DialogHeader>

        <form onSubmit={handleReject} className="space-y-3.5 pt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="rejection-reason"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Rejection Reason <span className="text-rose-500">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger
                id="rejection-reason"
                className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                autoFocus
              >
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                {DEVICE_REJECTION_REASONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{" "}
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
