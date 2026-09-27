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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle, Loader2 } from "lucide-react";
import { rejectDevice } from "@/lib/actions/device.actions";
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

  if (!device) return null;

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please enter a reason for rejecting this device.");
      return;
    }

    try {
      setIsSubmitting(true);
      await rejectDevice(device._id, reason.trim());
      toast.success(`Device #${formatDisplaySL(device.sl)} has been rejected.`);
      setReason("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject device");
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
            Specify why <span className="font-semibold text-slate-700 dark:text-slate-300">{device.deviceName}</span> is being rejected. This will be recorded in the audit trail.
          </p>
        </DialogHeader>

        <form onSubmit={handleReject} className="space-y-3.5 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Rejection Reason <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              placeholder="e.g. Invalid MAC address, duplicate entry, incorrect server assignment, or missing customer details..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs resize-none"
              autoFocus
            />
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
              disabled={isSubmitting || !reason.trim()}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Rejecting...
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
