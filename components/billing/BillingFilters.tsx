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
import { Search, X, RotateCcw } from "lucide-react";
import { BILLING_STATUSES, BILLING_SORT_OPTIONS } from "@/lib/constants";

interface BillingFiltersProps {
  totalBillings: number;
}

// Generate last 12 months for selector
function getRecentMonths() {
  const months: Array<{ value: string; label: string }> = [];
  const date = new Date();

  for (let i = 0; i < 18; i++) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    months.push({ value, label });
  }

  return months;
}

export function BillingFilters({ totalBillings }: BillingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentMonth = searchParams.get("billingMonth") || "all";
  const currentStatus = searchParams.get("status") || "all";
  const currentSort = searchParams.get("sortBy") || "newest";

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const monthsList = getRecentMonths();

  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

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
    currentMonth !== "all" ||
    currentStatus !== "all" ||
    currentSort !== "newest";

  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Bill ID, Customer Name, Phone, Ref..."
          className="pl-10 pr-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
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

      {/* Month Selector */}
      <div className="w-full md:w-48">
        <Select
          value={currentMonth}
          onValueChange={(val) => updateQuery("billingMonth", val)}
        >
          <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
            <SelectItem value="all">All Months</SelectItem>
            {monthsList.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="w-full md:w-40">
        <Select
          value={currentStatus}
          onValueChange={(val) => updateQuery("status", val)}
        >
          <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
            <SelectItem value="all">All Statuses</SelectItem>
            {BILLING_STATUSES.map((st) => (
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
            {BILLING_SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reset & Summary */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-400 hidden lg:inline">
          {totalBillings.toLocaleString()} bills
        </span>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleReset}
            title="Reset filters"
            className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
