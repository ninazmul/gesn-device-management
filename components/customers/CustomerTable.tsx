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
  Receipt,
  Server,
  MapPin,
} from "lucide-react";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CollectBillDialog } from "@/components/billing/CollectBillDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { deleteCustomer } from "@/lib/actions/customer.actions";
import { toast } from "react-hot-toast";
import type { ICustomer } from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";
import { formatCurrency } from "@/lib/utils";
import { CUSTOMER_SERVICE_TYPE_CONFIG } from "@/lib/constants";

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
  const { canWrite, canRead } = usePermissions();
  const canWriteCustomers = canWrite("customers");
  const canReadBilling = canRead("billing");

  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(
    null,
  );
  const [deletingCustomer, setDeletingCustomer] = useState<ICustomer | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Collect bill dialog state
  const [collectOpen, setCollectOpen] = useState(false);
  const [customerToCollect, setCustomerToCollect] = useState<ICustomer | null>(
    null,
  );

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
      toast.error(
        err instanceof Error ? err.message : "Failed to delete customer",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCollect = (cust: ICustomer) => {
    setCustomerToCollect(cust);
    setCollectOpen(true);
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
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[180px]">
                  Customer / Business
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Service & Server
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contact
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                  Monthly Bill
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                  Bill Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Account Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-28">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
                      {!searchParams.toString() && canWriteCustomers && (
                        <Button
                          onClick={() => setIsCreateOpen(true)}
                          className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs mt-2"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Add Customer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((cust) => {
                  const serviceType = cust.serviceType || "Service C";
                  const serviceConfig = CUSTOMER_SERVICE_TYPE_CONFIG[
                    serviceType
                  ] || {
                    label: serviceType,
                    bg: "bg-slate-100 text-slate-700 border-slate-200",
                    darkBg: "dark:bg-slate-800",
                  };

                  const serverObj =
                    cust.server && typeof cust.server === "object"
                      ? cust.server
                      : null;

                  const currentBill = cust.currentBill;

                  return (
                    <TableRow
                      key={cust._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                    >
                      {/* Customer ID */}
                      <TableCell className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        <Link
                          href={`/customers/${cust._id}`}
                          className="hover:underline"
                        >
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
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            {cust.contactPerson && (
                              <span className="font-medium text-slate-500 dark:text-slate-400 truncate">
                                {cust.contactPerson}
                              </span>
                            )}
                            {cust.gpsLink && (
                              <a
                                href={
                                  cust.gpsLink.startsWith("http")
                                    ? cust.gpsLink
                                    : `https://${cust.gpsLink}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-rose-500 hover:text-rose-600 flex items-center gap-0.5 text-[10px] font-semibold"
                                title="View GPS Pin"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>GPS</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Service Type & Server */}
                      <TableCell className="whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${serviceConfig.bg} ${serviceConfig.darkBg}`}
                          >
                            {serviceType}
                          </span>
                          {serverObj ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              <Server className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {serverObj.deviceName}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              No Server
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Contact Info (Phone / Email) */}
                      <TableCell className="whitespace-nowrap">
                        <div className="space-y-0.5 text-xs">
                          {cust.phone ? (
                            <a
                              href={`tel:${cust.phone}`}
                              className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300 hover:text-sky-600"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{cust.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {cust.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[140px]">
                                {cust.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Monthly Bill (SAR) */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                          {formatCurrency(cust.monthlyBill)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Day {cust.billingDay}
                        </span>
                      </TableCell>

                      {/* Current Bill Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        {currentBill ? (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                                currentBill.status === "Paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60"
                                  : currentBill.status === "Overdue"
                                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60 animate-pulse"
                                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60"
                              }`}
                            >
                              {currentBill.status}
                            </span>
                            {currentBill.status !== "Paid" &&
                              currentBill.dueAmount > 0 && (
                                <div className="font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                  Due: {formatCurrency(currentBill.dueAmount)}
                                </div>
                              )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No Bill
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="whitespace-nowrap">
                        <CustomerStatusBadge status={cust.status} />
                      </TableCell>

                      {/* Row Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canReadBilling && (
                            <button
                              type="button"
                              onClick={() => handleOpenCollect(cust)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              title="Collect Payment"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          <Link
                            href={`/customers/${cust._id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {canWriteCustomers && (
                            <button
                              type="button"
                              onClick={() => setEditingCustomer(cust)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                              title="Edit Customer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canWriteCustomers && (
                            <button
                              type="button"
                              onClick={() => setDeletingCustomer(cust)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {total}
              </span>{" "}
              customers
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePage(page - 1)}
                disabled={page <= 1}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-xs font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePage(page + 1)}
                disabled={page >= totalPages}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-800"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
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

      {/* Create Customer Dialog */}
      <CustomerFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          router.refresh();
        }}
      />

      {/* Collect Bill Dialog */}
      <CollectBillDialog
        open={collectOpen}
        onOpenChange={setCollectOpen}
        initialCustomer={customerToCollect}
        initialBilling={customerToCollect?.currentBill}
        onSuccess={() => {
          setCollectOpen(false);
          router.refresh();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={Boolean(deletingCustomer)}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title={`Delete Customer ${deletingCustomer?.name}?`}
        description="Are you sure you want to delete this customer account? Customers with past billing history cannot be permanently deleted."
      />
    </>
  );
}
