"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BillingStatusBadge } from "./BillingStatusBadge";
import { CollectBillDialog } from "./CollectBillDialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CUSTOMER_SERVICE_TYPE_CONFIG } from "@/lib/constants";
import type { IBilling } from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";

interface BillingMobileCardsProps {
  billings: IBilling[];
  total: number;
  page: number;
  totalPages: number;
}

export function BillingMobileCards({
  billings,
  total,
  page,
  totalPages,
}: BillingMobileCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canWrite } = usePermissions();
  const canWriteBilling = canWrite("billing");

  const [paymentBilling, setPaymentBilling] = useState<IBilling | null>(null);

  const navigatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (billings.length === 0) return null;

  return (
    <div className="space-y-3 block lg:hidden">
      {billings.map((bill) => {
        const cust = bill.customer;
        const custServiceType = cust?.serviceType;
        const serviceConfig = custServiceType
          ? CUSTOMER_SERVICE_TYPE_CONFIG[custServiceType]
          : null;

        return (
          <div
            key={bill._id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
          >
            {/* Header: Customer + Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {bill.customer ? (
                    <Link
                      href={`/customers/${bill.customer._id}`}
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 truncate block"
                    >
                      {bill.customer.name}
                    </Link>
                  ) : (
                    <span className="font-bold text-sm text-slate-400">Unknown Client</span>
                  )}
                  {serviceConfig && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${serviceConfig.bg} ${serviceConfig.darkBg}`}
                    >
                      {custServiceType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                  <span>{bill.billingId}</span>
                  <span>•</span>
                  <span>{bill.billingMonth}</span>
                </div>
              </div>

              <BillingStatusBadge status={bill.status} size="sm" />
            </div>

            {/* Amount Breakdown Grid (SAR) */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[11px]">Billed</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {formatCurrency(bill.billingAmount)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[11px]">Paid</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {formatCurrency(bill.paidAmount)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[11px]">Due</span>
                <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-xs">
                  {formatCurrency(bill.dueAmount)}
                </span>
              </div>
            </div>

            {/* Due date + Action */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-xs text-slate-400">
                Due: <strong className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(bill.dueDate)}</strong>
              </span>

              {canWriteBilling ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentBilling(bill)}
                  className="rounded-xl h-8 text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                >
                  <Receipt className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Collect Bill
                </Button>
              ) : (
                <span className="text-xs text-slate-400 italic">View only</span>
              )}
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

      {/* Collect Bill Dialog */}
      <CollectBillDialog
        open={Boolean(paymentBilling)}
        onOpenChange={(open) => !open && setPaymentBilling(null)}
        initialCustomer={paymentBilling?.customer || null}
        initialBilling={paymentBilling}
        onSuccess={() => {
          setPaymentBilling(null);
          router.refresh();
        }}
      />
    </div>
  );
}
