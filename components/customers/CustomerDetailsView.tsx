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
  MapPin,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { BillingStatusBadge } from "@/components/billing/BillingStatusBadge";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CollectBillDialog } from "@/components/billing/CollectBillDialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CUSTOMER_SERVICE_TYPE_CONFIG } from "@/lib/constants";
import type { ICustomer, IBilling, IDevice } from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";

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
  const { canWrite, canRead } = usePermissions();
  const canWriteCustomers = canWrite("customers");
  const canReadBilling = canRead("billing");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [selectedBillingForCollect, setSelectedBillingForCollect] =
    useState<IBilling | null>(null);

  const navigateBillingPage = (newPage: number) => {
    router.push(`/customers/${customer._id}?page=${newPage}`);
  };

  const assignedDevices = (customer.assignedDevices || []) as IDevice[];
  const serverObj =
    customer.server && typeof customer.server === "object"
      ? customer.server
      : null;

  const serviceType = customer.serviceType || "Service C";
  const serviceConfig = CUSTOMER_SERVICE_TYPE_CONFIG[serviceType] || {
    label: serviceType,
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    darkBg: "dark:bg-slate-800",
  };

  const handleOpenCollectForBill = (bill: IBilling) => {
    setSelectedBillingForCollect(bill);
    setIsCollectOpen(true);
  };

  const handleOpenQuickCollect = () => {
    setSelectedBillingForCollect(null);
    setIsCollectOpen(true);
  };

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
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-600/10 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {customer.name}
                </h1>
                <CustomerStatusBadge status={customer.status} size="lg" />
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${serviceConfig.bg} ${serviceConfig.darkBg}`}
                >
                  {serviceType}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Client ID:{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {customer.customerId}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {canWriteCustomers && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Edit Profile
              </Button>
            )}

            {canReadBilling && (
              <Button
                type="button"
                onClick={handleOpenQuickCollect}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20"
              >
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                Collect Bill
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Account Information & Subscription Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Location Profile */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-sky-500" />
            <h2>Contact & Location</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400">Phone / Mobile:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {customer.phone || "Not recorded"}
              </span>
            </div>



            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <span className="text-slate-400 block">Physical Address:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed block">
                {customer.address || "No address provided"}
              </span>
            </div>

            {/* GPS Link */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                GPS Pin / Coordinates:
              </span>
              {customer.gpsLink ? (
                <a
                  href={
                    customer.gpsLink.startsWith("http")
                      ? customer.gpsLink
                      : `https://${customer.gpsLink}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Open Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400 italic">No GPS link</span>
              )}
            </div>
          </div>
        </div>

        {/* Subscription & Server Infrastructure */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <h2>Subscription & Server Link</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400">Monthly Bill Amount:</span>
              <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                {formatCurrency(customer.monthlyBill)}
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

            {/* Server Connection */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-500" />
                Connected Server:
              </span>
              {serverObj ? (
                <Link
                  href={`/devices/server/${serverObj._id}`}
                  className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>{serverObj.deviceName}</span>
                  <span className="font-mono text-[10px]">
                    ({serverObj.sl})
                  </span>
                </Link>
              ) : (
                <span className="text-slate-400 italic">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Assigned Hardware Devices */}
        {assignedDevices.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Boxes className="w-5 h-5 text-indigo-500" />
                <h2>
                  Assigned Infrastructure Devices ({assignedDevices.length})
                </h2>
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
                      <span className="text-[11px] text-slate-400">
                        <span className="capitalize">{dev.deviceType}</span>
                      </span>
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Billing & Collection History
            </h2>
            <p className="text-xs text-slate-400">
              Audit trail of invoices, collected payments, and timestamps (SAR).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">
              {billingTotal} total invoices
            </span>
            {canReadBilling && (
              <Button
                onClick={handleOpenQuickCollect}
                size="sm"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <Receipt className="w-3.5 h-3.5 mr-1" />
                Collect Bill
              </Button>
            )}
          </div>
        </div>

        {billings.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No billing records yet</p>
            <p className="mt-1">
              Invoices will appear here once monthly bills are generated.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pr-4">Invoice ID</th>
                  <th className="pb-3 pr-4">Billing Month</th>
                  <th className="pb-3 pr-4 text-right">Bill Amount</th>
                  <th className="pb-3 pr-4 text-right">Paid Amount</th>
                  <th className="pb-3 pr-4 text-right">Due Amount</th>
                  <th className="pb-3 pr-4">Due Date</th>
                  <th className="pb-3 pr-4">Method / Audit</th>
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
                      {formatCurrency(bill.billingAmount)}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(bill.paidAmount)}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatCurrency(bill.dueAmount)}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-500 whitespace-nowrap">
                      {formatDate(bill.dueDate)}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="space-y-0.5 text-[11px]">
                        {bill.paymentMethod && (
                          <span className="font-semibold block">
                            {bill.paymentMethod}
                          </span>
                        )}
                        {bill.collectedBy?.name && (
                          <span className="text-[10px] text-slate-400 block">
                            By {bill.collectedBy.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <BillingStatusBadge status={bill.status} size="sm" />
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      {canReadBilling && bill.dueAmount > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCollectForBill(bill)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Collect</span>
                        </button>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {billingTotal > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {billingPage} of {billingTotalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateBillingPage(billingPage - 1)}
                disabled={billingPage <= 1}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateBillingPage(billingPage + 1)}
                disabled={billingPage >= billingTotalPages}
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
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        customerToEdit={customer}
        onSuccess={() => {
          setIsEditOpen(false);
          router.refresh();
        }}
      />

      {/* Collect Bill Dialog */}
      <CollectBillDialog
        open={isCollectOpen}
        onOpenChange={setIsCollectOpen}
        initialCustomer={customer}
        initialBilling={selectedBillingForCollect}
        onSuccess={() => {
          setIsCollectOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
