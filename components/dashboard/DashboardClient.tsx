"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { DeviceStatusBadge } from "@/components/devices/DeviceStatusBadge";
import { GlobalSearchModal } from "@/components/shared/GlobalSearchModal";
import type { DashboardStats } from "@/types";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createType, setCreateType] = useState("antenna");
  const [searchModalOpen, setSearchModalOpen] = useState(false);

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
  const apCount = apStats?.count ?? 0;
  const routerCount = routerStats?.count ?? 0;
  const switchCount = switchStats?.count ?? 0;

  // Server & Core Infrastructure actual DB stats
  const totalServers = stats.serverStats?.totalServers ?? 0;
  const activeServers = stats.serverStats?.activeServers ?? (totalServers || 0);
  const routersCount = stats.serverStats?.routersCount ?? routerCount;

  // Customer & Billing actual DB stats
  const totalCustomers = stats.customerStats?.totalCustomers ?? 0;
  const paidThisMonth = stats.customerStats?.paidThisMonth ?? 0;
  const dueCustomers = stats.customerStats?.dueCustomers ?? 0;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-9xl mx-auto transition-all">

      {/* ========================================================================= */}
      {/* SECTION 1: QUICK ADD                                                      */}
      {/* ========================================================================= */}
      <section className="space-y-2.5">
        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 px-0.5">
          Quick Add
        </h2>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Add Antenna */}
          <button
            type="button"
            onClick={() => openCreateFor("antenna")}
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#e0f2fe] dark:bg-sky-950/60 border border-[#bae6fd] dark:border-sky-800/60 text-[#0284c7] dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                <AntennaIcon className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <span className="text-xs md:text-sm font-bold text-[#0284c7] dark:text-sky-400">
                Add Antenna
              </span>
            </div>
            <div className="w-7 h-7 rounded-full border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:border-sky-200 transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Add Access Point */}
          <button
            type="button"
            onClick={() => openCreateFor("access-point")}
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#f3e8ff] dark:bg-purple-950/60 border border-[#e9d5ff] dark:border-purple-800/60 text-[#9333ea] dark:text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                <AccessPointIcon className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <span className="text-xs md:text-sm font-bold text-[#9333ea] dark:text-purple-400">
                Add Access Point
              </span>
            </div>
            <div className="w-7 h-7 rounded-full border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:border-purple-200 transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Add Router */}
          <button
            type="button"
            onClick={() => openCreateFor("router")}
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#e0e7ff] dark:bg-indigo-950/60 border border-[#c7d2fe] dark:border-indigo-800/60 text-[#4f46e5] dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                <CustomRouterIcon className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <span className="text-xs md:text-sm font-bold text-[#4f46e5] dark:text-indigo-400">
                Add Router
              </span>
            </div>
            <div className="w-7 h-7 rounded-full border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Add Switch */}
          <button
            type="button"
            onClick={() => openCreateFor("switch")}
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#dcfce7] dark:bg-emerald-950/60 border border-[#bbf7d0] dark:border-emerald-800/60 text-[#16a34a] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <SwitchIcon className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <span className="text-xs md:text-sm font-bold text-[#16a34a] dark:text-emerald-400">
                Add Switch
              </span>
            </div>
            <div className="w-7 h-7 rounded-full border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:border-emerald-200 transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: DEVICE OVERVIEW                                                */}
      {/* ========================================================================= */}
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Antenna Card */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 flex flex-col justify-between space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#e0f2fe] dark:bg-sky-950/60 border border-[#bae6fd] dark:border-sky-800/60 text-[#0284c7] dark:text-sky-400 shrink-0">
                <AntennaIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  Antenna
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                  {antennaCount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="pt-1">
              <Link
                href="/devices/antenna"
                className="inline-flex items-center justify-center w-full py-1.5 px-3 rounded-xl border border-sky-200 dark:border-sky-800/80 text-sky-600 dark:text-sky-400 bg-sky-50/40 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-900/40 font-bold text-xs transition-colors text-center"
              >
                View
              </Link>
            </div>
          </div>

          {/* Access Point Card */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 flex flex-col justify-between space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#f3e8ff] dark:bg-purple-950/60 border border-[#e9d5ff] dark:border-purple-800/60 text-[#9333ea] dark:text-purple-400 shrink-0">
                <AccessPointIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  Access Point
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                  {apCount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="pt-1">
              <Link
                href="/devices/access-point"
                className="inline-flex items-center justify-center w-full py-1.5 px-3 rounded-xl border border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-950/30 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 font-bold text-xs transition-colors text-center"
              >
                View
              </Link>
            </div>
          </div>

          {/* Router Card */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 flex flex-col justify-between space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#e0e7ff] dark:bg-indigo-950/60 border border-[#c7d2fe] dark:border-indigo-800/60 text-[#4f46e5] dark:text-indigo-400 shrink-0">
                <CustomRouterIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  Router
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                  {routerCount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="pt-1">
              <Link
                href="/devices/router"
                className="inline-flex items-center justify-center w-full py-1.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 font-bold text-xs transition-colors text-center"
              >
                View
              </Link>
            </div>
          </div>

          {/* Switch Card */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4.5 flex flex-col justify-between space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#dcfce7] dark:bg-emerald-950/60 border border-[#bbf7d0] dark:border-emerald-800/60 text-[#16a34a] dark:text-emerald-400 shrink-0">
                <SwitchIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  Switch
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                  {switchCount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="pt-1">
              <Link
                href="/devices/switch"
                className="inline-flex items-center justify-center w-full py-1.5 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 font-bold text-xs transition-colors text-center"
              >
                View
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: SERVERS & INFRASTRUCTURE                                       */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            Servers & Infrastructure
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Top Action: Add Server */}
          <button
            type="button"
            onClick={() => openCreateFor("server")}
            className="w-full py-2.5 px-4 rounded-2xl border border-blue-200/90 dark:border-blue-800/70 bg-blue-50/40 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <ServerStackIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Add Server</span>
          </button>

          {/* Bottom Action: View Servers */}
          <Link
            href="/devices/server"
            className="w-full py-2.5 px-4 rounded-2xl border border-blue-200/90 dark:border-blue-800/70 bg-blue-50/40 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <ServerStackIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>View Servers</span>
          </Link></div>

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

      {/* ========================================================================= */}
      {/* SECTION 4: CUSTOMERS & BILLING                                            */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Customers & Billing
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/50">
              <Users className="w-3 h-3" />
              Client Accounts
            </span>
          </div>
        </div>

        {/* 3-Column Customer Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          {/* Total Customers */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3.5 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
                Total Customers
              </span>
              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                {totalCustomers.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Paid This Month */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20 p-2.5 sm:p-3.5 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 block truncate">
                Paid This Month
              </span>
              <div className="text-base sm:text-xl font-black text-emerald-700 dark:text-emerald-400 leading-tight">
                {paidThisMonth.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Due */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-rose-200/70 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/20 p-2.5 sm:p-3.5 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-rose-700 dark:text-rose-400 block truncate">
                Due / Overdue
              </span>
              <div className="text-base sm:text-xl font-black text-rose-700 dark:text-rose-400 leading-tight">
                {dueCustomers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Action Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          {/* Add Customer */}
          <button
            type="button"
            onClick={() => setCreateCustomerOpen(true)}
            className="py-2.5 px-2 sm:px-3 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100/80 dark:hover:bg-purple-900/50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-xs truncate"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Add Customer</span>
          </button>

          {/* View Customers */}
          <Link
            href="/customers"
            className="py-2.5 px-2 sm:px-3 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100/80 dark:hover:bg-purple-900/50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-xs truncate"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">View Customers</span>
          </Link>

          {/* Collect Payment */}
          <Link
            href="/billing"
            className="py-2.5 px-2 sm:px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-xs truncate"
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Billing</span>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: RECENTLY REGISTERED DEVICES                                    */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                Recently Registered Devices
              </h2>
              <p className="text-[11px] text-slate-400">
                Latest hardware added to your network
              </p>
            </div>
          </div>
          <Link
            href="/devices"
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all shrink-0"
          >
            <span>See All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.recentDevices.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No devices registered yet</p>
            <p className="text-xs mt-1">Use the Quick Add buttons above to register your first device.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            {stats.recentDevices.map((d) => {
              const devType = d.deviceType?.toLowerCase();
              let IconComponent: React.ComponentType<{ className?: string }> = Network;
              let iconTheme = "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400";
              let typeLabel = d.deviceType;

              if (devType === "antenna") {
                IconComponent = AntennaIcon;
                iconTheme = "bg-[#e0f2fe] dark:bg-sky-950/60 border-[#bae6fd] dark:border-sky-800/60 text-[#0284c7] dark:text-sky-400";
                typeLabel = "Antenna";
              } else if (devType === "access-point") {
                IconComponent = AccessPointIcon;
                iconTheme = "bg-[#f3e8ff] dark:bg-purple-950/60 border-[#e9d5ff] dark:border-purple-800/60 text-[#9333ea] dark:text-purple-400";
                typeLabel = "Access Point";
              } else if (devType === "router") {
                IconComponent = CustomRouterIcon;
                iconTheme = "bg-[#e0e7ff] dark:bg-indigo-950/60 border-[#c7d2fe] dark:border-indigo-800/60 text-[#4f46e5] dark:text-indigo-400";
                typeLabel = "Router";
              } else if (devType === "switch") {
                IconComponent = SwitchIcon;
                iconTheme = "bg-[#dcfce7] dark:bg-emerald-950/60 border-[#bbf7d0] dark:border-emerald-800/60 text-[#16a34a] dark:text-emerald-400";
                typeLabel = "Switch";
              } else if (devType === "server") {
                IconComponent = ServerStackIcon;
                iconTheme = "bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400";
                typeLabel = "Server";
              }

              return (
                <Link
                  key={d._id}
                  href={`/devices/${d.deviceType}/${d._id}`}
                  className="group flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md transition-all active:scale-[0.99] text-left gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl border shrink-0 group-hover:scale-105 transition-transform ${iconTheme}`}>
                      <IconComponent className="w-4 md:w-5 h-4 md:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                          #{d.sl}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {d.deviceName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{typeLabel}</span>
                        {" · "}
                        <span>{d.brand} {d.model}</span>
                        {d.ipAddress && (
                          <>
                            {" · "}
                            <span className="font-mono">{d.ipAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <DeviceStatusBadge status={d.status} size="sm" />
                    <div className="w-7 h-7 rounded-full border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:border-slate-400 transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* DIALOGS                                                                   */}
      {/* ========================================================================= */}
      {/* Device Form Dialog */}
      <DeviceFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDeviceType={createType}
        onSuccess={() => {
          setCreateDialogOpen(false);
          window.location.reload();
        }}
      />

      {/* Customer Form Dialog */}
      <CustomerFormDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onSuccess={() => {
          setCreateCustomerOpen(false);
          window.location.reload();
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
