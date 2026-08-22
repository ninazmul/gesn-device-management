import {
  AdminRole,
  AppModule,
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

  if (role === "custom" && customPerms) {
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
