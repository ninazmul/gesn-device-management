"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ClockAlert,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  Eye,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  User,
  Calendar,
  Server,
  Wifi,
  Radio,
  Network,
  MapPin,
  Phone,
  Boxes,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IDevice } from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";
import { approveDevice } from "@/lib/actions/device.actions";
import { RejectDeviceDialog } from "@/components/devices/RejectDeviceDialog";
import { formatDisplaySL, formatDate } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface PendingDevicesClientProps {
  initialDevices: IDevice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  byType: Record<string, number>;
  servers: Array<{ _id: string; deviceName: string; sl: string }>;
}

const DEVICE_TYPE_LABELS: Record<
  string,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  antenna: {
    name: "Antenna",
    icon: Radio,
    color:
      "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800",
  },
  "access-point": {
    name: "Access Point",
    icon: Wifi,
    color:
      "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
  },
  router: {
    name: "Router",
    icon: Network,
    color:
      "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
  },
  switch: {
    name: "Switch",
    icon: Boxes,
    color:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
  },
  server: {
    name: "Server",
    icon: Server,
    color:
      "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
  },
};

export function PendingDevicesClient({
  initialDevices,
  total,
  page,
  totalPages,
  byType,
  servers,
}: PendingDevicesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canApproveDevice, isSuperAdmin, isEngineer, can } = usePermissions();
  const canApprove = canApproveDevice;
  const canViewServer = isSuperAdmin || isEngineer || can("server_view");

  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [selectedType, setSelectedType] = useState(
    searchParams.get("deviceType") || "all",
  );
  const [selectedSort, setSelectedSort] = useState(
    searchParams.get("sortBy") || "sl_asc",
  );
  const statusParam = searchParams.get("status");
  const selectedStatus = ["Pending", "Active", "Rejected"].includes(
    statusParam || "",
  )
    ? statusParam!
    : "Pending";
  const selectedServer = searchParams.get("server") || "all";
  const statusLabel =
    selectedStatus === "Active"
      ? "Approved"
      : selectedStatus === "Rejected"
        ? "Rejected"
        : "Pending";

  // State for active device actions
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingDevice, setRejectingDevice] = useState<IDevice | null>(null);
  const [copiedMac, setCopiedMac] = useState<string | null>(null);

  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery("search", searchTerm.trim());
  };

  const handleCopyMac = (mac: string) => {
    navigator.clipboard.writeText(mac);
    setCopiedMac(mac);
    toast.success(`Copied MAC: ${mac}`);
    setTimeout(() => setCopiedMac(null), 2000);
  };

  const handleApprove = async (device: IDevice) => {
    if (!canApprove) {
      toast.error("You do not have permission to approve devices.");
      return;
    }

    try {
      setApprovingId(device._id);
      await approveDevice(device._id);
      toast.success(
        `Approved #${formatDisplaySL(device.sl)} (${device.deviceName})! Device is now Active.`,
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to approve device.";
      toast.error(msg);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <ClockAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {statusLabel === "Pending"
                  ? "Pending Device Approvals"
                  : `${statusLabel} Devices`}
              </h1>
              {total > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                  {total} {statusLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedStatus === "Pending"
                ? "Review and authorize newly submitted hardware from staff members before integration into the active network."
                : `Browse devices that have been ${statusLabel.toLowerCase()}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/devices"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>All Devices</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="rounded-xl border-slate-200 dark:border-slate-800 h-9 gap-1.5 text-xs font-semibold"
            title="Refresh list"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Approval Status Tabs */}
      <div
        role="tablist"
        aria-label="Device approval status"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        {[
          { value: "Pending", label: "Pending" },
          { value: "Active", label: "Approved" },
          { value: "Rejected", label: "Rejected" },
        ].map((status) => (
          <button
            key={status.value}
            type="button"
            role="tab"
            aria-selected={selectedStatus === status.value}
            onClick={() => updateQuery("status", status.value)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
              selectedStatus === status.value
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {/* Quick Type Counters Filter Tabs */}
      <div
        aria-label="Filter by device type"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        <button
          type="button"
          onClick={() => {
            setSelectedType("all");
            updateQuery("deviceType", "all");
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
            selectedType === "all"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <span>All Types</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedType === "all"
                ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            }`}
          >
            {total}
          </span>
        </button>

        {Object.entries(DEVICE_TYPE_LABELS)
          .filter(([slug]) => slug !== "server" || canViewServer)
          .map(([slug, meta]) => {
            const count = byType[slug] || 0;
            const isSelected = selectedType === slug;
            const Icon = meta.icon;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  setSelectedType(slug);
                  updateQuery("deviceType", slug);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  isSelected
                    ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 min-w-[260px]"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by SL, device name, MAC, submitter, IP..."
            className="pl-10 pr-20 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs sm:text-sm"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white"
          >
            Search
          </Button>
        </form>

        {canViewServer && (
          <div className="w-full md:w-48">
            <Select
              value={selectedServer}
              onValueChange={(value) => updateQuery("server", value)}
            >
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs sm:text-sm">
                <SelectValue placeholder="All Servers" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                <SelectItem value="all">All Servers</SelectItem>
                {servers.map((server) => (
                  <SelectItem key={server._id} value={server._id}>
                    {server.deviceName || `Server #${server.sl}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-full md:w-48">
          <Select
            value={selectedSort}
            onValueChange={(val) => {
              setSelectedSort(val);
              updateQuery("sortBy", val);
            }}
          >
            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs sm:text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="sl_asc">SL (Low to High)</SelectItem>
              <SelectItem value="sl_desc">SL (High to Low)</SelectItem>
              <SelectItem value="name_asc">Device Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pending Devices Review List */}
      {initialDevices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-200/60 dark:border-emerald-800/40">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No {statusLabel} Devices
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {selectedStatus === "Pending"
              ? "All submitted devices have been reviewed and approved or rejected. Newly submitted hardware from staff will appear here."
              : `There are no devices in the ${statusLabel.toLowerCase()} list matching these filters.`}
          </p>
          <div className="mt-5">
            <Link
              href="/devices"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-all"
            >
              <span>Explore Device Inventory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {initialDevices.map((device) => {
            const devType = device.deviceType?.toLowerCase();
            const meta = DEVICE_TYPE_LABELS[devType] || {
              name: device.deviceType,
              icon: Network,
              color: "text-slate-600 bg-slate-100 border-slate-200",
            };
            const Icon = meta.icon;
            const isApproving = approvingId === device._id;

            return (
              <div
                key={device._id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-400/60 dark:hover:border-amber-500/40 p-4 sm:p-5 shadow-sm transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Device Info & Type */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`p-3 rounded-2xl border shrink-0 ${meta.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                          #{formatDisplaySL(device.sl)}
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                          {device.deviceName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${meta.color}`}
                        >
                          {meta.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            device.status === "Pending"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                              : device.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {device.status === "Active"
                            ? "Approved"
                            : device.status === "Rejected"
                              ? "Rejected"
                              : "Pending Approval"}
                        </span>
                      </div>

                      {/* Technical specifications row */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {device.macAddress && (
                          <div className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                            <span>MAC: {device.macAddress}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyMac(device.macAddress || "")
                              }
                              className="text-slate-400 hover:text-sky-600 transition-colors"
                              title="Copy MAC Address"
                            >
                              {copiedMac === device.macAddress ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}

                        {device.ipAddress && (
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            IP: {device.ipAddress}
                          </span>
                        )}

                        {device.server &&
                          typeof device.server === "object" &&
                          "deviceName" in device.server && (
                            <span className="flex items-center gap-1">
                              <Server className="w-3 h-3 text-slate-400" />
                              <span>
                                Server:{" "}
                                {String(
                                  (device.server as { deviceName?: string })
                                    .deviceName,
                                )}
                              </span>
                            </span>
                          )}

                        {device.customerName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Customer: {device.customerName}</span>
                          </span>
                        )}

                        {device.customerMobile && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{device.customerMobile}</span>
                          </span>
                        )}

                        {device.gpsLink && (
                          <a
                            href={device.gpsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sky-600 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Location</span>
                          </a>
                        )}
                      </div>

                      {/* Submitter & Timestamp details */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
                        {device.submittedBy ? (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Submitted by: </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {device.submittedBy.name ||
                                device.submittedBy.email}
                            </span>
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {device.submittedBy.role || "staff"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Staff submission</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            Submitted on: {formatDate(device.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 w-full lg:w-auto justify-end">
                    <Link
                      href={`/devices/${devType}/${device._id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-800 transition-colors"
                      title="View full device specifications"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </Link>

                    {canApprove && device.status === "Pending" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectingDevice(device)}
                          className="rounded-xl border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold gap-1.5 h-9 px-3.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isApproving}
                          onClick={() => handleApprove(device)}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 px-4 shadow-sm shadow-emerald-600/10"
                        >
                          {isApproving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve</span>
                        </Button>
                      </>
                    ) : device.status === "Pending" ? (
                      <span className="text-xs text-slate-400 italic flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        Awaiting Admin review
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div>
            Showing page{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {page}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {totalPages}
            </span>{" "}
            ({total} {statusLabel.toLowerCase()})
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateQuery("page", String(page - 1))}
              className="rounded-xl h-8 px-2.5"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              <span>Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateQuery("page", String(page + 1))}
              className="rounded-xl h-8 px-2.5"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Rejection Dialog */}
      <RejectDeviceDialog
        open={Boolean(rejectingDevice)}
        onOpenChange={(open) => !open && setRejectingDevice(null)}
        device={rejectingDevice}
        onSuccess={() => {
          setRejectingDevice(null);
          startTransition(() => {
            router.refresh();
          });
        }}
      />
    </div>
  );
}
