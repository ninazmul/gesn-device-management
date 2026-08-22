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
  DialogTrigger,
} from "@/components/ui/dialog";
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
  IAdminUser,
  ModulePermissions,
  PermissionLevel,
} from "@/types";
import { usePermissions } from "@/components/providers/PermissionContext";
import { DEFAULT_ROLE_PERMISSIONS, ALL_APP_MODULES } from "@/lib/rbac-utils";

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
    label: "Admin",
    value: "admin",
    badge: "Admin",
    color: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
    bgLight: "bg-sky-500/10",
    summary: "Business & Operations Lead",
    desc: "Full operational read & write across devices, billing & customers.",
    canDo: [
      "Add, edit, change status & delete devices and hardware",
      "Add, edit & remove customer records and subscription plans",
      "Generate monthly billing & record customer payment transactions",
      "Manage hardware catalog (taxonomies, brands, models)",
      "View staff member directory & view activity logs (read-only)",
    ],
    cannotDo: [
      "Cannot add, edit roles, or delete staff administrators",
      "Cannot configure custom permission matrices",
    ],
  },
  {
    label: "Editor",
    value: "editor",
    badge: "Editor",
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    bgLight: "bg-emerald-500/10",
    summary: "Content & Field Operator",
    desc: "Can add & modify devices, customers, catalog; read billing.",
    canDo: [
      "Add, edit & delete devices and update device operational status",
      "Add, edit & manage customer accounts and assignments",
      "Add and modify hardware catalog models and brands",
      "View billing invoices & customer payment statuses (read-only)",
    ],
    cannotDo: [
      "Cannot collect payments or generate monthly invoices",
      "Cannot access staff management, activity logs, or system settings",
    ],
  },
  {
    label: "Moderator",
    value: "moderator",
    badge: "Moderator",
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    bgLight: "bg-blue-500/10",
    summary: "Hardware Maintenance Tech",
    desc: "Device management focus; read-only on customers & catalog.",
    canDo: [
      "Full write access to devices (create, edit, change status, delete)",
      "View customer directories and assigned device links (read-only)",
      "View hardware catalog and taxonomies (read-only)",
    ],
    cannotDo: [
      "Cannot edit or delete customer records",
      "Cannot access billing, invoices, or payment collections",
      "Cannot access staff management or activity audit logs",
    ],
  },
  {
    label: "Viewer",
    value: "viewer",
    badge: "Viewer",
    color: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/30",
    bgLight: "bg-slate-500/10",
    summary: "Read-Only Auditor / Observer",
    desc: "Read-only access; cannot add, edit, or delete anything.",
    canDo: [
      "Browse and inspect devices, servers, and network topology",
      "Search, filter, and view customer profiles",
      "View billing records, invoice breakdowns, and payment statuses",
      "View device hardware catalog",
    ],
    cannotDo: [
      "Cannot create, edit, or delete any record or device",
      "Cannot collect payments or generate bills",
      "Cannot access staff management or audit logs",
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

export default function AdminsClient({
  initialAdmins,
}: {
  initialAdmins: IAdminUser[];
}) {
  const { admin: currentLoggedInAdmin, canWrite } = usePermissions();
  const [admins, setAdmins] = useState<IAdminUser[]>(initialAdmins);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<IAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(true);

  // Form states for Add Admin
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  const [customPerms, setCustomPerms] = useState<ModulePermissions>({
    ...DEFAULT_ROLE_PERMISSIONS.admin,
  });

  // Form states for Edit Admin
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AdminRole>("admin");
  const [editPerms, setEditPerms] = useState<ModulePermissions>({
    ...DEFAULT_ROLE_PERMISSIONS.admin,
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
  };

  const handleRoleChangeForEdit = (role: AdminRole) => {
    setEditRole(role);
    setEditPerms({ ...DEFAULT_ROLE_PERMISSIONS[role] });
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
        permissions: newRole === "custom" ? customPerms : undefined,
      });
      toast.success("Administrator added successfully");
      setNewEmail("");
      setNewName("");
      setNewRole("admin");
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
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      setIsLoading(true);
      await updateAdminRoleAndPermissions(editingAdmin._id, {
        name: editName.trim(),
        role: editRole,
        permissions: editRole === "custom" ? editPerms : undefined,
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
    if (admin.email.toLowerCase() === currentLoggedInAdmin?.email.toLowerCase()) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (!confirm(`Are you sure you want to revoke access for ${admin.email}?`)) {
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

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Crown className="w-3 h-3 text-rose-500" /> Super Admin
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
              Control system access, assign roles, and configure granular module permissions &bull;{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{admins.length}</span> active staff
            </p>
          </div>
        </div>

        {canWrite("admins") && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/10 rounded-xl w-full sm:w-auto text-xs font-semibold">
                <Plus className="mr-2 h-4 w-4" /> Add Administrator
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Add New Staff Administrator
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="admin@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Full Name
                    </label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Role Preset
                  </label>
                  <Select value={newRole} onValueChange={(val) => handleRoleChangeForNew(val as AdminRole)}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          <div className="flex flex-col py-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{opt.label}</span>
                            <span className="text-[10px] text-slate-400">{opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Real-time Role Capability Summary in Add Modal */}
                {(() => {
                  const roleDetail = ROLE_OPTIONS.find((r) => r.value === newRole);
                  if (!roleDetail) return null;
                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-sky-500" />
                          {roleDetail.label} Capabilities:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleDetail.bgLight} ${roleDetail.color} ${roleDetail.border}`}>
                          {roleDetail.summary}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {roleDetail.desc}
                      </p>
                      <ul className="space-y-1 pt-1">
                        {roleDetail.canDo.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {roleDetail.cannotDo.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px] text-rose-500/80 dark:text-rose-400/80">
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Granular Matrix for Custom Role */}
                {newRole === "custom" && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Custom Module Permissions
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
                            value={customPerms[mod] || "none"}
                            onValueChange={(val) =>
                              setCustomPerms((prev) => ({
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
                              <SelectItem value="write">Read & Write</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl text-white font-semibold text-xs"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...
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
      </div>

      {/* ========================================================================= */}
      {/* ROLE PERMISSIONS & ACCESS GUIDE SECTION                                   */}
      {/* ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 dark:from-slate-950/40 dark:via-slate-900 dark:to-slate-950/40">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Role Permissions & Access Guide
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
                  {ROLE_OPTIONS.length} Roles
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Understand what each staff role can access, add, modify, or delete across all system sections.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRoleGuide(!showRoleGuide)}
            className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold self-start sm:self-auto shrink-0"
          >
            {showRoleGuide ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 mr-1.5" /> Hide Role Guide
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1.5" /> View Role Guide
              </>
            )}
          </Button>
        </div>

        {showRoleGuide && (
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-950/30">
            {ROLE_OPTIONS.map((role) => (
              <div
                key={role.value}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4.5 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl ${role.bgLight} ${role.color} border ${role.border}`}>
                        {role.value === "super_admin" && <Crown className="w-4 h-4" />}
                        {role.value === "admin" && <ShieldCheck className="w-4 h-4" />}
                        {role.value === "editor" && <Edit2 className="w-4 h-4" />}
                        {role.value === "moderator" && <UserCheck className="w-4 h-4" />}
                        {role.value === "viewer" && <Lock className="w-4 h-4" />}
                        {role.value === "custom" && <KeyRound className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {role.label}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {role.summary}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${role.bgLight} ${role.color} ${role.border} shrink-0`}>
                      {role.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                    {role.desc}
                  </p>

                  {/* Capabilities List */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Capabilities:
                    </span>
                    <ul className="space-y-1">
                      {role.canDo.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Restrictions List */}
                  {role.cannotDo.length > 0 && (
                    <div className="mt-2.5 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Restrictions:
                      </span>
                      <ul className="space-y-1">
                        {role.cannotDo.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px] text-rose-600/90 dark:text-rose-400/90 leading-tight">
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Permissions Breakdown Footer */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                  {role.value === "super_admin" ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      ★ Unrestricted Root Super Admin
                    </span>
                  ) : role.value === "custom" ? (
                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                      Configured dynamically per administrator
                    </span>
                  ) : (
                    ALL_APP_MODULES.map((mod) => {
                      const lvl = DEFAULT_ROLE_PERMISSIONS[role.value]?.[mod] || "none";
                      if (lvl === "none") return null;
                      return (
                        <span
                          key={mod}
                          className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${
                            lvl === "write"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                              : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                          }`}
                        >
                          {mod}:{lvl}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
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
                  <TableCell colSpan={5} className="text-center text-slate-400 py-10 text-sm">
                    No administrators registered
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => {
                  const isSelf =
                    admin.email.toLowerCase() === currentLoggedInAdmin?.email.toLowerCase();

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
                          <span className="text-xs text-slate-400">{admin.email}</span>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">{getRoleBadge(admin.role)}</TableCell>

                      <TableCell className="max-w-xs">
                        {admin.role === "super_admin" ? (
                          <span className="text-xs text-slate-500 font-medium italic">
                            Full Unrestricted Root Access
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {ALL_APP_MODULES.map((mod) => {
                              const lvl = admin.permissions?.[mod] || "none";
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
        <Dialog open={!!editingAdmin} onOpenChange={() => setEditingAdmin(null)}>
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
                <Select value={editRole} onValueChange={(val) => handleRoleChangeForEdit(val as AdminRole)}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{opt.label}</span>
                          <span className="text-[10px] text-slate-400">{opt.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Real-time Role Capability Summary in Edit Modal */}
              {(() => {
                const roleDetail = ROLE_OPTIONS.find((r) => r.value === editRole);
                if (!roleDetail) return null;
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-sky-500" />
                        {roleDetail.label} Capabilities:
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleDetail.bgLight} ${roleDetail.color} ${roleDetail.border}`}>
                        {roleDetail.summary}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {roleDetail.desc}
                    </p>
                    <ul className="space-y-1 pt-1">
                      {roleDetail.canDo.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {roleDetail.cannotDo.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-rose-500/80 dark:text-rose-400/80">
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {editRole === "custom" && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Custom Module Permissions Matrix
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
                            <SelectItem value="write">Read & Write</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl text-white font-semibold text-xs"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Changes...
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
