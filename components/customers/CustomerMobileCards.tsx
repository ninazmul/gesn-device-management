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
      toast.success(`Customer ${deletingCustomer.customerId} deleted`);
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

  if (customers.length === 0) return null;

  return (
    <div className="space-y-3 block lg:hidden">
      {customers.map((cust) => {
        const serviceType = cust.serviceType || "Service C";
        const serviceConfig = CUSTOMER_SERVICE_TYPE_CONFIG[serviceType] || {
          label: serviceType,
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          darkBg: "dark:bg-slate-800",
        };

        const serverObj =
          cust.server && typeof cust.server === "object" ? cust.server : null;

        const currentBill = cust.currentBill;

        return (
          <div
            key={cust._id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
          >
            {/* Header: Name, ID, Badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/customers/${cust._id}`}
                  className="font-black text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 truncate block"
                >
                  {cust.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
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

            {/* Service & Server Tags */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${serviceConfig.bg} ${serviceConfig.darkBg}`}
              >
                {serviceType}
              </span>
              {serverObj && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate max-w-[140px]">
                  <Server className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="truncate">{serverObj.deviceName}</span>
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
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>GPS Location</span>
                </a>
              )}
            </div>

            {/* Financial Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-400 block text-[11px]">
                  Monthly Subscription
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                  {formatCurrency(cust.monthlyBill)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Day {cust.billingDay} of month
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Current Bill
                  </span>
                  {currentBill ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase mt-0.5 border ${
                        currentBill.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60"
                          : currentBill.status === "Overdue"
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60"
                      }`}
                    >
                      {currentBill.status}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">
                      No Bill
                    </span>
                  )}
                </div>
                {currentBill && currentBill.dueAmount > 0 && (
                  <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                    Due: {formatCurrency(currentBill.dueAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* Contact Details */}
            {(cust.phone || cust.email) && (
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
                {cust.phone && (
                  <a
                    href={`tel:${cust.phone}`}
                    className="flex items-center gap-2 hover:text-sky-600 font-mono"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.phone}</span>
                  </a>
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
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Link
                  href={`/customers/${cust._id}`}
                  className="py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80"
                >
                  <Eye className="w-3.5 h-3.5" /> Details
                </Link>

                {canReadBilling && (
                  <button
                    type="button"
                    onClick={() => handleOpenCollect(cust)}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Receipt className="w-3.5 h-3.5" /> Collect
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {canWriteCustomers && (
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(cust)}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canWriteCustomers && (
                  <button
                    type="button"
                    onClick={() => setDeletingCustomer(cust)}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination Controls */}
      {total > 0 && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            {page} / {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePage(page - 1)}
              disabled={page <= 1}
              className="h-8 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePage(page + 1)}
              disabled={page >= totalPages}
              className="h-8 rounded-xl"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
        description="Are you sure you want to delete this customer account? Financial records will prevent accidental deletion."
      />
    </div>
  );
}
