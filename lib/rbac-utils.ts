import {
  AdminRole,
  AppModule,
  GranularPermissionKey,
  GranularPermissions,
  ModulePermissions,
  PermissionLevel,
} from "@/types";

export const ALL_APP_MODULES: AppModule[] = [
  "dashboard",
  "devices",
  "customers",
  "billing",
  "catalog",
  "admins",
  "activity_logs",
  "settings",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, ModulePermissions> = {
  super_admin: {
    dashboard: "write",
    devices: "write",
    customers: "write",
    billing: "write",
    catalog: "write",
    admins: "write",
    activity_logs: "write",
    settings: "write",
  },
  developer: {
    dashboard: "read",
    devices: "write",
    customers: "read",
    billing: "read",
    catalog: "read",
    admins: "none",
    activity_logs: "read",
    settings: "none",
  },
  admin: {
    dashboard: "write",
    devices: "write",
    customers: "write",
    billing: "write",
    catalog: "write",
    admins: "read",
    activity_logs: "read",
    settings: "read",
  },
  editor: {
    dashboard: "read",
    devices: "write",
    customers: "write",
    billing: "read",
    catalog: "write",
    admins: "none",
    activity_logs: "none",
    settings: "none",
  },
  moderator: {
    dashboard: "read",
    devices: "write",
    customers: "read",
    billing: "none",
    catalog: "read",
    admins: "none",
    activity_logs: "none",
    settings: "none",
  },
  viewer: {
    dashboard: "read",
    devices: "read",
    customers: "read",
    billing: "read",
    catalog: "read",
    admins: "none",
    activity_logs: "none",
    settings: "none",
  },
  custom: {
    dashboard: "read",
    devices: "none",
    customers: "none",
    billing: "none",
    catalog: "none",
    admins: "none",
    activity_logs: "none",
    settings: "none",
  },
};

export const DEFAULT_GRANULAR_PERMISSIONS: Record<
  AdminRole,
  Record<GranularPermissionKey, boolean>
> = {
  super_admin: {
    device_add: true,
    device_view: true,
    device_edit: true,
    device_delete: true,
    device_approve: true,
    server_view: true,
    server_manage: true,
    customer_view: true,
    user_manage: true,
    report_view: true,
    setting_manage: true,
  },
  developer: {
    device_add: true,
    device_view: true,
    device_edit: true,
    device_delete: false,
    device_approve: true,
    server_view: true,
    server_manage: false,
    customer_view: true,
    user_manage: false,
    report_view: true,
    setting_manage: false,
  },
  admin: {
    device_add: true,
    device_view: true,
    device_edit: true,
    device_delete: false,
    device_approve: false,
    server_view: true,
    server_manage: false,
    customer_view: true,
    user_manage: false,
    report_view: true,
    setting_manage: false,
  },
  editor: {
    device_add: true,
    device_view: true,
    device_edit: true,
    device_delete: false,
    device_approve: false,
    server_view: true,
    server_manage: false,
    customer_view: true,
    user_manage: false,
    report_view: false,
    setting_manage: false,
  },
  moderator: {
    device_add: true,
    device_view: true,
    device_edit: true,
    device_delete: false,
    device_approve: false,
    server_view: true,
    server_manage: false,
    customer_view: true,
    user_manage: false,
    report_view: false,
    setting_manage: false,
  },
  viewer: {
    device_add: false,
    device_view: true,
    device_edit: false,
    device_delete: false,
    device_approve: false,
    server_view: true,
    server_manage: false,
    customer_view: true,
    user_manage: false,
    report_view: true,
    setting_manage: false,
  },
  custom: {
    device_add: false,
    device_view: true,
    device_edit: false,
    device_delete: false,
    device_approve: false,
    server_view: false,
    server_manage: false,
    customer_view: false,
    user_manage: false,
    report_view: false,
    setting_manage: false,
  },
};

export interface GranularPermissionMeta {
  key: GranularPermissionKey;
  label: string;
  category: "Devices" | "Servers" | "Customers & Reports" | "Administration";
  description: string;
}

export const GRANULAR_PERMISSIONS_LIST: GranularPermissionMeta[] = [
  {
    key: "device_add",
    label: "Add Device",
    category: "Devices",
    description: "Create and register new hardware devices in inventory",
  },
  {
    key: "device_view",
    label: "View Device",
    category: "Devices",
    description: "Browse device list, search, and view technical details",
  },
  {
    key: "device_edit",
    label: "Edit Device",
    category: "Devices",
    description: "Update device metadata, coordinates, and network configuration",
  },
  {
    key: "device_delete",
    label: "Delete Device",
    category: "Devices",
    description: "Permanently remove unlinked devices from the inventory",
  },
  {
    key: "device_approve",
    label: "Approve/Reject Device",
    category: "Devices",
    description: "Review pending devices and approve to Active or reject",
  },
  {
    key: "server_view",
    label: "View Server",
    category: "Servers",
    description: "Inspect hosting server infrastructure and connected clients",
  },
  {
    key: "server_manage",
    label: "Manage Server",
    category: "Servers",
    description: "Create, configure, and maintain core server hardware",
  },
  {
    key: "customer_view",
    label: "View Customer Information",
    category: "Customers & Reports",
    description: "Access subscriber records, phone numbers, and assigned equipment",
  },
  {
    key: "report_view",
    label: "View Reports",
    category: "Customers & Reports",
    description: "View system audit reports and analytics summaries",
  },
  {
    key: "user_manage",
    label: "Manage Users",
    category: "Administration",
    description: "Invite staff, configure roles, and adjust permissions",
  },
  {
    key: "setting_manage",
    label: "Manage Settings",
    category: "Administration",
    description: "Adjust system parameters and company configurations",
  },
];

/**
 * Resolves full effective permissions for a user given their role and custom overrides.
 */
export function resolveEffectivePermissions(
  role: AdminRole,
  customPerms?: Partial<ModulePermissions> | Map<string, string>
): ModulePermissions {
  if (role === "super_admin") {
    return { ...DEFAULT_ROLE_PERMISSIONS.super_admin };
  }

  const base = { ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.custom) };

  if (customPerms) {
    let customObj: Record<string, string> = {};
    if (customPerms instanceof Map) {
      customPerms.forEach((val, key) => {
        customObj[key] = val;
      });
    } else {
      customObj = customPerms as Record<string, string>;
    }

    for (const mod of ALL_APP_MODULES) {
      const val = customObj[mod] as PermissionLevel | undefined;
      if (val && ["none", "read", "write"].includes(val)) {
        base[mod] = val;
      }
    }
  }

  return base;
}

/**
 * Resolves effective granular permissions for a user given their role and custom overrides.
 */
export function resolveEffectiveGranularPermissions(
  role: AdminRole,
  customGranular?: GranularPermissions | Map<string, boolean>
): Record<GranularPermissionKey, boolean> {
  if (role === "super_admin") {
    return { ...DEFAULT_GRANULAR_PERMISSIONS.super_admin };
  }

  const base: Record<GranularPermissionKey, boolean> = {
    ...(DEFAULT_GRANULAR_PERMISSIONS[role] || DEFAULT_GRANULAR_PERMISSIONS.custom),
  };

  if (customGranular) {
    let customObj: Record<string, boolean> = {};
    if (customGranular instanceof Map) {
      customGranular.forEach((val, key) => {
        customObj[key] = Boolean(val);
      });
    } else {
      customObj = customGranular as Record<string, boolean>;
    }

    for (const key of Object.keys(base) as GranularPermissionKey[]) {
      if (typeof customObj[key] === "boolean") {
        base[key] = customObj[key];
      }
    }
  }

  // Developer must have the Approval/Reject permission (Requirement 9)
  if (role === "developer") {
    base.device_approve = true;
  }

  return base;
}

/**
 * Checks if a user has sufficient permission level for a module.
 * 'write' satisfies 'read' and 'write'.
 * 'read' satisfies 'read'.
 */
export function hasPermissionLevel(
  effectivePerms: ModulePermissions,
  module: AppModule,
  requiredLevel: PermissionLevel
): boolean {
  const current = effectivePerms[module] || "none";
  if (requiredLevel === "none") return true;
  if (requiredLevel === "read") return current === "read" || current === "write";
  if (requiredLevel === "write") return current === "write";
  return false;
}
