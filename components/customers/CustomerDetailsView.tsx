"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Pencil,
  Receipt,
  User,
  Users,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Server,
  Radio,
  Wifi,
  Router as RouterIcon,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { PaymentUpdateDialog } from "@/components/billing/PaymentUpdateDialog";
import { formatDate } from "@/lib/utils";
import type { ICustomer, IBilling, IDevice } from "@/types";

function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "server":
      return Server;
    case "antenna":
      return Radio;
    case "access-point":
      return Wifi;
    case "router":
      return RouterIcon;
    case "switch":
      return Network;
    default:
      return Network;
  }
}

interface CustomerDetailsViewProps {
  customer: ICustomer;
  billings: IBilling[];
  billingTotal: number;
  billingPage: number;
  billingTotalPages: number;
}

export function CustomerDetailsView({
  customer,
  billings,
  billingTotal,
  billingPage,
  billingTotalPages,
}: CustomerDetailsViewProps) {
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBillingForPayment, setSelectedBillingForPayment] = useState<IBilling | null>(null);

  const navigateBillingPage = (newPage: number) => {
    router.push(`/customers/${customer._id}?page=${newPage}`);
  };

  const assignedDevices = (customer.assignedDevices || []) as IDevice[];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb Return */}
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-200/50 dark:border-sky-900/50">
          {customer.customerId}
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 to-blue-600/10 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40 shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {customer.name}
                </h1>
                <CustomerStatusBadge status={customer.status} size="lg" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Client ID: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{customer.customerId}</span>
                {customer.contactPerson && ` • Contact: ${customer.contactPerson}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(true)}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Edit Customer
            </Button>
            <Link href={`/billing?search=${encodeURIComponent(customer.name)}`}>
              <Button className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold">
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                View Invoices
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Account Information & Subscription Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Profile */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-sky-500" />
            <h2>Contact & Address</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {customer.phone || "Not recorded"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {customer.email || "Not recorded"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <span className="text-slate-400 block">Address:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed block">
                {customer.address || "No address provided"}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription & Billing Parameters */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <h2>Monthly Subscription</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400">Monthly Bill Amount:</span>
              <span className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                ৳{customer.monthlyBill?.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400">Monthly Billing Day:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                Day {customer.billingDay} of each month
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400">Billing Start Date:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatDate(customer.billingStartDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Hardware Devices (Optional Relationship) */}
        {assignedDevices.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Boxes className="w-5 h-5 text-indigo-500" />
                <h2>Assigned Infrastructure Devices ({assignedDevices.length})</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {assignedDevices.map((dev) => {
                const Icon = getDeviceIcon(dev.deviceType);
                return (
                  <Link
                    key={dev._id}
                    href={`/devices/${dev.deviceType}/${dev._id}`}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-sky-400 transition-all flex items-center gap-3"
                  >
                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                        #{dev.sl}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">
                        {dev.deviceName}
                      </span>
                      <span className="text-[11px] text-slate-400">{dev.brand}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Paginated Billing History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Billing & Payment History
            </h2>
            <p className="text-xs text-slate-400">
              Complete historical billing records and payment audit trail
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {billingTotal} total invoices
          </span>
        </div>

        {billings.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No billing records yet</p>
            <p className="mt-1">Invoices will appear here once monthly bills are generated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pr-4">Invoice ID</th>
                  <th className="pb-3 pr-4">Billing Month</th>
                  <th className="pb-3 pr-4 text-right">Bill Amount</th>
                  <th className="pb-3 pr-4 text-right">Paid</th>
                  <th className="pb-3 pr-4 text-right">Due</th>
                  <th className="pb-3 pr-4">Due Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {billings.map((bill) => (
                  <tr
                    key={bill._id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 pr-4 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      {bill.billingId}
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {bill.billingMonth}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      ৳{bill.billingAmount?.toLocaleString() || 0}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      ৳{bill.paidAmount?.toLocaleString() || 0}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      ৳{bill.dueAmount?.toLocaleString() || 0}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-500 whitespace-nowrap">
                      {formatDate(bill.dueDate)}
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <BillingStatusBadge status={bill.status} size="sm" />
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBillingForPayment(bill)}
                        className="rounded-lg h-7 px-2.5 text-xs font-semibold border-slate-200 dark:border-slate-800"
                      >
                        Update Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {billingTotalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateBillingPage(billingPage - 1)}
              disabled={billingPage <= 1}
              className="h-8 rounded-xl border-slate-200 dark:border-slate-800"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Page {billingPage} of {billingTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateBillingPage(billingPage + 1)}
              disabled={billingPage >= billingTotalPages}
              className="h-8 rounded-xl border-slate-200 dark:border-slate-800"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Edit Customer Dialog */}
      <CustomerFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        customerToEdit={customer}
        onSuccess={() => router.refresh()}
      />

      {/* Payment Update Dialog */}
      <PaymentUpdateDialog
        billing={selectedBillingForPayment}
        open={Boolean(selectedBillingForPayment)}
        onOpenChange={(open) => !open && setSelectedBillingForPayment(null)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
