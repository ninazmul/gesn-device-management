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
  DollarSign,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { BillingStatusBadge } from "./BillingStatusBadge";
import { PaymentUpdateDialog } from "./PaymentUpdateDialog";
import { GenerateBillsDialog } from "./GenerateBillsDialog";
import { formatDate } from "@/lib/utils";
import type { IBilling } from "@/types";

interface BillingTableProps {
  billings: IBilling[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export function BillingTable({
  billings,
  total,
  page,
  totalPages,
  limit,
}: BillingTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [paymentBilling, setPaymentBilling] = useState<IBilling | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const navigatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Billing ID
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[200px]">
                  Customer Name
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Billing Month
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                  Bill Amount
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                  Paid
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                  Due
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Due Date
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-28">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {billings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-16 text-center text-slate-400"
                  >
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                        No billing records found
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {searchParams.toString()
                          ? "No billing records match your selected month or search filters."
                          : "Generate monthly bills for your active client accounts."}
                      </p>
                      {!searchParams.toString() && (
                        <Button
                          onClick={() => setGenerateOpen(true)}
                          className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs mt-2"
                        >
                          <Sparkles className="w-4 h-4 mr-1.5" /> Generate Monthly Bills
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                billings.map((bill) => (
                  <TableRow
                    key={bill._id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                  >
                    {/* Billing ID */}
                    <TableCell className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      {bill.billingId}
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      {bill.customer ? (
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${bill.customer._id}`}
                            className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors block truncate"
                          >
                            {bill.customer.name}
                          </Link>
                          <span className="font-mono text-xs text-slate-400">
                            {bill.customer.customerId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Unknown Client</span>
                      )}
                    </TableCell>

                    {/* Billing Month */}
                    <TableCell className="whitespace-nowrap font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {bill.billingMonth}
                    </TableCell>

                    {/* Bill Amount */}
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        ৳{bill.billingAmount?.toLocaleString() || 0}
                      </span>
                    </TableCell>

                    {/* Paid Amount */}
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        ৳{bill.paidAmount?.toLocaleString() || 0}
                      </span>
                    </TableCell>

                    {/* Due Amount */}
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                        ৳{bill.dueAmount?.toLocaleString() || 0}
                      </span>
                    </TableCell>

                    {/* Due Date */}
                    <TableCell className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(bill.dueDate)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="whitespace-nowrap">
                      <BillingStatusBadge status={bill.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentBilling(bill)}
                        className="rounded-xl h-8 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Update Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
              invoices
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

      {/* Payment Update Dialog */}
      <PaymentUpdateDialog
        billing={paymentBilling}
        open={Boolean(paymentBilling)}
        onOpenChange={(open) => !open && setPaymentBilling(null)}
        onSuccess={() => router.refresh()}
      />

      {/* Generate Bills Dialog */}
      <GenerateBillsDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
