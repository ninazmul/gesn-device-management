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
import { Search, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import { DEVICE_STATUSES, SORT_OPTIONS } from "@/lib/constants";
import { getDeviceFilterOptions } from "@/lib/actions/device.actions";

interface DeviceFiltersProps {
  currentType?: string;
  totalDevices: number;
}

export function DeviceFilters({ currentType, totalDevices }: DeviceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL parameters
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentBrand = searchParams.get("brand") || "all";
  const currentModel = searchParams.get("model") || "all";
  const currentSort = searchParams.get("sortBy") || "newest";

  // Local state for debounced search
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<Array<{ name: string; brand: string }>>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // Load filter options dynamically
  useEffect(() => {
    getDeviceFilterOptions(currentType).then((res) => {
      setBrands(res.brands || []);
      setModels(res.models || []);
    });
  }, [currentType]);

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

  // Filter models for selected brand
  const filteredModels =
    currentBrand && currentBrand !== "all"
      ? models.filter((m) => m.brand === currentBrand)
      : models;

  const hasActiveFilters =
    currentSearch !== "" ||
    currentStatus !== "all" ||
    currentBrand !== "all" ||
    currentModel !== "all" ||
    currentSort !== "newest";

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Top Row: Search + Quick Status + Sort + Toggle */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by SL, Device Name, IP, MAC, Model..."
            className="pl-10 pr-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm focus-visible:ring-sky-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
              {DEVICE_STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        {/* Advanced Filters Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 h-10 px-3.5 ${
              showAdvanced || (currentBrand !== "all" || currentModel !== "all")
                ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More Filters</span>
            {(currentBrand !== "all" || currentModel !== "all") && (
              <span className="w-2 h-2 rounded-full bg-sky-500" />
            )}
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
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in-50 duration-200">
          {/* Brand Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Brand
            </label>
            <Select
              value={currentBrand}
              onValueChange={(val) => {
                updateQuery("brand", val);
                updateQuery("model", "all");
              }}
            >
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Model
            </label>
            <Select
              value={currentModel}
              onValueChange={(val) => updateQuery("model", val)}
              disabled={filteredModels.length === 0}
            >
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                <SelectValue placeholder={filteredModels.length === 0 ? "No models" : "All Models"} />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                <SelectItem value="all">All Models</SelectItem>
                {Array.from(new Set(filteredModels.map((m) => m.name))).map((mName) => (
                  <SelectItem key={mName} value={mName}>
                    {mName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Device Count Summary */}
          <div className="flex items-end justify-between sm:justify-end gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 pb-2">
              Found <span className="font-bold text-slate-900 dark:text-slate-100">{totalDevices.toLocaleString()}</span> matching records
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
