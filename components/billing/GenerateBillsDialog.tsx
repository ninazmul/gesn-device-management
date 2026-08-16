"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Receipt, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { generateMonthlyBills } from "@/lib/actions/billing.actions";

interface GenerateBillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GenerateBillsDialog({
  open,
  onOpenChange,
  onSuccess,
}: GenerateBillsDialogProps) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month) return;

    try {
      setGenerating(true);
      const res = await generateMonthlyBills(month);

      if (res.created > 0) {
        toast.success(
          `Generated ${res.created} new monthly bill(s) for ${res.month}! (${res.skipped} skipped/already generated)`
        );
      } else {
        toast(
          `No new bills needed for ${res.month}. All active customers already have generated invoices.`,
          { icon: "ℹ️" }
        );
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate monthly bills"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
              <Receipt className="w-5 h-5" />
            </span>
            Generate Monthly Bills
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Batch create monthly subscription invoices for all active customer accounts.
          </p>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Billing Month <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
              required
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/40 space-y-2 text-xs text-sky-900 dark:text-sky-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Smart Duplicate Prevention</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              Existing bills for the specified month are automatically skipped. Customers must have status <strong>Active</strong> and a monthly bill amount greater than zero.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generating || !month}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md shadow-sky-600/10"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
                </>
              ) : (
                "Generate Invoices"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
