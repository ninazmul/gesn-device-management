"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wifi,
  Network,
  ChevronRight,
  Search,
  Activity,
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ArrowRight,
  Boxes,
  ClockAlert,
  Snowflake,
  ChevronDown,
  ChevronUp,
  Wallet,
  Phone,
  Server as ServerIcon,
  RotateCcw,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { ReturnToStorageDialog } from "@/components/devices/ReturnToStorageDialog";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { CollectBillDialog } from "@/components/billing/CollectBillDialog";
import { DeviceStatusBadge } from "@/components/devices/DeviceStatusBadge";
import { GlobalSearchModal } from "@/components/shared/GlobalSearchModal";
import {
  checkDeviceByMac,
  returnDeviceToStorage,
} from "@/lib/actions/device.actions";
import type { DashboardStats, IDevice } from "@/types";
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

function AntennaTowerCardIcon({ className = "w-7 h-7 text-[#00bcd4]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 20l3.5-13 3.5 13" />
      <path d="M9.5 15h5" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <path d="M5 9a7 7 0 0 0 0 6" />
      <path d="M2.5 7a10 10 0 0 0 0 10" />
      <path d="M19 9a7 7 0 0 1 0 6" />
      <path d="M21.5 7a10 10 0 0 1 0 10" />
    </svg>
  );
}

function RouterCardIcon({ className = "w-7 h-7 text-[#0066ff]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="4" width="2" height="7" rx="1" />
      <rect x="16" y="4" width="2" height="7" rx="1" />
      <rect x="2" y="11" width="20" height="9" rx="3" />
      <circle cx="7" cy="15.5" r="1" fill="white" />
      <circle cx="12" cy="15.5" r="1" fill="white" />
      <circle cx="17" cy="15.5" r="1" fill="white" />
    </svg>
  );
}

function SwitchCardIcon({ className = "w-7 h-7 text-[#10b981]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="7" width="20" height="10" rx="3" />
      <rect x="5" y="11" width="2.5" height="2" rx="0.5" fill="white" />
      <rect x="9.5" y="11" width="2.5" height="2" rx="0.5" fill="white" />
      <rect x="14" y="11" width="2.5" height="2" rx="0.5" fill="white" />
      <rect x="18.5" y="11" width="2.5" height="2" rx="0.5" fill="white" />
    </svg>
  );
}

function StorageWarehouseIcon({ className = "w-7 h-7 text-[#0066ff]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
      <path d="M8 21v-7a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v7" />
      <path d="M10 16h4v4h-4z" />
    </svg>
  );
}

function StorageBoxIcon({ className = "w-4 h-4 text-[#0066ff]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="m3 9 2.5-5.5A2 2 0 0 1 7.3 2.5h9.4a2 2 0 0 1 1.8 1L21 9" />
      <path d="M10 13h4" />
    </svg>
  );
}

function ArchivedBoxCardIcon({ className = "w-6 h-6 text-[#a855f7]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="m3 9 2.5-5.5A2 2 0 0 1 7.3 2.5h9.4a2 2 0 0 1 1.8 1L21 9" />
      <path d="M10 13h4" />
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

  // New storage & check device states
  const [returnToStorageOpen, setReturnToStorageOpen] = useState(false);
  const [isCheckDeviceOpen, setIsCheckDeviceOpen] = useState(true);
  const [checkMacInput, setCheckMacInput] = useState("");
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    found: boolean;
    isInStorage: boolean;
    searchedMac?: string;
    device?: IDevice;
    message?: string;
  } | null>(null);
  const [isQuickReturning, setIsQuickReturning] = useState(false);
  const [createInitialMac, setCreateInitialMac] = useState("");

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

  const handleCheckDevice = async () => {
    const term = checkMacInput.trim();
    if (!term) {
      toast.error("Please enter a MAC address");
      return;
    }
    setIsCheckingDevice(true);
    setCheckResult(null);
    try {
      const res = await checkDeviceByMac(term);
      setCheckResult(res);
      if (res.found) {
        if (res.isInStorage) {
          toast.success("Device is in Storage (Available)");
        } else {
          toast(`Device found: Status is ${res.device?.status}`);
        }
      } else {
        toast.error(res.message || "Device not found in system.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to check device";
      toast.error(msg);
    } finally {
      setIsCheckingDevice(false);
    }
  };

  const handleQuickReturn = async (deviceId: string) => {
    setIsQuickReturning(true);
    try {
      const res = await returnDeviceToStorage({ id: deviceId });
      if (res.success) {
        toast.success(res.message || "Device returned to storage!");
        router.refresh();
        if (checkMacInput) {
          const updated = await checkDeviceByMac(checkMacInput);
          setCheckResult(updated);
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to return device to storage";
      toast.error(msg);
    } finally {
      setIsQuickReturning(false);
    }
  };

  // Extract actual system counts from aggregated DB stats
  const antennaStats = stats.byType.find((t) => t.type === "antenna");
  const apStats = stats.byType.find((t) => t.type === "access-point");
  const routerStats = stats.byType.find((t) => t.type === "router");
  const switchStats = stats.byType.find((t) => t.type === "switch");

  const antennaOnline = antennaStats?.active ?? 0;
  const antennaStorage = antennaStats?.available ?? 0;

  const apOnline = apStats?.active ?? 0;
  const apStorage = apStats?.available ?? 0;

  const routerCount = routerStats?.count ?? 0;
  const routerOnline = routerStats?.active ?? 0;
  const routerStorage = routerStats?.available ?? 0;

  const switchOnline = switchStats?.active ?? 0;
  const switchStorage = switchStats?.available ?? 0;

  const totalStorage = stats.availableDevices ?? 0;

  // Server & Core Infrastructure actual DB stats
  const totalServers = stats.serverStats?.totalServers ?? 0;
  const activeServers = stats.serverStats?.activeServers ?? (totalServers || 0);
  const routersCount = stats.serverStats?.routersCount ?? routerCount;
  const frozenDevices = stats.inactiveDevices ?? 0;
  const archivedDevices = stats.retiredDevices ?? 0;

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
        <section className="space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Device Overview
            </h2>
          </div>

          {/* 2x2 Device Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Antenna Card */}
            <Link
              href="/devices/antenna"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-150 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#e2f7fc] dark:bg-sky-950/60 flex items-center justify-center shrink-0">
                <AntennaTowerCardIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#00bcd4] dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  Antenna
                </h3>
                <div className="flex items-center gap-6 sm:gap-8 mt-1.5">
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Online
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {antennaOnline.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Storage
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StorageBoxIcon className="w-4 h-4 text-[#0066ff] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {antennaStorage.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Access Point Card */}
            <Link
              href="/devices/access-point"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-150 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#f5eefc] dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                <Wifi className="w-7 h-7 sm:w-8 sm:h-8 text-[#9333ea] dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Access Point
                </h3>
                <div className="flex items-center gap-6 sm:gap-8 mt-1.5">
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Online
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {apOnline.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Storage
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StorageBoxIcon className="w-4 h-4 text-[#0066ff] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {apStorage.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Router Card */}
            <Link
              href="/devices/router"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-150 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#eaf4fd] dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                <RouterCardIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#0066ff] dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Router
                </h3>
                <div className="flex items-center gap-6 sm:gap-8 mt-1.5">
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Online
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {routerOnline.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Storage
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StorageBoxIcon className="w-4 h-4 text-[#0066ff] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {routerStorage.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Switch Card */}
            <Link
              href="/devices/switch"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-150 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#e8f8f0] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                <SwitchCardIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#10b981] dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Switch
                </h3>
                <div className="flex items-center gap-6 sm:gap-8 mt-1.5">
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Online
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {switchOnline.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium block">
                      Storage
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StorageBoxIcon className="w-4 h-4 text-[#0066ff] shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                        {switchStorage.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Frozen & Archived Devices Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Frozen Devices */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#e0f4ff] dark:bg-sky-950/60 flex items-center justify-center text-[#007aff] dark:text-sky-400 shrink-0">
                  <Snowflake className="w-6 h-6 text-[#007aff] dark:text-sky-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    Frozen Devices
                  </h3>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none mt-0.5">
                    {frozenDevices.toLocaleString()}
                  </div>
                </div>
              </div>
              <Link
                href="/devices/inactive?status=Inactive"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0066ff] hover:text-[#0055e0] transition-colors shrink-0 group"
              >
                <span>View Devices</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Archived Devices */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f8edfb] dark:bg-purple-950/60 flex items-center justify-center text-[#a855f7] dark:text-purple-400 shrink-0">
                  <ArchivedBoxCardIcon className="w-6 h-6 text-[#a855f7] dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    Archived Devices
                  </h3>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none mt-0.5">
                    {archivedDevices.toLocaleString()}
                  </div>
                </div>
              </div>
              <Link
                href="/devices/inactive?status=Retired"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0066ff] hover:text-[#0055e0] transition-colors shrink-0 group"
              >
                <span>View Devices</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Action Bar (Storage Counter & Buttons) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <StorageWarehouseIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#0066ff] shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                  Storage:
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {totalStorage.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              {canWriteDevices && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateInitialMac("");
                    openCreateFor("antenna");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#0066ff] hover:bg-[#0055e0] active:scale-[0.98] text-white shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Device</span>
                </button>
              )}

              {canWriteDevices && (
                <button
                  type="button"
                  onClick={() => setReturnToStorageOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-[#0066ff] text-[#0066ff] hover:bg-blue-50/60 dark:hover:bg-blue-950/40 active:scale-[0.98] transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Return to Storage</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCheckDeviceOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-[#0066ff] text-[#0066ff] ${
                  isCheckDeviceOpen
                    ? "bg-blue-50 dark:bg-blue-950/40 ring-2 ring-[#0066ff]/20"
                    : "hover:bg-blue-50/60 dark:hover:bg-blue-950/40"
                } active:scale-[0.98] transition-all`}
              >
                <Search className="w-4 h-4" />
                <span>Check Device</span>
              </button>
            </div>
          </div>

          {/* Check Device Card */}
          {isCheckDeviceOpen && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4 transition-all">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Check Device
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCheckDeviceOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  MAC Address
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={checkMacInput}
                    onChange={(e) => {
                      setCheckMacInput(e.target.value);
                      setCheckResult(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCheckDevice();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-mono uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckDevice}
                disabled={isCheckingDevice || !checkMacInput.trim()}
                className="w-full py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0055e0] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCheckingDevice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Check Device</span>
              </button>

              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                Enter a MAC address to check if it is already in storage.
              </p>

              {/* Result display */}
              {checkResult && (
                <div className="pt-2">
                  {checkResult.found && checkResult.device ? (
                    checkResult.isInStorage ? (
                      <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Device is in Storage (Available)</span>
                          </div>
                          <DeviceStatusBadge status={checkResult.device.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Device:</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {checkResult.device.deviceName || checkResult.device.deviceType} (#{checkResult.device.sl})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Type:</span>
                            <span className="capitalize font-medium">{checkResult.device.deviceType}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">MAC Address:</span>
                            <span className="font-mono text-[11px]">{checkResult.device.macAddress}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">IP Address:</span>
                            <span className="font-mono text-[11px]">{checkResult.device.ipAddress || "—"}</span>
                          </div>
                        </div>
                        <div className="pt-1 flex justify-end">
                          <Link
                            href={`/devices/${checkResult.device.deviceType}/${checkResult.device._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                          >
                            <span>View Device</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Device is NOT in Storage (Currently {checkResult.device.status})</span>
                          </div>
                          <DeviceStatusBadge status={checkResult.device.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Device:</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {checkResult.device.deviceName || checkResult.device.deviceType} (#{checkResult.device.sl})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Type:</span>
                            <span className="capitalize font-medium">{checkResult.device.deviceType}</span>
                          </div>
                          {checkResult.device.customerName && (
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-[10px]">Assigned Customer:</span>
                              <span className="font-medium">
                                {checkResult.device.customerName} {checkResult.device.apNumber ? `(AP: ${checkResult.device.apNumber})` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                        {canWriteDevices && (
                          <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-amber-200/60 dark:border-amber-800/40">
                            <span className="text-[11px] text-amber-800 dark:text-amber-300">
                              Need to return this device to inventory?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickReturn(checkResult.device!._id)}
                              disabled={isQuickReturning}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066ff] hover:bg-[#0055e0] text-white font-bold text-xs transition-colors"
                            >
                              {isQuickReturning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              <span>Return to Storage</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Device Not Found</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No device registered with MAC address: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{checkResult.searchedMac || checkMacInput}</span>. It is not currently in storage.
                      </p>
                      {canWriteDevices && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setCreateInitialMac(checkMacInput);
                              openCreateFor("antenna");
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0066ff] hover:bg-[#0055e0] text-white font-bold text-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add This Device to Storage</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
        onOpenChange={(v) => {
          setCreateDialogOpen(v);
          if (!v) setCreateInitialMac("");
        }}
        defaultDeviceType={createType}
        initialMacAddress={createInitialMac}
        hideDeviceType={false}
        onSuccess={() => {
          setCreateDialogOpen(false);
          setCreateInitialMac("");
          router.refresh();
        }}
      />

      {/* Return To Storage Dialog */}
      <ReturnToStorageDialog
        open={returnToStorageOpen}
        onOpenChange={setReturnToStorageOpen}
        onSuccess={() => {
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
