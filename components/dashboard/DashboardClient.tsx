"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wifi,
  Network,
  ChevronRight,
  Search,
  Filter,
  Activity,
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ArrowRight,
  Boxes,
  ClockAlert,
  ChevronDown,
  ChevronUp,
  Wallet,
  Phone,
  Server as ServerIcon,
} from "lucide-react";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { CollectBillDialog } from "@/components/billing/CollectBillDialog";
import { DeviceStatusBadge } from "@/components/devices/DeviceStatusBadge";
import { GlobalSearchModal } from "@/components/shared/GlobalSearchModal";
import type { DashboardStats } from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";
import { formatDisplaySL, formatCurrency, formatDate } from "@/lib/utils";
import { CUSTOMER_SERVICE_TYPE_CONFIG } from "@/lib/constants";

type AwaitingCollectionCustomer = NonNullable<
  DashboardStats["awaitingCollectionCustomers"]
>[number];

type CollectCustomer = Pick<
  AwaitingCollectionCustomer,
  "_id" | "customerId" | "name" | "phone" | "serviceType" | "serverName"
> & { monthlyBill?: number };

type CollectBill = Pick<
  AwaitingCollectionCustomer,
  | "billingId"
  | "billingMonth"
  | "billingAmount"
  | "paidAmount"
  | "dueAmount"
  | "dueDate"
  | "status"
>;

// ==========================================
// CUSTOM ICONS TAILORED TO DASHBOARD THEME
// ==========================================
function AntennaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "w-5 h-5"}
    >
      <path d="M12 2v20" />
      <path d="m8 6 8-4" />
      <path d="m8 18 8-4" />
      <path d="M4 10a12 12 0 0 1 0 4" />
      <path d="M20 10a12 12 0 0 0 0 4" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function AccessPointIcon({ className }: { className?: string }) {
  return <Wifi className={className || "w-5 h-5"} />;
}

function CustomRouterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "w-5 h-5"}
    >
      <rect width="20" height="8" x="2" y="14" rx="2" />
      <path d="M6 18h.01" />
      <path d="M10 18h.01" />
      <path d="M15 10v4" />
      <path d="M17.8 7.2a4 4 0 0 0-5.6 0" />
      <path d="M20.6 4.4a8 8 0 0 0-11.2 0" />
    </svg>
  );
}

function SwitchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "w-5 h-5"}
    >
      <rect x="2" y="4" width="20" height="7" rx="2" />
      <rect x="2" y="15" width="20" height="7" rx="2" />
      <circle cx="6" cy="7.5" r="1" fill="currentColor" />
      <circle cx="10" cy="7.5" r="1" fill="currentColor" />
      <circle cx="14" cy="7.5" r="1" fill="currentColor" />
      <circle cx="18" cy="7.5" r="1" fill="currentColor" />
      <circle cx="6" cy="18.5" r="1" fill="currentColor" />
      <circle cx="10" cy="18.5" r="1" fill="currentColor" />
      <circle cx="14" cy="18.5" r="1" fill="currentColor" />
      <circle cx="18" cy="18.5" r="1" fill="currentColor" />
    </svg>
  );
}

function ServerStackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "w-5 h-5"}
    >
      <rect width="20" height="8" x="2" y="3" rx="2" />
      <rect width="20" height="8" x="2" y="13" rx="2" />
      <line x1="6" x2="6.01" y1="7" y2="7" />
      <line x1="10" x2="10.01" y1="7" y2="7" />
      <line x1="6" x2="6.01" y1="17" y2="17" />
      <line x1="10" x2="10.01" y1="17" y2="17" />
    </svg>
  );
}

interface DashboardClientProps {
  stats: DashboardStats;
}

export function DashboardClient({ stats }: DashboardClientProps) {
  const router = useRouter();
  const { canRead, canWrite, isSuperAdmin, isEngineer, can } = usePermissions();
  const canReadDevices = canRead("devices");
  const canViewServerInfra = canReadDevices && (isSuperAdmin || isEngineer);
  const canManageServerInUi =
    canWrite("devices") &&
    (isSuperAdmin || isEngineer || Boolean(can("server_manage")));
  const canWriteDevices = canWrite("devices");
  const canWriteCustomers = canWrite("customers");
  const canReadCustomers = canRead("customers");
  const canReadBilling = canRead("billing");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [collectBillOpen, setCollectBillOpen] = useState(false);
  const [selectedCustomerForBill, setSelectedCustomerForBill] =
    useState<CollectCustomer | null>(null);
  const [selectedBillForCollection, setSelectedBillForCollection] =
    useState<CollectBill | null>(null);
  const [devicesCollapsed, setDevicesCollapsed] = useState(false);
  const [createType, setCreateType] = useState("antenna");
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const handleOpenCollectFor = (
    customer?: CollectCustomer,
    bill?: CollectBill,
  ) => {
    setSelectedCustomerForBill(customer || null);
    setSelectedBillForCollection(bill || null);
    setCollectBillOpen(true);
  };

  const openCreateFor = (type: string) => {
    setCreateType(type);
    setCreateDialogOpen(true);
  };

  // Extract actual system counts from aggregated DB stats
  const antennaStats = stats.byType.find((t) => t.type === "antenna");
  const apStats = stats.byType.find((t) => t.type === "access-point");
  const routerStats = stats.byType.find((t) => t.type === "router");
  const switchStats = stats.byType.find((t) => t.type === "switch");

  const antennaCount = antennaStats?.count ?? 0;
  const antennaOnline =
    (antennaStats?.active ?? 0) + (antennaStats?.available ?? 0);
  const antennaOffline = Math.max(0, antennaCount - antennaOnline);

  const apCount = apStats?.count ?? 0;
  const apOnline = (apStats?.active ?? 0) + (apStats?.available ?? 0);
  const apOffline = Math.max(0, apCount - apOnline);

  const routerCount = routerStats?.count ?? 0;
  const routerOnline =
    (routerStats?.active ?? 0) + (routerStats?.available ?? 0);
  const routerOffline = Math.max(0, routerCount - routerOnline);

  const switchCount = switchStats?.count ?? 0;
  const switchOnline =
    (switchStats?.active ?? 0) + (switchStats?.available ?? 0);
  const switchOffline = Math.max(0, switchCount - switchOnline);

  // Server & Core Infrastructure actual DB stats
  const totalServers = stats.serverStats?.totalServers ?? 0;
  const activeServers = stats.serverStats?.activeServers ?? (totalServers || 0);
  const routersCount = stats.serverStats?.routersCount ?? routerCount;

  // Customer & Billing actual DB stats
  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-9xl mx-auto transition-all">
      {/* ========================================================================= */}
      {/* SECTION 1: QUICK ADD                                                      */}
      {/* ========================================================================= */}
      {canWriteDevices && (
        <section className="space-y-2.5">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 px-0.5">
            Quick Add
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
            {/* Antenna */}
            <button
              type="button"
              onClick={() => openCreateFor("antenna")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-150"
            >
              <AntennaIcon className="w-4 h-4 shrink-0" />
              Antenna
            </button>

            {/* Access Point */}
            <button
              type="button"
              onClick={() => openCreateFor("access-point")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-150"
            >
              <AccessPointIcon className="w-4 h-4 shrink-0" />
              Access Point
            </button>

            {/* Router */}
            <button
              type="button"
              onClick={() => openCreateFor("router")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-150"
            >
              <CustomRouterIcon className="w-4 h-4 shrink-0" />
              Router
            </button>

            {/* Switch */}
            <button
              type="button"
              onClick={() => openCreateFor("switch")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-150"
            >
              <SwitchIcon className="w-4 h-4 shrink-0" />
              Switch
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* PENDING APPROVALS ALERT BANNER                                            */}
      {/* ========================================================================= */}
      {canReadDevices && stats.pendingDevices > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-4.5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
              <ClockAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {stats.pendingDevices} Device
                  {stats.pendingDevices > 1 ? "s" : ""} Awaiting Approval
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Staff submissions are kept pending and isolated from the active
                network until authorized.
              </p>
            </div>
          </div>

          <Link
            href="/devices/pending"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all shrink-0"
          >
            <span>Review Pending Devices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: DEVICE OVERVIEW                                                */}
      {/* ========================================================================= */}
      {canReadDevices && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            Device Overview
          </h2>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div
              onClick={() => setSearchModalOpen(true)}
              className="relative flex-1 cursor-pointer group"
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              <input
                type="text"
                readOnly
                placeholder="Search AP No, customer name or mobile"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs sm:text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 cursor-pointer focus:outline-none transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              title="Filter devices & customers"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 transition-colors flex items-center justify-center shrink-0"
            >
              <Filter className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
          </div>

          {/* 2x2 Device Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Antenna Card */}
            <div className="relative bg-gradient-to-br from-sky-50/60 via-white to-white dark:from-sky-950/20 dark:via-slate-900/90 dark:to-slate-900/90 rounded-3xl border border-sky-200/70 dark:border-sky-800/50 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-[0_2px_8px_rgba(14,165,233,0.08)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.18)] hover:border-sky-300/80 dark:hover:border-sky-700/70 transition-all duration-200 overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-3xl before:bg-gradient-to-b before:from-sky-400 before:to-sky-600">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#e0f2fe] dark:bg-sky-950/60 border border-[#bae6fd] dark:border-sky-800/60 text-[#0284c7] dark:text-sky-400 shrink-0">
                    <AntennaIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#0284c7] dark:text-sky-400 block truncate">
                      Antenna
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Total
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                      {antennaCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <Link
                    href="/devices/antenna"
                    className="inline-flex items-center justify-center w-full py-2 px-3 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 text-sky-600 dark:text-sky-400 bg-sky-50/20 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/50 font-bold text-xs sm:text-sm transition-colors text-center"
                  >
                    View Devices
                  </Link>
                </div>
              </div>

              {/* Online / Offline stats */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Online</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {antennaOnline.toLocaleString()}
                  </div>
                </div>
                <div className="pl-3 sm:pl-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Offline</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {antennaOffline.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Access Point Card */}
            <div className="relative bg-gradient-to-br from-purple-50/60 via-white to-white dark:from-purple-950/20 dark:via-slate-900/90 dark:to-slate-900/90 rounded-3xl border border-purple-200/70 dark:border-purple-800/50 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-[0_2px_8px_rgba(168,85,247,0.08)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.18)] hover:border-purple-300/80 dark:hover:border-purple-700/70 transition-all duration-200 overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-3xl before:bg-gradient-to-b before:from-purple-400 before:to-purple-600">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#f3e8ff] dark:bg-purple-950/60 border border-[#e9d5ff] dark:border-purple-800/60 text-[#9333ea] dark:text-purple-400 shrink-0">
                    <AccessPointIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#9333ea] dark:text-purple-400 block truncate">
                      Access Point
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Total
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                      {apCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <Link
                    href="/devices/access-point"
                    className="inline-flex items-center justify-center w-full py-2 px-3 rounded-2xl border border-purple-200/80 dark:border-purple-800/80 text-purple-600 dark:text-purple-400 bg-purple-50/20 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/50 font-bold text-xs sm:text-sm transition-colors text-center"
                  >
                    View Devices
                  </Link>
                </div>
              </div>

              {/* Online / Offline stats */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Online</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {apOnline.toLocaleString()}
                  </div>
                </div>
                <div className="pl-3 sm:pl-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Offline</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {apOffline.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Router Card */}
            <div className="relative bg-gradient-to-br from-indigo-50/60 via-white to-white dark:from-indigo-950/20 dark:via-slate-900/90 dark:to-slate-900/90 rounded-3xl border border-indigo-200/70 dark:border-indigo-800/50 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-[0_2px_8px_rgba(99,102,241,0.08)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.18)] hover:border-indigo-300/80 dark:hover:border-indigo-700/70 transition-all duration-200 overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-3xl before:bg-gradient-to-b before:from-indigo-400 before:to-indigo-600">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#e0e7ff] dark:bg-indigo-950/60 border border-[#c7d2fe] dark:border-indigo-800/60 text-[#4f46e5] dark:text-indigo-400 shrink-0">
                    <CustomRouterIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#4f46e5] dark:text-indigo-400 block truncate">
                      Router
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Total
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                      {routerCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <Link
                    href="/devices/router"
                    className="inline-flex items-center justify-center w-full py-2 px-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold text-xs sm:text-sm transition-colors text-center"
                  >
                    View Devices
                  </Link>
                </div>
              </div>

              {/* Online / Offline stats */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Online</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {routerOnline.toLocaleString()}
                  </div>
                </div>
                <div className="pl-3 sm:pl-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Offline</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {routerOffline.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Switch Card */}
            <div className="relative bg-gradient-to-br from-emerald-50/60 via-white to-white dark:from-emerald-950/20 dark:via-slate-900/90 dark:to-slate-900/90 rounded-3xl border border-emerald-200/70 dark:border-emerald-800/50 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-[0_2px_8px_rgba(16,185,129,0.08)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.18)] hover:border-emerald-300/80 dark:hover:border-emerald-700/70 transition-all duration-200 overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-3xl before:bg-gradient-to-b before:from-emerald-400 before:to-emerald-600">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#dcfce7] dark:bg-emerald-950/60 border border-[#bbf7d0] dark:border-emerald-800/60 text-[#16a34a] dark:text-emerald-400 shrink-0">
                    <SwitchIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#16a34a] dark:text-emerald-400 block truncate">
                      Switch
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Total
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                      {switchCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <Link
                    href="/devices/switch"
                    className="inline-flex items-center justify-center w-full py-2 px-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-bold text-xs sm:text-sm transition-colors text-center"
                  >
                    View Devices
                  </Link>
                </div>
              </div>

              {/* Online / Offline stats */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Online</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {switchOnline.toLocaleString()}
                  </div>
                </div>
                <div className="pl-3 sm:pl-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Offline</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {switchOffline.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: SERVERS & INFRASTRUCTURE (super_admin & admin only)            */}
      {/* ========================================================================= */}
      {canViewServerInfra && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Servers & Infrastructure
            </h2>
          </div>

          <div
            className={`grid ${canManageServerInUi ? "grid-cols-2" : "grid-cols-1"} gap-2`}
          >
            {/* Top Action: Add Server */}
            {canManageServerInUi && (
              <button
                type="button"
                onClick={() => openCreateFor("server")}
                className="w-full py-2.5 px-4 rounded-2xl border border-blue-200/90 dark:border-blue-800/70 bg-blue-50/40 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
              >
                <ServerStackIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Add Server</span>
              </button>
            )}

            {/* Bottom Action: View Servers */}
            <Link
              href="/devices/server"
              className="w-full py-2.5 px-4 rounded-2xl border border-blue-200/90 dark:border-blue-800/70 bg-blue-50/40 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
            >
              <ServerStackIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>View Servers</span>
            </Link>
          </div>

          {/* 3-Column Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
            {/* Total Servers */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3.5 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 shrink-0">
                <ServerStackIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  Total Servers
                </span>
                <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {totalServers.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Active Servers */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3.5 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  Active Servers
                </span>
                <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {activeServers.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Routers */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3.5 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CustomRouterIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  Routers
                </span>
                <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {routersCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: CUSTOMERS & BILLING (PROMINENT REDESIGNED AREA)                */}
      {/* ========================================================================= */}
      {(canReadCustomers || canReadBilling) && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-sm">
          {/* Header & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Customers & Billing
                </h2>
                {canReadBilling && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/50">
                    <Users className="w-3.5 h-3.5" />
                    Financial Overview
                  </span>
                )}
                {canReadBilling && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    SAR
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage client subscriptions, active servers, and audit-tracked
                bill collections.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {canWriteCustomers && (
                <button
                  type="button"
                  onClick={() => setCreateCustomerOpen(true)}
                  className="py-2 px-3.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100/80 dark:hover:bg-purple-900/50 transition-all flex items-center gap-1.5 active:scale-[0.98] shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Customer</span>
                </button>
              )}

              {canReadCustomers && (
                <Link
                  href="/customers"
                  className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 active:scale-[0.98] shadow-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View Customers</span>
                </Link>
              )}

              {canReadBilling && (
                <button
                  type="button"
                  onClick={() => handleOpenCollectFor()}
                  className="py-2 px-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 active:scale-[0.98] shadow-sm shadow-emerald-600/20"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Collect Bill</span>
                </button>
              )}
            </div>
          </div>

          {/* 5 Prominent KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
            {canReadCustomers && (
              <>
                {/* 1. Total Customers */}
                <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                      Total Customers
                    </span>
                    <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                      {(
                        stats.customerStats.totalCustomers ?? 0
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            )}

            {canReadBilling && (
              <>
                {/* 2. Paid This Month */}
                <div className="bg-emerald-50/20 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 p-3 sm:p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block truncate">
                      Paid This Month
                    </span>
                    <div className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 leading-tight">
                      {(
                        stats.customerStats.paidThisMonth ?? 0
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 3. Pending */}
                <div className="bg-amber-50/20 dark:bg-amber-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-800/60 p-3 sm:p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 shrink-0">
                    <ClockAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block truncate">
                      Pending
                    </span>
                    <div className="text-lg sm:text-2xl font-black text-amber-700 dark:text-amber-400 leading-tight">
                      {(stats.customerStats.pendingCount ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 4. Overdue */}
                <div className="bg-rose-50/20 dark:bg-rose-950/20 rounded-2xl border border-rose-200/70 dark:border-rose-800/60 p-3 sm:p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 shrink-0">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block truncate">
                      Overdue
                    </span>
                    <div className="text-lg sm:text-2xl font-black text-rose-700 dark:text-rose-400 leading-tight">
                      {(stats.customerStats.overdueCount ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 5. Total Outstanding Amount (SAR) */}
                <div className="col-span-2 lg:col-span-1 bg-purple-50/30 dark:bg-purple-950/30 rounded-2xl border border-purple-200/70 dark:border-purple-800/60 p-3 sm:p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 shrink-0">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 block truncate">
                      Total Outstanding
                    </span>
                    <div className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300 leading-tight truncate">
                      {formatCurrency(
                        stats.customerStats.totalOutstandingAmount ?? 0,
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sub-section: Customers Awaiting Collection */}
          {canReadBilling && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Customers Awaiting Collection
                  </h3>
                  {(stats.awaitingCollectionCustomers?.length ?? 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      {stats.awaitingCollectionCustomers?.length} due
                    </span>
                  )}
                </div>

                {canReadBilling && (
                  <Link
                    href="/billing?status=Overdue"
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>View All Invoices</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {!stats.awaitingCollectionCustomers ||
              stats.awaitingCollectionCustomers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    All bills collected or up to date!
                  </p>
                  <p className="text-[11px] text-slate-400">
                    There are currently no overdue or pending customer
                    collections requiring attention.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.awaitingCollectionCustomers.map((cust) => {
                    const serviceConfig = CUSTOMER_SERVICE_TYPE_CONFIG[
                      cust.serviceType || "Service C"
                    ] || {
                      label: cust.serviceType || "Service C",
                      bg: "bg-slate-100 text-slate-700 border-slate-200",
                      darkBg: "dark:bg-slate-800",
                    };
                    const isOverdue = cust.status === "Overdue";

                    return (
                      <div
                        key={cust.billingId}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all flex flex-col justify-between gap-3 text-left"
                      >
                        <div className="space-y-2">
                          {/* Top Row: Customer Name & Status Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={`/customers/${cust._id}`}
                                className="font-black text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 truncate block"
                              >
                                {cust.name}
                              </Link>
                              <span className="font-mono text-[11px] text-slate-400 block">
                                {cust.customerId}
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 border ${
                                isOverdue
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60 animate-pulse"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60"
                              }`}
                            >
                              {cust.status}
                            </span>
                          </div>

                          {/* Tags: Service Type & Server */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold border ${serviceConfig.bg} ${serviceConfig.darkBg}`}
                            >
                              {cust.serviceType || "Service C"}
                            </span>
                            {cust.serverName && (
                              <span className="px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[130px] flex items-center gap-1">
                                <ServerIcon className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">
                                  {cust.serverName}
                                </span>
                              </span>
                            )}
                            {cust.phone && (
                              <a
                                href={`tel:${cust.phone}`}
                                className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{cust.phone}</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Amount Due & Collect Button */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Due: {formatDate(cust.dueDate)}
                            </span>
                            <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-400">
                              {formatCurrency(cust.dueAmount)}
                            </span>
                          </div>

                          {canReadBilling && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenCollectFor(
                                  {
                                    _id: cust._id,
                                    customerId: cust.customerId,
                                    name: cust.name,
                                    phone: cust.phone,
                                    serviceType: cust.serviceType,
                                    serverName: cust.serverName,
                                  },
                                  {
                                    billingId: cust.billingId,
                                    billingMonth: cust.billingMonth,
                                    billingAmount: cust.billingAmount,
                                    paidAmount: cust.paidAmount,
                                    dueAmount: cust.dueAmount,
                                    dueDate: cust.dueDate,
                                    status: cust.status,
                                  },
                                )
                              }
                              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Collect</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: RECENTLY REGISTERED DEVICES (COMPACT / COLLAPSIBLE)             */}
      {/* ========================================================================= */}
      {canReadDevices && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                    Recently Registered Devices
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {stats.recentDevices.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Latest hardware added to your network
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDevicesCollapsed((prev) => !prev)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all shrink-0"
              >
                <span>{devicesCollapsed ? "Show" : "Hide"}</span>
                {devicesCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>

              <Link
                href="/devices"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all shrink-0"
              >
                <span>See All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {!devicesCollapsed &&
            (stats.recentDevices.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Boxes className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
                <p className="text-xs font-semibold">
                  No devices registered yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
                {stats.recentDevices.map((d) => {
                  const devType = d.deviceType?.toLowerCase();
                  let IconComponent: React.ComponentType<{
                    className?: string;
                  }> = Network;
                  let iconTheme =
                    "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400";
                  let typeLabel = d.deviceType;

                  if (devType === "antenna") {
                    IconComponent = AntennaIcon;
                    iconTheme =
                      "bg-[#e0f2fe] dark:bg-sky-950/60 border-[#bae6fd] dark:border-sky-800/60 text-[#0284c7] dark:text-sky-400";
                    typeLabel = "Antenna";
                  } else if (devType === "access-point") {
                    IconComponent = AccessPointIcon;
                    iconTheme =
                      "bg-[#f3e8ff] dark:bg-purple-950/60 border-[#e9d5ff] dark:border-purple-800/60 text-[#9333ea] dark:text-purple-400";
                    typeLabel = "Access Point";
                  } else if (devType === "router") {
                    IconComponent = CustomRouterIcon;
                    iconTheme =
                      "bg-[#e0e7ff] dark:bg-indigo-950/60 border-[#c7d2fe] dark:border-indigo-800/60 text-[#4f46e5] dark:text-indigo-400";
                    typeLabel = "Router";
                  } else if (devType === "switch") {
                    IconComponent = SwitchIcon;
                    iconTheme =
                      "bg-[#dcfce7] dark:bg-emerald-950/60 border-[#bbf7d0] dark:border-emerald-800/60 text-[#16a34a] dark:text-emerald-400";
                    typeLabel = "Switch";
                  } else if (devType === "server") {
                    IconComponent = ServerStackIcon;
                    iconTheme =
                      "bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400";
                    typeLabel = "Server";
                  }

                  return (
                    <Link
                      key={d._id}
                      href={`/devices/${d.deviceType}/${d._id}`}
                      className="group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all active:scale-[0.99] text-left gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-2 rounded-xl border shrink-0 ${iconTheme}`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                              #{formatDisplaySL(d.sl)}
                            </span>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {d.deviceName}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {typeLabel} {d.ipAddress ? `· ${d.ipAddress}` : ""}
                          </div>
                        </div>
                      </div>

                      <DeviceStatusBadge status={d.status} size="sm" />
                    </Link>
                  );
                })}
              </div>
            ))}
        </section>
      )}

      {/* ========================================================================= */}
      {/* DIALOGS                                                                   */}
      {/* ========================================================================= */}
      {/* Device Form Dialog */}
      <DeviceFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDeviceType={createType}
        hideDeviceType={true}
        onSuccess={() => {
          setCreateDialogOpen(false);
          router.refresh();
        }}
      />

      {/* Customer Form Dialog */}
      <CustomerFormDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onSuccess={() => {
          setCreateCustomerOpen(false);
          router.refresh();
        }}
      />

      {/* Collect Bill Dialog */}
      <CollectBillDialog
        open={collectBillOpen}
        onOpenChange={setCollectBillOpen}
        initialCustomer={selectedCustomerForBill}
        initialBilling={selectedBillForCollection}
        onSuccess={() => {
          setCollectBillOpen(false);
          router.refresh();
        }}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
      />
    </div>
  );
}
