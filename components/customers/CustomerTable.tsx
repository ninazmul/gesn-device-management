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
  Eye,
  Pencil,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { deleteCustomer } from "@/lib/actions/customer.actions";
import { toast } from "react-hot-toast";
import type { ICustomer } from "@/types";

interface CustomerTableProps {
  customers: ICustomer[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export function CustomerTable({
  customers,
  total,
  page,
  totalPages,
  limit,
}: CustomerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<ICustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
      toast.success(`Customer ${deletingCustomer.customerId} removed`);
      setDeletingCustomer(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Customer ID
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[200px]">
                  Customer / Company
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contact
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                  Monthly Bill
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                  Billing Day
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-24">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-16 text-center text-slate-400"
                  >
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                        No customers found
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {searchParams.toString()
                          ? "No client accounts match your current filters."
                          : "Start managing subscriber accounts and monthly subscriptions."}
                      </p>
                      {!searchParams.toString() && (
                        <Button
                          onClick={() => setIsCreateOpen(true)}
                          className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs mt-2"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Add Customer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((cust) => (
                  <TableRow
                    key={cust._id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                  >
                    {/* Customer ID */}
                    <TableCell className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      <Link href={`/customers/${cust._id}`} className="hover:underline">
                        {cust.customerId}
                      </Link>
                    </TableCell>

                    {/* Name & Contact Person */}
                    <TableCell>
                      <div className="min-w-0">
                        <Link
                          href={`/customers/${cust._id}`}
                          className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors block truncate"
                        >
                          {cust.name}
                        </Link>
                        {cust.contactPerson && (
                          <span className="text-xs text-slate-400 font-medium">
                            {cust.contactPerson}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Contact Info (Phone / Email) */}
                    <TableCell className="whitespace-nowrap">
                      <div className="space-y-0.5 text-xs">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {cust.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Monthly Bill */}
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        ৳{cust.monthlyBill?.toLocaleString() || 0}
                      </span>
                    </TableCell>

                    {/* Billing Day */}
                    <TableCell className="text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Day {cust.billingDay}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="whitespace-nowrap">
                      <CustomerStatusBadge status={cust.status} />
                    </TableCell>

                    {/* Row Actions */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/customers/${cust._id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingCustomer(cust)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                          title="Edit Customer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCustomer(cust)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
              customers
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

      {/* Edit Customer Dialog */}
      <CustomerFormDialog
        open={Boolean(editingCustomer)}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customerToEdit={editingCustomer}
        onSuccess={() => {
          setEditingCustomer(null);
          router.refresh();
        }}
      />

      {/* Create Dialog (from empty state) */}
      <CustomerFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          router.refresh();
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={Boolean(deletingCustomer)}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        title={`Delete Customer ${deletingCustomer?.customerId}?`}
        description={`Are you sure you want to delete ${deletingCustomer?.name}? If they have historical bills, consider setting status to Inactive instead.`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
}
