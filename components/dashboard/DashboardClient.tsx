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
  ArrowUpRight,
  Boxes,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  ExternalLink,
  ShieldAlert,
  Receipt,
  Clock,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceStatusBadge } from "@/components/devices/DeviceStatusBadge";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { formatDateTime } from "@/lib/utils";
import type { DashboardStats } from "@/types";

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
  const activePercent = total > 0 ? Math.round((stats.activeDevices / total) * 100) : 0;
  const offlinePercent = total > 0 ? Math.round((stats.offlineDevices / total) * 100) : 0;

  const quickAddItems = [
    {
      type: "server",
      label: "Server",
      icon: Server,
      className:
        "bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/40 border border-purple-400/30",
    },
    {
      type: "antenna",
      label: "Antenna",
      icon: Radio,
      className:
        "bg-sky-600/90 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/40 border border-sky-400/30",
    },
    {
      type: "access-point",
      label: "Access Point",
      icon: Wifi,
      className:
        "bg-cyan-600/90 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 border border-cyan-400/30",
    },
    {
      type: "router",
      label: "Router",
      icon: RouterIcon,
      className:
        "bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40 border border-indigo-400/30",
    },
    {
      type: "switch",
      label: "Switch",
      icon: Network,
      className:
        "bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 border border-emerald-400/30",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Top Banner / Widget Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 sm:p-8 rounded-3xl text-white shadow-2xl border border-slate-800/80">
        {/* Background glow accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Main Info */}
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 text-xs font-bold uppercase tracking-wider border border-sky-500/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Infrastructure Overview & Control
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
              GESN Device Management
            </h1>
            <p className="text-slate-300/90 text-xs sm:text-sm leading-relaxed">
              Real-time monitoring and inventory management across all servers, antennas, access points, routers, and switches.
            </p>
          </div>

          {/* Quick Add Action Widget Panel */}
          <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300/80 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-sky-400" /> Quick Add Hardware
              </span>
              <span className="text-[10px] text-slate-400 font-medium">5 types</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {quickAddItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.type}
                    onClick={() => openCreateFor(item.type)}
                    size="sm"
                    className={`rounded-xl font-semibold text-xs transition-all duration-150 active:scale-95 hover:scale-[1.03] ${item.className}`}
                  >
                    <Icon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    Add {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <Boxes className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats.totalDevices.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">All registered hardware</p>
        </div>

        {/* Active Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats.activeDevices.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {activePercent}% operational
          </p>
        </div>

        {/* Available Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Available
            </span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats.availableDevices.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">In stock / ready</p>
        </div>

        {/* Offline Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Offline
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats.offlineDevices.toLocaleString()}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            {offlinePercent}% unreachable
          </p>
        </div>

        {/* Maintenance Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Maintenance
            </span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats.maintenanceDevices.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Under service</p>
        </div>

        {/* Inactive / Retired */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Retired
            </span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {(stats.retiredDevices + stats.inactiveDevices).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Decommissioned</p>
        </div>
      </div>

      {/* Customer & Billing Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Customer & Monthly Billing Overview
            </h2>
            <p className="text-xs text-slate-400">
              Active subscriber accounts and billing metrics for {stats.billingStats?.currentMonth || "this month"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/customers"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              Customers <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              href="/billing"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Billing <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Active Customers */}
          <Link
            href="/customers?status=Active"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-sky-400 dark:hover:border-sky-700 transition-all group space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Active Customers
              </span>
              <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {(stats.customerStats?.activeCustomers ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Of {(stats.customerStats?.totalCustomers ?? 0).toLocaleString()} total clients
            </p>
          </Link>

          {/* Monthly Billed */}
          <Link
            href="/billing"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition-all group space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Monthly Billed
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              ৳{(stats.billingStats?.monthlyBilled ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Total invoiced ({stats.billingStats?.currentMonth})</p>
          </Link>

          {/* Collected */}
          <Link
            href="/billing?status=Paid"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-700 transition-all group space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Collected
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ৳{(stats.billingStats?.collected ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">Received revenue</p>
          </Link>

          {/* Pending */}
          <Link
            href="/billing?status=Pending"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-700 transition-all group space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Pending Due
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              ৳{(stats.billingStats?.pending ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Awaiting payment</p>
          </Link>

          {/* Overdue */}
          <Link
            href="/billing?status=Overdue"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-rose-400 dark:hover:border-rose-700 transition-all group space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Overdue
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              ৳{(stats.billingStats?.overdue ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">Past due date</p>
          </Link>
        </div>
      </div>

      {/* Device Type Distribution Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Device Sections Breakdown
          </h2>
          <Link
            href="/devices"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
          >
            View All Devices <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {stats.byType.map((item) => {
            const Icon = getDeviceIcon(item.type);
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <Link
                key={item.type}
                href={`/devices/${item.type}`}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-sky-400 dark:hover:border-sky-700 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {percentage}%
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      {item.label}
                    </h3>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {item.count.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                  <div
                    className="bg-sky-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Devices Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Recently Deployed / Registered Devices
            </h2>
            <p className="text-xs text-slate-400">
              Latest hardware units added to your network infrastructure
            </p>
          </div>
          <Link
            href="/devices"
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            See All →
          </Link>
        </div>

        {stats.recentDevices.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No devices in system yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Add your first antenna, router, switch or server to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pr-4">SL</th>
                  <th className="pb-3 pr-4">Device / Model</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">IP Address</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Registered</th>
                  <th className="pb-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {stats.recentDevices.map((d) => {
                  const Icon = getDeviceIcon(d.deviceType);
                  return (
                    <tr
                      key={d._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pr-4 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        <Link href={`/devices/${d.deviceType}/${d._id}`} className="hover:underline">
                          #{d.sl}
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <Link
                              href={`/devices/${d.deviceType}/${d._id}`}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors block"
                            >
                              {d.deviceName}
                            </Link>
                            <span className="text-[11px] text-slate-400">{d.brand}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 capitalize text-slate-600 dark:text-slate-300">
                        {d.deviceType}
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {d.ipAddress ? (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {d.ipAddress}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <DeviceStatusBadge status={d.status} size="sm" />
                      </td>
                      <td className="py-3.5 pr-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {formatDateTime(d.createdAt)}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/devices/${d.deviceType}/${d._id}`}
                          className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                        >
                          Details <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
