"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  RotateCcw,
  SlidersHorizontal,
  ScanBarcode,
  User,
} from "lucide-react";
import { DEVICE_STATUSES, SORT_OPTIONS } from "@/lib/constants";
import { getDeviceFilterOptions } from "@/lib/actions/device.actions";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { useBarcodeGun } from "@/hooks/useBarcodeGun";
import type { ParsedBarcodeResult } from "@/lib/barcode";
import { toast } from "react-hot-toast";
import { usePermissions } from "@/components/providers/PermissionContext";
import type { DeviceStatus } from "@/types";

interface DeviceFiltersProps {
  currentType?: string;
  totalDevices: number;
  statusOptions?: readonly DeviceStatus[];
}

export function DeviceFilters({
  totalDevices,
  statusOptions,
}: DeviceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL parameters
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentServer = searchParams.get("server") || "all";
  const currentSort = searchParams.get("sortBy") || "sl_asc";
  const currentSubmittedBy = searchParams.get("submittedBy") || "";

  const { admin, isSuperAdmin, isEngineer, can } = usePermissions();
  const canViewServer = isSuperAdmin || isEngineer || can("server_view");
  const isMySubmissionsActive = Boolean(
    admin?.email &&
    currentSubmittedBy.toLowerCase() === admin.email.toLowerCase(),
  );

  // Local state for debounced search
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [servers, setServers] = useState<
    Array<{ _id: string; deviceName: string; sl: string }>
  >([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Handle scanned barcode in search filter
  const handleBarcodeScan = (result: ParsedBarcodeResult) => {
    const searchVal = result.macAddress || result.serialNumber || result.raw;
    if (searchVal) {
      setSearchTerm(searchVal);
      updateQuery("search", searchVal);
      toast.success(`Filter applied: ${searchVal}`);
    }
  };

  // Hardware scanner gun support on the table/filter page
  useBarcodeGun({
    onScan: handleBarcodeScan,
    enabled: true,
  });

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // Load filter options dynamically
  useEffect(() => {
    if (!canViewServer) return;
    getDeviceFilterOptions().then((res) => {
      setServers(res.servers || []);
    });
  }, [canViewServer]);

  // Push updated searchParams to URL
  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 on filter changes
    router.push(`${pathname}?${params.toString()}`);
  };

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        updateQuery("search", searchTerm.trim());
      }
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleReset = () => {
    setSearchTerm("");
    router.push(pathname);
  };

  const hasActiveFilters =
    currentSearch !== "" ||
    currentStatus !== "all" ||
    currentServer !== "all" ||
    currentSort !== "sl_asc" ||
    currentSubmittedBy !== "";

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Top Row: Search + Quick Status + Sort + Toggle */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input with Live Camera Barcode Scan */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by SL, Device Name, IP, MAC, Server Name..."
            className="pl-10 pr-20 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm focus-visible:ring-sky-500"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                type="button"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
              title="Live Scan Barcode / MAC to Search"
            >
              <ScanBarcode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="w-full md:w-44">
          <Select
            value={currentStatus}
            onValueChange={(val) => updateQuery("status", val)}
          >
            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              <SelectItem value="all">All Statuses</SelectItem>
              {(statusOptions ?? DEVICE_STATUSES).map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Server Dropdown */}
        {canViewServer && (
          <div className="w-full md:w-48">
            <Select
              value={currentServer}
              onValueChange={(val) => updateQuery("server", val)}
            >
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
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

        {/* Sort Dropdown */}
        <div className="w-full md:w-44">
          <Select
            value={currentSort}
            onValueChange={(val) => updateQuery("sortBy", val)}
          >
            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action & Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {admin?.email && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                updateQuery(
                  "submittedBy",
                  isMySubmissionsActive ? "all" : admin.email.toLowerCase(),
                )
              }
              className={`rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 h-10 px-3.5 transition-all ${
                isMySubmissionsActive
                  ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 ring-2 ring-sky-500/20 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              title="Toggle to view only devices submitted by you"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Submissions</span>
              {isMySubmissionsActive && (
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
              )}
            </Button>
          )}

          {/* Advanced Filters Toggle */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 h-10 px-3.5 ${
              showAdvanced
                ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More Filters</span>
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleReset}
              title="Reset all filters"
              className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters Drawer/Row */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 animate-in fade-in-50 duration-200">
          {/* Device Count Summary */}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Found{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {totalDevices.toLocaleString()}
            </span>{" "}
            matching records
          </span>
        </div>
      )}

      {/* Live Camera Barcode Scanner for Search */}
      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScan}
        title="Scan Device Barcode to Search"
        description="Point camera at the device barcode or MAC sticker to instantly filter and find the device."
        targetFieldLabel="Search Filter"
      />
    </div>
  );
}
