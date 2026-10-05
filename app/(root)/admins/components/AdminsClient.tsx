"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Edit2,
  Crown,
  KeyRound,
  Lock,
  UserCheck,
  Shield,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Terminal,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  addAdmin,
  removeAdmin,
  getAllAdmins,
  updateAdminRoleAndPermissions,
} from "@/lib/actions/admin.actions";
import { formatDate } from "@/lib/utils";
import {
  AdminRole,
  AppModule,
  GranularPermissionKey,
  IAdminUser,
  ModulePermissions,
  PermissionLevel,
} from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_GRANULAR_PERMISSIONS,
  GRANULAR_PERMISSIONS_LIST,
  resolveEffectiveGranularPermissions,
  ALL_APP_MODULES,
} from "@/lib/rbac-utils";

export interface RoleDetail {
  label: string;
  value: AdminRole;
  badge: string;
  color: string;
  border: string;
  bgLight: string;
  summary: string;
  desc: string;
  canDo: string[];
  cannotDo: string[];
}

const ROLE_OPTIONS: RoleDetail[] = [
  {
    label: "Super Admin",
    value: "super_admin",
    badge: "Super Admin",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    bgLight: "bg-amber-500/10",
    summary: "Root Owner & System Administrator",
    desc: "Unrestricted root access, manages staff & logs, receives activity alerts.",
    canDo: [
      "Manage all devices, hardware, routers, switches & servers",
      "Add, edit, delete subscriber customers & manage accounts",
      "Generate monthly invoices & update client payments",
      "Invite, edit roles, configure permissions, or remove staff",
      "Access comprehensive audit activity logs & raw JSON diffs",
      "Receive real-time bell alerts whenever other staff make modifications",
    ],
    cannotDo: [],
  },
  {
    label: "Engineer",
    value: "engineer",
    badge: "Engineer",
    color: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
    bgLight: "bg-indigo-500/10",
    summary: "Operational Engineer",
    desc: "Full operational access across the dashboard, devices, customers, billing, catalog, and logs.",
    canDo: [
      "Review, approve, and reject submitted devices (APs, Routers, Switches, Antennas)",
      "Add, edit, change status & delete devices and hardware",
      "Manage operational devices, customers, billing, and catalog data",
      "Receive real-time bell alerts when devices are submitted for review",
      "Inspect audit activity logs and system events",
    ],
    cannotDo: [
      "Cannot manage users, roles, permissions, or critical system settings",
      "Cannot grant additional permissions or override Super Admin authority",
    ],
  },
  {
    label: "Admin",
    value: "admin",
    badge: "Admin",
    color: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
    bgLight: "bg-sky-500/10",
    summary: "Super Admin Configured Access",
    desc: "No automatic access. The Super Admin assigns each dashboard section and action individually.",
    canDo: [
      "Use only the sections and actions explicitly assigned by the Super Admin",
    ],
    cannotDo: [
      "Cannot manage users, roles, or permissions",
      "Cannot grant additional permissions to self or others",
    ],
  },
  {
    label: "Editor",
    value: "editor",
    badge: "Editor",
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    bgLight: "bg-emerald-500/10",
    summary: "Device & Billing Operator",
    desc: "Can add devices, review pending submissions, approve them Online or reject them Frozen, and manage billing.",
    canDo: [
      "Review pending non-server devices and approve them Online or reject them Frozen",
      "Add new devices and freeze or archive active devices",
      "Manage permitted billing operations",
    ],
    cannotDo: [
      "Cannot manage users, roles, permissions, or critical settings",
      "Cannot perform actions not explicitly assigned to the Editor preset",
    ],
  },
  {
    label: "Moderator",
    value: "moderator",
    badge: "Moderator",
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    bgLight: "bg-blue-500/10",
    summary: "Customer & Billing Operator",
    desc: "Can view the dashboard, add customers, add devices, and manage billing.",
    canDo: [
      "View the dashboard and manage customer records",
      "Add new devices and manage permitted billing operations",
    ],
    cannotDo: [
      "Cannot freeze or archive devices unless the Super Admin grants that action",
      "Cannot manage users, roles, permissions, or system settings",
    ],
  },
  {
    label: "Viewer",
    value: "viewer",
    badge: "Viewer",
    color: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/30",
    bgLight: "bg-slate-500/10",
    summary: "Super Admin Configured Read-Only Access",
    desc: "The Super Admin chooses which sections and data are visible; all access is read-only.",
    canDo: ["View only sections explicitly authorized by the Super Admin"],
    cannotDo: [
      "Cannot create, edit, approve, reject, freeze, archive, or delete records",
      "Cannot manage users, roles, permissions, or system settings",
    ],
  },
  {
    label: "Custom Access",
    value: "custom",
    badge: "Custom",
    color: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    bgLight: "bg-purple-500/10",
    summary: "Granular Tailored Access",
    desc: "Granular per-section permissions customized individually.",
    canDo: [
      "Super admin configures custom access per module (None, Read, or Write)",
      "Can be granted specific write access to one section while hiding others",
    ],
    cannotDo: [
      "Access to unassigned sections is completely blocked and hidden from menu",
    ],
  },
];

const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: "Overview Dashboard",
  devices: "Devices Management",
  customers: "Customers",
  billing: "Billing & Invoices",
  catalog: "Device Catalog",
  admins: "Staff / Admins",
  activity_logs: "Activity Logs",
  settings: "Settings",
};

function GranularPermissionsEditor({
  perms,
  onChange,
}: {
  perms: Record<GranularPermissionKey, boolean>;
  onChange: (key: GranularPermissionKey, value: boolean) => void;
}) {
  const categories: Array<
    "Devices" | "Servers" | "Customers & Reports" | "Administration"
  > = ["Devices", "Servers", "Customers & Reports", "Administration"];

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            Granular Action Permissions
          </span>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Configure specific device, server, and administrative action grants.
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          Super Admin Config
        </span>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const list = GRANULAR_PERMISSIONS_LIST.filter(
            (item) => item.category === cat,
          );
          if (list.length === 0) return null;

          return (
            <div key={cat} className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {cat}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {list.map((item) => {
                  const active = Boolean(perms[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onChange(item.key, !active)}
                      className={`flex items-start justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200"
                          : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <div className="pr-1.5">
                        <span className="text-[11px] font-semibold block leading-tight">
                          {item.label}
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight block mt-0.5">
                          {item.description}
                        </span>
                      </div>
                      <span
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-0.5 ${
                          active
                            ? "bg-indigo-600"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            active ? "translate-x-3" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared form body — used by both mobile Sheet and desktop Dialog
// ─────────────────────────────────────────────────────────────────────────────
function AddAdminFormFields({
  newEmail,
  setNewEmail,
  newName,
  setNewName,
  newRole,
  handleRoleChangeForNew,
  customPerms,
  setCustomPerms,
  newGranularPerms,
  setNewGranularPerms,
  isSuperAdmin,
}: {
  newEmail: string;
  setNewEmail: (v: string) => void;
  newName: string;
  setNewName: (v: string) => void;
  newRole: AdminRole;
  handleRoleChangeForNew: (role: AdminRole) => void;
  customPerms: ModulePermissions;
  setCustomPerms: React.Dispatch<React.SetStateAction<ModulePermissions>>;
  newGranularPerms: Record<GranularPermissionKey, boolean>;
  setNewGranularPerms: React.Dispatch<
    React.SetStateAction<Record<GranularPermissionKey, boolean>>
  >;
  isSuperAdmin: boolean;
}) {
  return (
    <>
      {/* Email + Name — stacked on mobile, side-by-side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <Input
            type="email"
            required
            placeholder="admin@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="rounded-xl border-slate-200 dark:border-slate-700 text-sm h-11 sm:text-xs sm:h-9"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Full Name
          </label>
          <Input
            placeholder="e.g. John Doe"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-xl border-slate-200 dark:border-slate-700 text-sm h-11 sm:text-xs sm:h-9"
          />
        </div>
      </div>

      {/* Role Preset */}
      <div>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
          Role Preset
        </label>
        <Select
          value={newRole}
          onValueChange={(val) => handleRoleChangeForNew(val as AdminRole)}
        >
          <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 text-sm h-11 sm:text-xs sm:h-9">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                <div className="flex flex-col py-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-relaxed">
                    {opt.desc}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Role Capability Summary */}
      {(() => {
        const roleDetail = ROLE_OPTIONS.find((r) => r.value === newRole);
        if (!roleDetail) return null;
        return (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                {roleDetail.label} Capabilities:
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleDetail.bgLight} ${roleDetail.color} ${roleDetail.border}`}
              >
                {roleDetail.summary}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {roleDetail.desc}
            </p>
            <ul className="space-y-1.5 pt-1">
              {roleDetail.canDo.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {roleDetail.cannotDo.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 text-[11px] text-rose-500/80 dark:text-rose-400/80"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Module Permissions (admin / viewer / custom only) */}
      {["admin", "viewer", "custom"].includes(newRole) && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            {newRole === "viewer"
              ? "Viewer Section Access"
              : "Module Permissions"}
          </span>
          <div className="grid grid-cols-1 gap-2">
            {ALL_APP_MODULES.map((mod) => (
              <div
                key={mod}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {MODULE_LABELS[mod]}
                </span>
                <Select
                  value={customPerms[mod] || "none"}
                  onValueChange={(val) =>
                    setCustomPerms((prev) => ({
                      ...prev,
                      [mod]: val as PermissionLevel,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 w-28 rounded-lg text-[11px] font-semibold border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="read">Read Only</SelectItem>
                    {newRole !== "viewer" && (
                      <SelectItem value="write">Read & Write</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Granular Action Permissions */}
      {isSuperAdmin &&
        (newRole === "super_admin" ? (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <Crown className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <span>
              Super Administrators retain unrestricted, immutable access across
              all modules and actions.
            </span>
          </div>
        ) : (
          <GranularPermissionsEditor
            perms={newGranularPerms}
            onChange={(key, val) =>
              setNewGranularPerms((prev) => ({ ...prev, [key]: val }))
            }
          />
        ))}
    </>
  );
}

export default function AdminsClient({
  initialAdmins,
}: {
  initialAdmins: IAdminUser[];
}) {
  const {
    admin: currentLoggedInAdmin,
    canWrite,
    isSuperAdmin,
  } = usePermissions();
  const isMobile = useIsMobile();
  const [admins, setAdmins] = useState<IAdminUser[]>(initialAdmins);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<IAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(true);
  const [selectedRoleGuide, setSelectedRoleGuide] =
    useState<AdminRole>("super_admin");

  // Form states for Add Admin
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  const [customPerms, setCustomPerms] = useState<ModulePermissions>({
    ...DEFAULT_ROLE_PERMISSIONS.admin,
  });
  const [newGranularPerms, setNewGranularPerms] = useState<
    Record<GranularPermissionKey, boolean>
  >({
    ...DEFAULT_GRANULAR_PERMISSIONS.admin,
  });

  // Form states for Edit Admin
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AdminRole>("admin");
  const [editPerms, setEditPerms] = useState<ModulePermissions>({
    ...DEFAULT_ROLE_PERMISSIONS.admin,
  });
  const [editGranularPerms, setEditGranularPerms] = useState<
    Record<GranularPermissionKey, boolean>
  >({
    ...DEFAULT_GRANULAR_PERMISSIONS.admin,
  });

  const loadAdmins = useCallback(async () => {
    try {
      const data = await getAllAdmins();
      setAdmins(data.admins);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast.error("Failed to load admins");
    }
  }, []);

  const handleRoleChangeForNew = (role: AdminRole) => {
    setNewRole(role);
    setCustomPerms({ ...DEFAULT_ROLE_PERMISSIONS[role] });
    setNewGranularPerms({ ...DEFAULT_GRANULAR_PERMISSIONS[role] });
  };

  const handleRoleChangeForEdit = (role: AdminRole) => {
    setEditRole(role);
    setEditPerms({ ...DEFAULT_ROLE_PERMISSIONS[role] });
    setEditGranularPerms({ ...DEFAULT_GRANULAR_PERMISSIONS[role] });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error("Email address is required");
      return;
    }

    try {
      setIsLoading(true);
      await addAdmin({
        email: newEmail.trim(),
        name: newName.trim(),
        role: newRole,
        permissions: ["admin", "viewer", "custom"].includes(newRole)
          ? customPerms
          : undefined,
        granularPermissions:
          newRole === "super_admin" ? undefined : newGranularPerms,
      });
      toast.success("Administrator added successfully");
      setNewEmail("");
      setNewName("");
      setNewRole("admin");
      setNewGranularPerms({ ...DEFAULT_GRANULAR_PERMISSIONS.admin });
      setIsAddOpen(false);
      loadAdmins();
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Failed to add admin";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (admin: IAdminUser) => {
    setEditingAdmin(admin);
    setEditName(admin.name || "");
    setEditRole(admin.role);
    setEditPerms({
      ...DEFAULT_ROLE_PERMISSIONS[admin.role],
      ...(admin.permissions || {}),
    });
    setEditGranularPerms(
      resolveEffectiveGranularPermissions(
        admin.role,
        admin.granularPermissions,
      ),
    );
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      setIsLoading(true);
      await updateAdminRoleAndPermissions(editingAdmin._id, {
        name: editName.trim(),
        role: editRole,
        permissions: ["admin", "viewer", "custom"].includes(editRole)
          ? editPerms
          : undefined,
        granularPermissions:
          editRole === "super_admin" ? undefined : editGranularPerms,
      });
      toast.success("Role & permissions updated successfully");
      setEditingAdmin(null);
      loadAdmins();
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Failed to update permissions";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAdmin = async (admin: IAdminUser) => {
    if (
      admin.email.toLowerCase() === currentLoggedInAdmin?.email.toLowerCase()
    ) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (
      !confirm(`Are you sure you want to revoke access for ${admin.email}?`)
    ) {
      return;
    }

    try {
      await removeAdmin(admin._id);
      toast.success("Admin access removed successfully");
      loadAdmins();
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Failed to remove admin";
      toast.error(errMsg);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 w-fit">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Restricted Area
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Only Super Administrators can manage staff accounts and permissions.
          </p>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Crown className="w-3 h-3 text-rose-500" /> Super Admin
          </span>
        );
      case "engineer":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Terminal className="w-3 h-3 text-indigo-500" /> Engineer
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-3 h-3 text-blue-500" /> Admin
          </span>
        );
      case "editor":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <KeyRound className="w-3 h-3 text-emerald-500" /> Editor
          </span>
        );
      case "moderator":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <KeyRound className="w-3 h-3 text-amber-500" /> Moderator
          </span>
        );
      case "viewer":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Lock className="w-3 h-3 text-slate-400" /> Viewer
          </span>
        );
      case "custom":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <KeyRound className="w-3 h-3 text-purple-500" /> Custom
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Staff & Role Permissions
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control system access, assign roles, and configure granular module
              permissions &bull;{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {admins.length}
              </span>{" "}
              active staff
            </p>
          </div>
        </div>

        {canWrite("admins") && (
          <>
            {/* Single trigger button — drives shared isAddOpen state */}
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/10 rounded-xl w-full sm:w-auto text-sm sm:text-xs font-semibold h-11 sm:h-9"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Administrator
            </Button>

            {/* ── Mobile only: bottom Sheet (JS-gated — no CSS hide trick) ── */}
            {isMobile && (
              <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
                <SheetContent
                  side="bottom"
                  className="rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-0 h-[92dvh] flex flex-col"
                >
                  <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mb-3" />
                    <SheetTitle className="text-base font-bold text-slate-900 dark:text-slate-100 text-left">
                      Add New Staff Administrator
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    <AddAdminFormFields
                      newEmail={newEmail}
                      setNewEmail={setNewEmail}
                      newName={newName}
                      setNewName={setNewName}
                      newRole={newRole}
                      handleRoleChangeForNew={handleRoleChangeForNew}
                      customPerms={customPerms}
                      setCustomPerms={setCustomPerms}
                      newGranularPerms={newGranularPerms}
                      setNewGranularPerms={setNewGranularPerms}
                      isSuperAdmin={isSuperAdmin}
                    />
                  </div>
                  <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                    <Button
                      type="button"
                      onClick={
                        handleAddSubmit as unknown as React.MouseEventHandler
                      }
                      className="w-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl text-white font-semibold text-sm h-12"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                          Adding...
                        </>
                      ) : (
                        "Add Administrator"
                      )}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* ── Desktop only: centered Dialog (JS-gated) ── */}
            {!isMobile && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90dvh]">
                  <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Add New Staff Administrator
                    </DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={handleAddSubmit}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      <AddAdminFormFields
                        newEmail={newEmail}
                        setNewEmail={setNewEmail}
                        newName={newName}
                        setNewName={setNewName}
                        newRole={newRole}
                        handleRoleChangeForNew={handleRoleChangeForNew}
                        customPerms={customPerms}
                        setCustomPerms={setCustomPerms}
                        newGranularPerms={newGranularPerms}
                        setNewGranularPerms={setNewGranularPerms}
                        isSuperAdmin={isSuperAdmin}
                      />
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                      <Button
                        type="submit"
                        className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl text-white font-semibold text-xs"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                            Adding...
                          </>
                        ) : (
                          "Add Administrator"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ROLE PERMISSIONS & ACCESS GUIDE (COMPACT ACCORDION & TABS)                */}
      {/* ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 dark:from-slate-950/40 dark:via-slate-900 dark:to-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Role Permissions & Access Guide
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
                  6 Role Presets
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select any role below to view its specific capabilities,
                restrictions, and module permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRoleGuide(!showRoleGuide)}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold shrink-0"
            >
              {showRoleGuide ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1.5" /> Collapse Guide
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 mr-1.5" /> Expand Guide
                </>
              )}
            </Button>
          </div>
        </div>

        {showRoleGuide && (
          <div className="p-5 sm:p-6 space-y-5 bg-slate-50/40 dark:bg-slate-950/20">
            {/* Compact Role Selection Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {ROLE_OPTIONS.map((role) => {
                const isSelected = selectedRoleGuide === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRoleGuide(role.value)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? `${role.bgLight} ${role.color} border ${role.border} shadow-xs ring-2 ring-sky-500/20`
                        : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {role.value === "super_admin" && (
                      <Crown className="w-3.5 h-3.5" />
                    )}
                    {role.value === "engineer" && (
                      <Terminal className="w-3.5 h-3.5" />
                    )}
                    {role.value === "admin" && (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {role.value === "editor" && (
                      <Edit2 className="w-3.5 h-3.5" />
                    )}
                    {role.value === "moderator" && (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                    {role.value === "viewer" && (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    {role.value === "custom" && (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Role Interactive Card (High-Density 2-Column Layout) */}
            {(() => {
              const activeRole =
                ROLE_OPTIONS.find((r) => r.value === selectedRoleGuide) ||
                ROLE_OPTIONS[0];

              return (
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${activeRole.bgLight} ${activeRole.color} border ${activeRole.border}`}
                      >
                        {activeRole.value === "super_admin" && (
                          <Crown className="w-5 h-5" />
                        )}
                        {activeRole.value === "engineer" && (
                          <Terminal className="w-5 h-5" />
                        )}
                        {activeRole.value === "admin" && (
                          <ShieldCheck className="w-5 h-5" />
                        )}
                        {activeRole.value === "editor" && (
                          <Edit2 className="w-5 h-5" />
                        )}
                        {activeRole.value === "moderator" && (
                          <UserCheck className="w-5 h-5" />
                        )}
                        {activeRole.value === "viewer" && (
                          <Lock className="w-5 h-5" />
                        )}
                        {activeRole.value === "custom" && (
                          <KeyRound className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                            {activeRole.label}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${activeRole.bgLight} ${activeRole.color} ${activeRole.border}`}
                          >
                            {activeRole.summary}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {activeRole.desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Grid: Left (Capabilities & Restrictions), Right (Module Access Matrix) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Action Lists (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* What this role CAN do */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Authorized Capabilities
                        </span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeRole.canDo.map((item, idx) => (
                            <li
                              key={idx}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* What this role CANNOT do */}
                      {activeRole.cannotDo.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-500" />
                            Role Restrictions
                          </span>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeRole.cannotDo.map((item, idx) => (
                              <li
                                key={idx}
                                className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 leading-relaxed"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Module Access Level Breakdown (5 cols) */}
                    <div className="lg:col-span-5 space-y-2.5 bg-slate-50/70 dark:bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Module Permissions Breakdown
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {activeRole.value === "custom"
                            ? "Custom Matrix"
                            : "Default Preset"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {ALL_APP_MODULES.map((mod) => {
                          const level =
                            activeRole.value === "super_admin"
                              ? "write"
                              : activeRole.value === "custom"
                                ? "Configurable"
                                : DEFAULT_ROLE_PERMISSIONS[activeRole.value]?.[
                                    mod
                                  ] || "none";

                          return (
                            <div
                              key={mod}
                              className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs"
                            >
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                                {MODULE_LABELS[mod]}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                                  level === "write"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : level === "read"
                                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                      : level === "Configurable"
                                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {level === "write"
                                  ? "Read & Write"
                                  : level === "read"
                                    ? "Read Only"
                                    : level === "Configurable"
                                      ? "Custom"
                                      : "No Access"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      {/* Admins Table */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="border-slate-100 dark:border-slate-800">
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Administrator
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Role
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Effective Permissions
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Authorized Date
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-slate-400 py-10 text-sm"
                  >
                    No administrators registered
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => {
                  const isSelf =
                    admin.email.toLowerCase() ===
                    currentLoggedInAdmin?.email.toLowerCase();

                  return (
                    <TableRow
                      key={admin._id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            {admin.name || admin.email.split("@")[0]}
                            {isSelf && (
                              <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold px-1.5 py-0.2 rounded">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400">
                            {admin.email}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {getRoleBadge(admin.role)}
                      </TableCell>

                      <TableCell className="max-w-xs">
                        {admin.role === "super_admin" ? (
                          <span className="text-xs text-slate-500 font-medium italic">
                            Full Unrestricted Root Access
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {["engineer", "editor"].includes(admin.role) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                <Terminal className="w-3 h-3" /> Device
                                Approvals Authorized
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {ALL_APP_MODULES.map((mod) => {
                                const lvl =
                                  admin.permissions?.[mod] ||
                                  (admin.role !== "custom"
                                    ? DEFAULT_ROLE_PERMISSIONS[admin.role]?.[
                                        mod
                                      ]
                                    : "none") ||
                                  "none";
                                if (lvl === "none") return null;
                                return (
                                  <span
                                    key={mod}
                                    className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                                      lvl === "write"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                    }`}
                                  >
                                    {mod}:{lvl}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(admin.createdAt)}
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canWrite("admins") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg"
                              onClick={() => openEditModal(admin)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {canWrite("admins") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelf}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg disabled:opacity-30"
                              onClick={() => handleRemoveAdmin(admin)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Role & Permissions Dialog */}
      {editingAdmin && (
        <Dialog
          open={!!editingAdmin}
          onOpenChange={() => setEditingAdmin(null)}
        >
          <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Modify Role & Permissions
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Editing Account:</span>{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {editingAdmin.email}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Display Name
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign Role
                </label>
                <Select
                  value={editRole}
                  onValueChange={(val) =>
                    handleRoleChangeForEdit(val as AdminRole)
                  }
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {opt.desc}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Real-time Role Capability Summary in Edit Modal */}
              {(() => {
                const roleDetail = ROLE_OPTIONS.find(
                  (r) => r.value === editRole,
                );
                if (!roleDetail) return null;
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-sky-500" />
                        {roleDetail.label} Capabilities:
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleDetail.bgLight} ${roleDetail.color} ${roleDetail.border}`}
                      >
                        {roleDetail.summary}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {roleDetail.desc}
                    </p>
                    <ul className="space-y-1 pt-1">
                      {roleDetail.canDo.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {roleDetail.cannotDo.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] text-rose-500/80 dark:text-rose-400/80"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {["admin", "viewer", "custom"].includes(editRole) && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {editRole === "viewer"
                      ? "Viewer Section Access"
                      : "Module Permissions Matrix"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {ALL_APP_MODULES.map((mod) => (
                      <div
                        key={mod}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                      >
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {MODULE_LABELS[mod]}
                        </span>
                        <Select
                          value={editPerms[mod] || "none"}
                          onValueChange={(val) =>
                            setEditPerms((prev) => ({
                              ...prev,
                              [mod]: val as PermissionLevel,
                            }))
                          }
                        >
                          <SelectTrigger className="h-7 w-24 rounded-lg text-[11px] font-semibold border-slate-200 dark:border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl text-xs">
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="read">Read Only</SelectItem>
                            {editRole !== "viewer" && (
                              <SelectItem value="write">
                                Read & Write
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Granular Action Permissions (Configurable by Super Admin for Engineer and Staff) */}
              {isSuperAdmin &&
                (editRole === "super_admin" ? (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Crown className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Super Administrators retain unrestricted, immutable access
                      across all modules and actions.
                    </span>
                  </div>
                ) : (
                  <GranularPermissionsEditor
                    perms={editGranularPerms}
                    onChange={(key, val) =>
                      setEditGranularPerms((prev) => ({ ...prev, [key]: val }))
                    }
                  />
                ))}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl text-white font-semibold text-xs"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving
                      Changes...
                    </>
                  ) : (
                    "Save Role & Permissions"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
