"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  addDeviceToStorage,
} from "@/lib/actions/device.actions";
import type { DashboardStats, IDevice } from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";
import { formatDisplaySL, formatCurrency, formatDate } from "@/lib/utils";
import {
  CUSTOMER_SERVICE_TYPE_CONFIG,
  getStorageDeviceCategoryName,
  STORAGE_DEVICE_CATEGORIES,
} from "@/lib/constants";

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
// DEVICE ICONS — Realistic hardware-style
// ==========================================

/** Dish antenna icon (LiteBeam / dish-style) */
function AntennaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      {/* dish */}
      <ellipse cx="12" cy="13" rx="9" ry="5" fill="currentColor" opacity="0.15" />
      <path d="M3 13 Q12 4 21 13" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* feed arm */}
      <line x1="12" y1="13" x2="12" y2="8" stroke="currentColor" strokeWidth="2" />
      {/* mast */}
      <line x1="12" y1="13" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      {/* base */}
      <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Round ceiling Access Point (Grandstream-style) */
function AccessPointIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      {/* outer ring */}
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* inner ring */}
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* center dot */}
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      {/* mount point */}
      <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** TP-Link style router with 3 antennas */
function CustomRouterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      {/* antennas */}
      <line x1="7" y1="11" x2="5" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="11" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17" y1="11" x2="19" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* body */}
      <rect x="3" y="11" width="18" height="8" rx="2.5" fill="currentColor" />
      {/* LEDs */}
      <circle cx="7" cy="15" r="1" fill="white" />
      <circle cx="10.5" cy="15" r="1" fill="white" />
      <circle cx="14" cy="15" r="1" fill="white" />
      {/* WAN port indicator */}
      <rect x="16" y="13" width="3" height="4" rx="0.5" fill="white" opacity="0.5" />
    </svg>
  );
}

/** Network switch — front-facing port view */
function SwitchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      {/* chassis */}
      <rect x="1" y="7" width="22" height="10" rx="2" fill="currentColor" />
      {/* ports row 1 */}
      <rect x="3.5" y="9.5" width="2.5" height="3" rx="0.4" fill="white" opacity="0.9" />
      <rect x="7" y="9.5" width="2.5" height="3" rx="0.4" fill="white" opacity="0.9" />
      <rect x="10.5" y="9.5" width="2.5" height="3" rx="0.4" fill="white" opacity="0.9" />
      <rect x="14" y="9.5" width="2.5" height="3" rx="0.4" fill="white" opacity="0.9" />
      <rect x="17.5" y="9.5" width="2.5" height="3" rx="0.4" fill="white" opacity="0.9" />
      {/* ports row 2 */}
      <rect x="3.5" y="13.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.5" />
      <rect x="7" y="13.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.5" />
      <rect x="10.5" y="13.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.5" />
      <rect x="14" y="13.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.5" />
      <rect x="17.5" y="13.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.5" />
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

function ArchivedBoxCardIcon({ className = "w-5 h-5 text-[#a855f7]" }: { className?: string }) {
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

  // Storage & check device states
  const [returnToStorageOpen, setReturnToStorageOpen] = useState(false);
  const [returnInitialMac, setReturnInitialMac] = useState("");
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

  // Storage Add modal states
  const [storageAddOpen, setStorageAddOpen] = useState(false);
  const [storageAddMac, setStorageAddMac] = useState("");
  const [storageAddCategory, setStorageAddCategory] = useState("");
  const [isAddingToStorage, setIsAddingToStorage] = useState(false);
  const [storageAddResult, setStorageAddResult] = useState<{
    success: boolean;
    message: string;
    existingDevice?: { sl: string; deviceName: string; status: string; deviceType: string };
  } | null>(null);

  const handleStorageAdd = async () => {
    const mac = storageAddMac.trim();
    if (!mac) {
      toast.error("Please enter a MAC address");
      return;
    }
    if (!storageAddCategory) {
      toast.error("Please select a Device Category");
      return;
    }
    setIsAddingToStorage(true);
    setStorageAddResult(null);
    try {
      const res = await addDeviceToStorage(mac, storageAddCategory);
      setStorageAddResult(res);
      if (res.success) {
        toast.success(res.message);
        setStorageAddMac("");
        setStorageAddCategory("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add device";
      toast.error(msg);
      setStorageAddResult({ success: false, message: msg });
    } finally {
      setIsAddingToStorage(false);
    }
  };

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

  const openReturnToStorage = (macAddress = "") => {
    setReturnInitialMac(macAddress);
    setReturnToStorageOpen(true);
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
  const frozenDevices =
    (stats.inactiveDevices ?? 0) + (stats.rejectedDevices ?? 0);
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
        <section className="space-y-2.5">
          {/* Header row with column labels */}
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex-1">
              Device Overview
            </h2>
            {/* Column headers — aligned with the data columns below */}
            <div className="flex items-center shrink-0" style={{ minWidth: 0 }}>
              <span className="w-16 sm:w-20 text-center text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Online</span>
              <span className="w-16 sm:w-20 text-center text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Storage</span>
              <span className="w-12 sm:w-14" />
            </div>
          </div>

          {/* Compact Device List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {[
              {
                href: "/devices/antenna",
                label: "Antenna",
                online: antennaOnline,
                storage: antennaStorage,
                iconBg: "bg-[#e2f7fc] dark:bg-sky-950/60",
                iconColor: "text-[#00bcd4] dark:text-sky-400",
                hoverBorder: "hover:bg-sky-50/40 dark:hover:bg-sky-950/20",
                viewColor: "text-[#00bcd4] dark:text-sky-400",
                Icon: AntennaIcon,
              },
              {
                href: "/devices/access-point",
                label: "Access Point",
                online: apOnline,
                storage: apStorage,
                iconBg: "bg-[#f5eefc] dark:bg-purple-950/60",
                iconColor: "text-[#9333ea] dark:text-purple-400",
                hoverBorder: "hover:bg-purple-50/40 dark:hover:bg-purple-950/20",
                viewColor: "text-[#9333ea] dark:text-purple-400",
                Icon: AccessPointIcon,
              },
              {
                href: "/devices/router",
                label: "Router",
                online: routerOnline,
                storage: routerStorage,
                iconBg: "bg-[#eaf4fd] dark:bg-blue-950/60",
                iconColor: "text-[#0066ff] dark:text-blue-400",
                hoverBorder: "hover:bg-blue-50/40 dark:hover:bg-blue-950/20",
                viewColor: "text-[#0066ff] dark:text-blue-400",
                Icon: CustomRouterIcon,
              },
              {
                href: "/devices/switch",
                label: "Switch",
                online: switchOnline,
                storage: switchStorage,
                iconBg: "bg-[#e8f8f0] dark:bg-emerald-950/60",
                iconColor: "text-[#10b981] dark:text-emerald-400",
                hoverBorder: "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20",
                viewColor: "text-[#10b981] dark:text-emerald-400",
                Icon: SwitchIcon,
              },
            ].map(({ href, label, online, storage, iconBg, iconColor, hoverBorder, viewColor, Icon }) => (
              <div
                key={href}
                className={`flex items-center gap-2 px-3 py-2.5 sm:py-3 sm:px-4 ${hoverBorder} transition-colors`}
              >
                {/* Icon */}
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${iconColor}`} />
                </div>

                {/* Name — takes flexible space */}
                <span className="flex-1 min-w-0 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {label}
                </span>

                {/* Online count — fixed width, centered */}
                <div className="w-16 sm:w-20 flex items-center justify-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {online.toLocaleString()}
                  </span>
                </div>

                {/* Storage count — fixed width, centered */}
                <div className="w-16 sm:w-20 flex items-center justify-center gap-1 shrink-0">
                  <StorageBoxIcon className="w-3 h-3 text-[#0066ff] shrink-0" />
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {storage.toLocaleString()}
                  </span>
                </div>

                {/* View button — fixed width */}
                <Link
                  href={`${href}?status=Active`}
                  className={`w-12 sm:w-14 text-center text-xs font-bold ${viewColor} hover:underline shrink-0 flex items-center justify-end gap-0.5`}
                >
                  View
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>

          {/* Frozen & Archived Devices Row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Frozen Devices */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#e0f4ff] dark:bg-sky-950/60 flex items-center justify-center shrink-0">
                  <Snowflake className="w-4 h-4 text-[#007aff] dark:text-sky-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Frozen</div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-none">
                    {frozenDevices.toLocaleString()}
                  </div>
                </div>
              </div>
              <Link
                href="/devices/inactive"
                className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-[#0066ff] hover:text-[#0055e0] transition-colors shrink-0"
              >
                View<ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Archived Devices */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#f8edfb] dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                  <ArchivedBoxCardIcon className="w-4 h-4 text-[#a855f7] dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Archived</div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-none">
                    {archivedDevices.toLocaleString()}
                  </div>
                </div>
              </div>
              <Link
                href="/devices/inactive?status=Retired"
                className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-[#0066ff] hover:text-[#0055e0] transition-colors shrink-0"
              >
                View<ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Action Bar — single line: Storage: N [Add] [Return] [Check] */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-x-auto">
            {/* Storage count */}
            <div className="flex items-center gap-1.5 shrink-0 mr-1">
              <StorageBoxIcon className="w-4 h-4 text-[#0066ff] shrink-0" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">Storage:</span>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">{totalStorage.toLocaleString()}</span>
            </div>

            <div className="flex-1" />

            {/* Add button */}
            {canWriteDevices && (
              <button
                type="button"
                id="storage-add-btn"
                onClick={() => {
                  setStorageAddMac("");
                  setStorageAddCategory("");
                  setStorageAddResult(null);
                  setStorageAddOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs bg-[#0066ff] hover:bg-[#0055e0] active:scale-[0.97] text-white shadow-xs transition-all shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            )}

            {/* Return button */}
            {canWriteDevices && (
              <button
                type="button"
                id="storage-return-btn"
                onClick={() => openReturnToStorage()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs border border-[#0066ff] text-[#0066ff] hover:bg-blue-50/60 dark:hover:bg-blue-950/40 active:scale-[0.97] transition-all shrink-0 whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                Return
              </button>
            )}

            {/* Check button */}
            <button
              type="button"
              id="storage-check-btn"
              onClick={() => setIsCheckDeviceOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs border border-[#0066ff] text-[#0066ff] ${
                isCheckDeviceOpen
                  ? "bg-blue-50 dark:bg-blue-950/40"
                  : "hover:bg-blue-50/60 dark:hover:bg-blue-950/40"
              } active:scale-[0.97] transition-all shrink-0 whitespace-nowrap`}
            >
              <Search className="w-3 h-3" />
              Check
            </button>
          </div>

          {/* Storage Add Modal */}
          {storageAddOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setStorageAddOpen(false); setStorageAddResult(null); } }}>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#0066ff]" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Add to Storage</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStorageAddOpen(false); setStorageAddResult(null); setStorageAddCategory(""); }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* MAC Address Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    MAC Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="storage-add-mac-input"
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={storageAddMac}
                    onChange={(e) => { setStorageAddMac(e.target.value); setStorageAddResult(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleStorageAdd(); } }}
                    disabled={isAddingToStorage}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all disabled:opacity-60"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Enter the MAC address of the device to add to storage.</p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="storage-add-category"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                  >
                    Device Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="storage-add-category"
                    required
                    value={storageAddCategory}
                    onChange={(e) => {
                      setStorageAddCategory(e.target.value);
                      setStorageAddResult(null);
                    }}
                    disabled={isAddingToStorage}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all disabled:opacity-60"
                  >
                    <option value="" disabled>
                      Select Device Category
                    </option>
                    {STORAGE_DEVICE_CATEGORIES.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Result feedback */}
                {storageAddResult && (
                  <div className={`p-3 rounded-xl text-xs font-medium ${
                    storageAddResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                  }`}>
                    <div className="flex items-start gap-2">
                      {storageAddResult.success
                        ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      }
                      <span>{storageAddResult.message}</span>
                    </div>
                    {storageAddResult.existingDevice && (
                      <div className="mt-2 pt-2 border-t border-current/20 text-[10px] space-y-0.5 opacity-80">
                        <div>SL: #{storageAddResult.existingDevice.sl}</div>
                        <div>Name: {storageAddResult.existingDevice.deviceName}</div>
                        <div>Status: {storageAddResult.existingDevice.status}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="button"
                  id="storage-add-submit-btn"
                  onClick={handleStorageAdd}
                  disabled={isAddingToStorage || !storageAddMac.trim() || !storageAddCategory}
                  className="w-full py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0055e0] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingToStorage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add to Storage
                </button>
              </div>
            </div>
          )}

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
                  MAC Address <span className="text-red-500">*</span>
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
                Enter a MAC address to check the device category and current status.
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
                            <span className="text-slate-400 block text-[10px]">Category:</span>
                            <span className="font-medium">{getStorageDeviceCategoryName(checkResult.device.deviceType)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">MAC Address:</span>
                            <span className="font-mono text-[11px]">{checkResult.device.macAddress}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">Status:</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">In Storage</span>
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
                            <span>Device is not in Storage</span>
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
                            <span className="text-slate-400 block text-[10px]">Category:</span>
                            <span className="font-medium">{getStorageDeviceCategoryName(checkResult.device.deviceType)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">MAC Address:</span>
                            <span className="font-mono text-[11px]">{checkResult.device.macAddress}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">Status:</span>
                            <span className="font-semibold">{checkResult.device.status}</span>
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
                        {canWriteDevices &&
                          STORAGE_DEVICE_CATEGORIES.some(
                            (category) =>
                              category.slug === checkResult.device?.deviceType,
                          ) && (
                          <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-amber-200/60 dark:border-amber-800/40">
                            <span className="text-[11px] text-amber-800 dark:text-amber-300">
                              Need to return this device to inventory?
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                openReturnToStorage(checkResult.device!.macAddress || "")
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066ff] hover:bg-[#0055e0] text-white font-bold text-xs transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
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
                        <span>Device not found</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No device registered with MAC address: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{checkResult.searchedMac || checkMacInput}</span>. It is not currently in storage.
                      </p>
                      {canWriteDevices && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setStorageAddMac(checkResult.searchedMac || checkMacInput);
                              setStorageAddCategory("");
                              setStorageAddResult(null);
                              setStorageAddOpen(true);
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
        }}
        defaultDeviceType={createType}
        hideDeviceType={false}
        onSuccess={() => {
          setCreateDialogOpen(false);
          router.refresh();
        }}
      />

      {/* Return To Storage Dialog */}
      <ReturnToStorageDialog
        open={returnToStorageOpen}
        initialMac={returnInitialMac}
        onOpenChange={(open) => {
          setReturnToStorageOpen(open);
          if (!open) setReturnInitialMac("");
        }}
        onSuccess={() => {
          router.refresh();
          if (returnInitialMac) {
            checkDeviceByMac(returnInitialMac)
              .then(setCheckResult)
              .catch((err: unknown) => {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "Failed to refresh the device check",
                );
              });
          }
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
