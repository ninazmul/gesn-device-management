"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
} from "lucide-react";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { deleteCustomer } from "@/lib/actions/customer.actions";
import { toast } from "react-hot-toast";
import type { ICustomer } from "@/types";

interface CustomerMobileCardsProps {
  customers: ICustomer[];
  total: number;
  page: number;
  totalPages: number;
}

export function CustomerMobileCards({
  customers,
  total,
  page,
  totalPages,
}: CustomerMobileCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<ICustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;
    try {
      setIsDeleting(true);
      await deleteCustomer(deletingCustomer._id);
      toast.success(`Customer ${deletingCustomer.customerId} deleted`);
      setDeletingCustomer(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  if (customers.length === 0) return null;

  return (
    <div className="space-y-3 block lg:hidden">
      {customers.map((cust) => (
        <div
          key={cust._id}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/customers/${cust._id}`}
                className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 truncate block"
              >
                {cust.name}
              </Link>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                  {cust.customerId}
                </span>
                {cust.contactPerson && (
                  <>
                    <span>•</span>
                    <span className="truncate">{cust.contactPerson}</span>
                  </>
                )}
              </div>
            </div>

            <CustomerStatusBadge status={cust.status} size="sm" />
          </div>

          {/* Details Pill Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-400 block text-[11px]">Monthly Subscription</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                ৳{cust.monthlyBill?.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-400 block text-[11px]">Billing Day</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                Day {cust.billingDay} of month
              </span>
            </div>
          </div>

          {/* Contact Details */}
          {(cust.phone || cust.email) && (
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
              {cust.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{cust.phone}</span>
                </div>
              )}
              {cust.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{cust.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <Link
              href={`/customers/${cust._id}`}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1"
            >
              <Eye className="w-4 h-4" /> Profile & History
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingCustomer(cust)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingCustomer(cust)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

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

      {/* Edit Form Dialog */}
      <CustomerFormDialog
        open={Boolean(editingCustomer)}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customerToEdit={editingCustomer}
        onSuccess={() => {
          setEditingCustomer(null);
          router.refresh();
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={Boolean(deletingCustomer)}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        title={`Delete Customer ${deletingCustomer?.customerId}?`}
        description={`Are you sure you want to delete ${deletingCustomer?.name}?`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
