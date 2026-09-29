"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Receipt,
  Sparkles,
  FileSpreadsheet,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GenerateBillsDialog } from "@/components/billing/GenerateBillsDialog";
import { CollectBillDialog } from "@/components/billing/CollectBillDialog";
import { usePermissions } from "@/components/providers/PermissionContext";
import { getAllBillingsForExport } from "@/lib/actions/billing.actions";
import { exportToExcel } from "@/lib/excel";
import { toast } from "react-hot-toast";

const BILLING_EXPORT_HEADERS = [
  "Billing ID",
  "Customer ID",
  "Customer Name",
  "Customer Phone",
  "Billing Month",
  "Billing Amount (SAR)",
  "Paid Amount (SAR)",
  "Due Amount (SAR)",
  "Due Date",
  "Status",
  "Payment Method",
  "Payment Date",
  "Collected By",
  "Payment Ref",
];

interface BillingHeaderProps {
  total: number;
}

export function BillingHeader({ total }: BillingHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { canWrite } = usePermissions();
  const canWriteBilling = canWrite("billing");

  const currentMonth = searchParams.get("billingMonth") || undefined;
  const currentStatus = searchParams.get("status") || undefined;

  const handleExport = async (allMonths = false) => {
    try {
      setIsExporting(true);
      const billings = await getAllBillingsForExport({
        billingMonth: allMonths ? undefined : currentMonth,
        status: currentStatus,
      });

      if (billings.length === 0) {
        toast.error("No billing records available to export.");
        return;
      }

      const rows = billings.map((b) => ({
        "Billing ID": b.billingId,
        "Customer ID": b.customer ? b.customer.customerId : "",
        "Customer Name": b.customer ? b.customer.name : "Unknown",
        "Customer Phone": b.customer ? b.customer.phone || "" : "",
        "Billing Month": b.billingMonth,
        "Billing Amount (SAR)": b.billingAmount || 0,
        "Paid Amount (SAR)": b.paidAmount || 0,
        "Due Amount (SAR)": b.dueAmount || 0,
        "Due Date": b.dueDate ? new Date(b.dueDate).toLocaleDateString("en-GB") : "",
        "Status": b.status,
        "Payment Method": b.paymentMethod || "Cash",
        "Payment Date": b.paymentDate ? new Date(b.paymentDate).toLocaleDateString("en-GB") : "",
        "Collected By": b.collectedBy?.name || b.collectedBy?.email || "",
        "Payment Ref": b.paymentReference || "",
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = allMonths
        ? `all-billing-invoices-${dateStr}.xlsx`
        : `billing-${currentMonth || "current"}-${dateStr}.xlsx`;

      await exportToExcel(
        rows,
        BILLING_EXPORT_HEADERS,
        "Invoices",
        filename
      );
      toast.success(`Exported ${billings.length} billing records!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export billings");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Monthly Billing
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                SAR
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage subscriber invoices and audit-tracked payment collections:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {total.toLocaleString()}
              </span>{" "}
              records
            </p>
          </div>
        </div>

        {/* Polished Actions Dropdown Menu & Quick Collect Button */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {canWriteBilling && (
            <Button
              onClick={() => setIsCollectOpen(true)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/10 gap-1.5 h-10 px-4"
            >
              <Receipt className="w-4 h-4" />
              <span>Collect Bill</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 dark:border-slate-800 font-semibold text-xs gap-1.5 h-10 px-4"
              >
                <span>Billing Actions</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {canWriteBilling && (
                <>
                  <DropdownMenuLabel>Billing Operations</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setIsGenerateOpen(true)}>
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Generate Monthly Bills</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCollectOpen(true)}>
                    <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Collect Payment</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuLabel>Excel Reports (SAR)</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport(false)} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Export Filtered Invoices</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(true)} disabled={isExporting}>
                <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Export All Billing History</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Generate Bills Dialog */}
      <GenerateBillsDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Collect Bill Dialog */}
      <CollectBillDialog
        open={isCollectOpen}
        onOpenChange={setIsCollectOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
