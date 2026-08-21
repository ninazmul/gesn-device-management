"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Server,
  Radio,
  Wifi,
  Router as RouterIcon,
  Network,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  Clock,
  DollarSign,
  UserCheck,
  Receipt,
  ExternalLink,
  Users,
  ShieldAlert,
  Activity,
  LayoutDashboard,
  
} from "lucide-react";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { DeviceStatusBadge } from "@/components/devices/DeviceStatusBadge";
import { formatDateTime } from "@/lib/utils";
import type { DashboardStats } from "@/types";

function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "server": return Server;
    case "antenna": return Radio;
    case "access-point": return Wifi;
    case "router": return RouterIcon;
    case "switch": return Network;
    default: return Network;
  }
}

type DeviceTheme = {
  iconBg: string;
  iconText: string;
  iconBorder: string;
  accentText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  addBtn: string;
  viewBtn: string;
  barColor: string;
};

function getDeviceTheme(type: string): DeviceTheme {
  switch (type?.toLowerCase()) {
    case "server":
      return {
        iconBg: "bg-purple-50 dark:bg-purple-950/40",
        iconText: "text-purple-600 dark:text-purple-400",
        iconBorder: "border-purple-200/60 dark:border-purple-800/50",
        accentText: "text-purple-700 dark:text-purple-300",
        badgeBg: "bg-purple-50 dark:bg-purple-950/40",
        badgeText: "text-purple-700 dark:text-purple-300",
        badgeBorder: "border-purple-200/60 dark:border-purple-800/40",
        addBtn: "bg-purple-600 hover:bg-purple-700 text-white shadow-sm active:scale-95",
        viewBtn: "text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40",
        barColor: "bg-purple-500",
      };
    case "switch":
      return {
        iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
        iconText: "text-emerald-600 dark:text-emerald-400",
        iconBorder: "border-emerald-200/60 dark:border-emerald-800/50",
        accentText: "text-emerald-700 dark:text-emerald-300",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
        badgeText: "text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-200/60 dark:border-emerald-800/40",
        addBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95",
        viewBtn: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
        barColor: "bg-emerald-500",
      };
    case "antenna":
      return {
        iconBg: "bg-sky-50 dark:bg-sky-950/40",
        iconText: "text-sky-600 dark:text-sky-400",
        iconBorder: "border-sky-200/60 dark:border-sky-800/50",
        accentText: "text-sky-700 dark:text-sky-300",
        badgeBg: "bg-sky-50 dark:bg-sky-950/40",
        badgeText: "text-sky-700 dark:text-sky-300",
        badgeBorder: "border-sky-200/60 dark:border-sky-800/40",
        addBtn: "bg-sky-600 hover:bg-sky-700 text-white shadow-sm active:scale-95",
        viewBtn: "text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/40",
        barColor: "bg-sky-500",
      };
    case "access-point":
      return {
        iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
        iconText: "text-cyan-600 dark:text-cyan-400",
        iconBorder: "border-cyan-200/60 dark:border-cyan-800/50",
        accentText: "text-cyan-700 dark:text-cyan-300",
        badgeBg: "bg-cyan-50 dark:bg-cyan-950/40",
        badgeText: "text-cyan-700 dark:text-cyan-300",
        badgeBorder: "border-cyan-200/60 dark:border-cyan-800/40",
        addBtn: "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm active:scale-95",
        viewBtn: "text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/40",
        barColor: "bg-cyan-500",
      };
    case "router":
      return {
        iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
        iconText: "text-indigo-600 dark:text-indigo-400",
        iconBorder: "border-indigo-200/60 dark:border-indigo-800/50",
        accentText: "text-indigo-700 dark:text-indigo-300",
        badgeBg: "bg-indigo-50 dark:bg-indigo-950/40",
        badgeText: "text-indigo-700 dark:text-indigo-300",
        badgeBorder: "border-indigo-200/60 dark:border-indigo-800/40",
        addBtn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95",
        viewBtn: "text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40",
        barColor: "bg-indigo-500",
      };
    default:
      return {
        iconBg: "bg-slate-100 dark:bg-slate-800",
        iconText: "text-slate-600 dark:text-slate-400",
        iconBorder: "border-slate-200 dark:border-slate-700",
        accentText: "text-slate-700 dark:text-slate-300",
        badgeBg: "bg-slate-100 dark:bg-slate-800",
        badgeText: "text-slate-700 dark:text-slate-300",
        badgeBorder: "border-slate-200 dark:border-slate-700",
        addBtn: "bg-slate-800 hover:bg-slate-700 text-white shadow-sm active:scale-95",
        viewBtn: "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
        barColor: "bg-slate-500",
      };
  }
}

interface DeviceSectionCardProps {
  item: DashboardStats["byType"][number];
  onAdd: () => void;
}

function DeviceSectionCard({ item, onAdd }: DeviceSectionCardProps) {
  const Icon = getDeviceIcon(item.type);
  const theme = getDeviceTheme(item.type);
  const activeRate = item.count > 0 ? Math.round((item.active / item.count) * 100) : 0;

  const statTiles = [
    { label: "Total", value: item.count, icon: Boxes, textCls: "text-slate-800 dark:text-slate-100", bg: "bg-slate-50/80 dark:bg-slate-800/40", border: "border-slate-200/70 dark:border-slate-700/60" },
    { label: "Active", value: item.active, icon: CheckCircle2, textCls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/70 dark:bg-emerald-950/30", border: "border-emerald-200/60 dark:border-emerald-900/40" },
    { label: "Offline", value: item.offline, icon: AlertOctagon, textCls: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50/70 dark:bg-rose-950/30", border: "border-rose-200/60 dark:border-rose-900/40" },
    { label: "Maint.", value: item.maintenance, icon: Wrench, textCls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/70 dark:bg-amber-950/30", border: "border-amber-200/60 dark:border-amber-900/40" },
    { label: "Available", value: item.available, icon: Activity, textCls: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50/70 dark:bg-sky-950/30", border: "border-sky-200/60 dark:border-sky-900/40" },
    { label: "Inactive", value: item.inactive, icon: ShieldAlert, textCls: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50/80 dark:bg-slate-800/40", border: "border-slate-200/70 dark:border-slate-700/60" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3 sm:space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
      {/* Top Bar: Icon + Title + Metrics + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl sm:rounded-2xl ${theme.iconBg} ${theme.iconText} border ${theme.iconBorder} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-sm sm:text-base font-extrabold tracking-tight ${theme.accentText}`}>
                {item.label}s
              </h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                {item.count} Units
              </span>
              {item.count > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeRate}% active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Infrastructure category overview & status distribution
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={onAdd}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold ${theme.addBtn} transition-all`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add {item.label}</span>
          </button>
          <Link
            href={`/devices/${item.type}`}
            className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all ${theme.viewBtn}`}
          >
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Mini Visual Health Bar */}
      {item.count > 0 && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(item.active / item.count) * 100}%` }}
            title={`Active: ${item.active}`}
          />
          <div
            className="bg-sky-400 h-full transition-all duration-500"
            style={{ width: `${(item.available / item.count) * 100}%` }}
            title={`Available: ${item.available}`}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${(item.maintenance / item.count) * 100}%` }}
            title={`Maintenance: ${item.maintenance}`}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${(item.offline / item.count) * 100}%` }}
            title={`Offline: ${item.offline}`}
          />
        </div>
      )}

      {/* Responsive Compact Metrics Grid: 3 cols on mobile, 6 on sm+ */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
        {statTiles.map(({ label, value, icon: SIcon, textCls, bg, border }) => (
          <div
            key={label}
            className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1.5 rounded-xl sm:rounded-2xl border ${bg} ${border} transition-transform active:scale-95`}
          >
            <div className="flex items-center gap-1">
              <SIcon className={`w-3.5 h-3.5 ${textCls}`} />
              <span className={`text-base sm:text-lg font-black leading-none ${textCls}`}>
                {value.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DashboardClientProps {
  stats: DashboardStats;
}

export function DashboardClient({ stats }: DashboardClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState("antenna");

  const openCreateFor = (type: string) => {
    setCreateType(type);
    setCreateDialogOpen(true);
  };

  const total = stats.totalDevices || 0;
  const activeRate = total > 0 ? Math.round((stats.activeDevices / total) * 100) : 0;

  const TYPE_ORDER: Record<string, number> = {
    server: 1,
    switch: 2,
    antenna: 3,
    "access-point": 4,
    router: 5,
  };

  const sortedByType = [...stats.byType].sort((a, b) => {
    const orderA = TYPE_ORDER[a.type?.toLowerCase()] ?? 99;
    const orderB = TYPE_ORDER[b.type?.toLowerCase()] ?? 99;
    return orderA - orderB;
  });

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-[1600px] mx-auto">

      {/* Sleek Compact Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl sm:rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50 shrink-0">
            <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Network Dashboard
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-bold text-slate-800 dark:text-slate-200">{total.toLocaleString()}</span> Total Devices · <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeRate}% operational</span>
            </p>
          </div>
        </div>

        {/* Global Status Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {stats.activeDevices} Active
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {stats.offlineDevices} Offline
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {stats.maintenanceDevices} Maint.
          </span>
        </div>
      </div>

      {/* Individual Device Category Cards */}
      <div className="space-y-3.5 sm:space-y-4">
        {sortedByType.map((item) => (
          <DeviceSectionCard
            key={item.type}
            item={item}
            onAdd={() => openCreateFor(item.type)}
          />
        ))}
      </div>

      {/* Customers & Billing Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  Customers & Monthly Billing
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  {stats.billingStats?.currentMonth}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Active client accounts and real-time revenue collection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Link
              href="/customers"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Customers <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
            >
              Billing <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Compact Billing Tiles Grid: 2 cols on mobile, 5 on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Active Customers */}
          <Link
            href="/customers?status=Active"
            className="group flex flex-col gap-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-sky-300 dark:hover:border-sky-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Active Clients
              </span>
              <div className="p-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {(stats.customerStats?.activeCustomers ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Of {(stats.customerStats?.totalCustomers ?? 0).toLocaleString()} total
              </p>
            </div>
          </Link>

          {/* Monthly Billed */}
          <Link
            href="/billing"
            className="group flex flex-col gap-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Billed
              </span>
              <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100 leading-none">
                ৳{(stats.billingStats?.monthlyBilled ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Invoiced amount</p>
            </div>
          </Link>

          {/* Collected */}
          <Link
            href="/billing?status=Paid"
            className="group flex flex-col gap-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Collected
              </span>
              <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 leading-none">
                ৳{(stats.billingStats?.collected ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium mt-1">Received revenue</p>
            </div>
          </Link>

          {/* Pending */}
          <Link
            href="/billing?status=Pending"
            className="group flex flex-col gap-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Pending
              </span>
              <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 leading-none">
                ৳{(stats.billingStats?.pending ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-medium mt-1">Awaiting payment</p>
            </div>
          </Link>

          {/* Overdue */}
          <Link
            href="/billing?status=Overdue"
            className="group col-span-2 sm:col-span-1 flex flex-col gap-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-rose-200/70 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-400 dark:hover:border-rose-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Overdue
              </span>
              <div className="p-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 leading-none">
                ৳{(stats.billingStats?.overdue ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 font-medium mt-1">Past due date</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recently Registered Devices */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                Recently Registered Devices
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Latest hardware added to the infrastructure</p>
            </div>
          </div>
          <Link
            href="/devices"
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.recentDevices.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No devices registered yet</p>
            <p className="text-xs mt-1">Use the Add buttons above to register your first device.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="px-6 py-3">SL</th>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {stats.recentDevices.map((d) => {
                    const Icon = getDeviceIcon(d.deviceType);
                    const theme = getDeviceTheme(d.deviceType);
                    return (
                      <tr key={d._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          <Link href={`/devices/${d.deviceType}/${d._id}`} className="hover:underline">#{d.sl}</Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconText} border ${theme.iconBorder} shrink-0`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <Link href={`/devices/${d.deviceType}/${d._id}`} className="font-bold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 block">
                                {d.deviceName}
                              </Link>
                              <span className="text-[11px] text-slate-400">{d.brand} · {d.model}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 capitalize text-slate-500 dark:text-slate-400 text-xs">{d.deviceType}</td>
                        <td className="px-4 py-3.5">
                          {d.ipAddress
                            ? <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">{d.ipAddress}</span>
                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap"><DeviceStatusBadge status={d.status} size="sm" /></td>
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap text-[11px]">{formatDateTime(d.createdAt)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/devices/${d.deviceType}/${d._id}`} className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-semibold">
                            Details <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Compact Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recentDevices.map((d) => {
                const Icon = getDeviceIcon(d.deviceType);
                const theme = getDeviceTheme(d.deviceType);
                return (
                  <Link
                    key={d._id}
                    href={`/devices/${d.deviceType}/${d._id}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl ${theme.iconBg} ${theme.iconText} border ${theme.iconBorder} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                          {d.deviceName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {d.brand} · {d.model} {d.ipAddress ? `· ${d.ipAddress}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <DeviceStatusBadge status={d.status} size="sm" />
                      <div className="text-[10px] text-slate-400 font-mono">#{d.sl}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create Dialog */}
      <DeviceFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDeviceType={createType}
        onSuccess={() => {
          setCreateDialogOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
