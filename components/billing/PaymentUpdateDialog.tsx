"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "react-hot-toast";
import { updatePayment } from "@/lib/actions/billing.actions";
import { formatDate } from "@/lib/utils";
import type { IBilling } from "@/types";

interface PaymentUpdateDialogProps {
  billing: IBilling | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentUpdateDialog({
  billing,
  open,
  onOpenChange,
  onSuccess,
}: PaymentUpdateDialogProps) {
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (billing) {
      setPaidAmount(String(billing.paidAmount || ""));
      setPaymentDate(
        billing.paymentDate
          ? new Date(billing.paymentDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setPaymentReference(billing.paymentReference || "");
      setPaymentNote(billing.paymentNote || "");
    }
  }, [billing, open]);

  if (!billing) return null;

  const currentPaid = parseFloat(paidAmount) || 0;
  const computedDue = Math.max(0, billing.billingAmount - currentPaid);
  const isFullPayment = currentPaid >= billing.billingAmount;

  const handleMarkFullPayment = () => {
    setPaidAmount(String(billing.billingAmount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(currentPaid) || currentPaid < 0) {
      toast.error("Please enter a valid paid amount");
      return;
    }

    if (currentPaid > billing.billingAmount) {
      toast.error(
        `Paid amount (৳${currentPaid.toLocaleString()}) cannot exceed billing total (৳${billing.billingAmount.toLocaleString()})`
      );
      return;
    }

    try {
      setSubmitting(true);
      await updatePayment(billing._id, {
        paidAmount: currentPaid,
        paymentDate: new Date(paymentDate),
        paymentReference: paymentReference.trim(),
        paymentNote: paymentNote.trim(),
      });

      toast.success(`Payment updated for ${billing.billingId}`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Receipt className="w-5 h-5" />
            </span>
            Update Payment ({billing.billingId})
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customer: <span className="font-bold text-slate-800 dark:text-slate-200">{billing.customer?.name || "Client"}</span> • Month: {billing.billingMonth}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Bill Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Total Bill</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                ৳{billing.billingAmount?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Calculated Due</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                ৳{computedDue.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Due Date</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(billing.dueDate)}
              </span>
            </div>
          </div>

          {/* Paid Amount Input + Quick Full Payment Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Paid Amount (৳) <span className="text-rose-500">*</span>
              </Label>
              {!isFullPayment && (
                <button
                  type="button"
                  onClick={handleMarkFullPayment}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Pay Full (৳{billing.billingAmount.toLocaleString()})
                </button>
              )}
            </div>
            <Input
              type="number"
              min="0"
              max={billing.billingAmount}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0"
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-semibold"
              autoFocus
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payment Received Date
            </Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
            />
          </div>

          {/* Transaction / Reference ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payment Reference (bKash / Bank / TrxID)
            </Label>
            <Input
              placeholder="e.g. TRX-9823471 or Check #441"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-mono"
            />
          </div>

          {/* Payment Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Internal Notes
            </Label>
            <Textarea
              placeholder="Additional payment details..."
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              rows={2}
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md shadow-sky-600/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                </>
              ) : (
                "Save Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
