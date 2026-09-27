"use client";

import React, { createContext, useContext } from "react";
import {
  AdminRole,
  AppModule,
  GranularPermissionKey,
  GranularPermissions,
  IAdminUser,
  ModulePermissions,
  PermissionLevel,
} from "@/types";
import {
  DEFAULT_GRANULAR_PERMISSIONS,
  resolveEffectiveGranularPermissions,
} from "@/lib/rbac-utils";

interface PermissionContextValue {
  admin: IAdminUser | null;
  role: AdminRole;
  isSuperAdmin: boolean;
  isDeveloper: boolean;
  permissions: ModulePermissions;
  granularPermissions: Record<GranularPermissionKey, boolean>;
  hasPermission: (module: AppModule, requiredLevel: PermissionLevel) => boolean;
  canRead: (module: AppModule) => boolean;
  canWrite: (module: AppModule) => boolean;
  can: (action: GranularPermissionKey) => boolean;
  canApproveDevice: boolean;
  canDeleteDevice: boolean;
  canAddDevice: boolean;
  canEditDevice: boolean;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(
  undefined
);

const defaultPermissions: ModulePermissions = {
  dashboard: "none",
  devices: "none",
  customers: "none",
  billing: "none",
  catalog: "none",
  admins: "none",
  activity_logs: "none",
  settings: "none",
};

export function PermissionProvider({
  admin,
  children,
}: {
  admin: IAdminUser | null;
  children: React.ReactNode;
}) {
  const role: AdminRole = admin?.role || "viewer";
  const isSuperAdmin = role === "super_admin";
  const isDeveloper = role === "developer";

  const permissions: ModulePermissions = {
    ...defaultPermissions,
    ...(admin?.permissions || {}),
  };

  const granularPermissions: Record<GranularPermissionKey, boolean> =
    resolveEffectiveGranularPermissions(role, admin?.granularPermissions);

  const hasPermission = (
    module: AppModule,
    requiredLevel: PermissionLevel
  ): boolean => {
    if (isSuperAdmin) return true;
    if (requiredLevel === "none") return true;

    const currentLevel = permissions[module] || "none";
    if (requiredLevel === "read") {
      return currentLevel === "read" || currentLevel === "write";
    }
    if (requiredLevel === "write") {
      return currentLevel === "write";
    }
    return false;
  };

  const canRead = (module: AppModule) => hasPermission(module, "read");
  const canWrite = (module: AppModule) => hasPermission(module, "write");

  const can = (action: GranularPermissionKey): boolean => {
    if (isSuperAdmin) return true;
    if (action === "device_approve" && isDeveloper) return true;
    return Boolean(granularPermissions[action]);
  };

  const canApproveDevice = isSuperAdmin || isDeveloper || can("device_approve");
  const canDeleteDevice = isSuperAdmin || can("device_delete");
  const canAddDevice = isSuperAdmin || can("device_add") || canWrite("devices");
  const canEditDevice = isSuperAdmin || can("device_edit") || canWrite("devices");

  return (
    <PermissionContext.Provider
      value={{
        admin,
        role,
        isSuperAdmin,
        isDeveloper,
        permissions,
        granularPermissions,
        hasPermission,
        canRead,
        canWrite,
        can,
        canApproveDevice,
        canDeleteDevice,
        canAddDevice,
        canEditDevice,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
