"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  Activity,
  FileCode,
} from "lucide-react";
import { getActivityLogs } from "@/lib/actions/activityLog.actions";
import { IActivityLog } from "@/types";
import { formatDate } from "@/lib/utils";

const MODULE_OPTIONS = [
  { label: "All Modules", value: "all" },
  { label: "Devices", value: "devices" },
  { label: "Customers", value: "customers" },
  { label: "Billing", value: "billing" },
  { label: "Catalog", value: "catalog" },
  { label: "Admins & Roles", value: "admins" },
  { label: "Settings", value: "settings" },
];

export default function ActivityLogsClient({
  initialLogs,
  initialTotal,
  initialTotalPages,
}: {
  initialLogs: IActivityLog[];
  initialTotal: number;
  initialTotalPages: number;
}) {
  const [logs, setLogs] = useState<IActivityLog[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [inspectedLog, setInspectedLog] = useState<IActivityLog | null>(null);

  const fetchLogs = useCallback(
    async (currentPage = 1, mod = selectedModule, q = search, sDate = startDate, eDate = endDate) => {
      try {
        setLoading(true);
        const data = await getActivityLogs({
          page: currentPage,
          limit: 25,
          module: mod,
          search: q,
          startDate: sDate || undefined,
          endDate: eDate || undefined,
        });
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(data.page);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedModule, search, startDate, endDate]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1, selectedModule, search, startDate, endDate);
  };

  const handleResetFilters = () => {
    setSelectedModule("all");
    setSearch("");
    setStartDate("");
    setEndDate("");
    fetchLogs(1, "all", "", "", "");
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE")) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
    if (act.includes("UPDATE") || act.includes("EDIT")) {
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    }
    if (act.includes("DELETE") || act.includes("REMOVE")) {
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    }
    if (act.includes("STATUS")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
    if (act.includes("PAYMENT") || act.includes("BILL")) {
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    }
    return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold";
      case "admin":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold";
      case "editor":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "moderator":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Activity & Audit Logs
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive trace of all actions across the system &bull; Total entries:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{total}</span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold gap-2"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, email, details..."
              className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          {/* Module Select */}
          <div>
            <Select
              value={selectedModule}
              onValueChange={(val) => {
                setSelectedModule(val);
                fetchLogs(1, val, search, startDate, endDate);
              }}
            >
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                {MODULE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
              placeholder="From"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
              placeholder="To"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold"
            >
              Apply Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="border-slate-100 dark:border-slate-800">
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  Timestamp
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  Actor / Role
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  Module
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  Action
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  Details
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">
                  Inspect
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    No activity logs match the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                  >
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {log.actorEmail}
                        </span>
                        <span
                          className={`inline-block w-fit text-[10px] px-1.5 py-0.2 rounded border ${getRoleBadge(
                            log.actorRole
                          )}`}
                        >
                          {log.actorRole}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {log.module}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        <Activity className="w-3 h-3" />
                        {log.action}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 dark:text-slate-300 max-w-md truncate">
                      {log.details}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectedLog(log)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page <span className="font-bold text-slate-800 dark:text-slate-200">{page}</span> of{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1 || loading}
                className="h-8 rounded-xl text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages || loading}
                className="h-8 rounded-xl text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      {inspectedLog && (
        <Dialog open={!!inspectedLog} onOpenChange={() => setInspectedLog(null)}>
          <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <FileCode className="w-5 h-5 text-sky-500" />
                Audit Log Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-medium block">Timestamp</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(inspectedLog.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Module</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {inspectedLog.module}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Actor Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectedLog.actorEmail}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Actor Role</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectedLog.actorRole}
                  </span>
                </div>
                {inspectedLog.resourceId && (
                  <div>
                    <span className="text-slate-400 font-medium block">Resource Identifier</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {inspectedLog.resourceId}
                    </span>
                  </div>
                )}
                {inspectedLog.resourceName && (
                  <div>
                    <span className="text-slate-400 font-medium block">Resource Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {inspectedLog.resourceName}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Action Summary
                </span>
                <p className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {inspectedLog.details}
                </p>
              </div>

              {inspectedLog.metadata && Object.keys(inspectedLog.metadata).length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Payload / Metadata Diff
                  </span>
                  <pre className="p-3 rounded-2xl bg-slate-950 text-slate-200 text-[11px] overflow-x-auto font-mono max-h-48">
                    {JSON.stringify(inspectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
