"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import {
  AdminRole,
  AppModule,
  GranularPermissionKey,
  IAdminUser,
  ModulePermissions,
  PermissionLevel,
} from "@/types";
import { resolveEffectiveGranularPermissions } from "@/lib/rbac-utils";

interface PermissionContextValue {
  admin: IAdminUser | null;
  role: AdminRole;
  isSuperAdmin: boolean;
  isEngineer: boolean;
  permissions: ModulePermissions;
  granularPermissions: Record<GranularPermissionKey, boolean>;
  hasPermission: (module: AppModule, requiredLevel: PermissionLevel) => boolean;
  canRead: (module: AppModule) => boolean;
  canWrite: (module: AppModule) => boolean;
  can: (action: GranularPermissionKey) => boolean;
  canApproveDevice: boolean;
  canApprovePendingDevice: boolean;
  canRestoreFrozenDevice: boolean;
  canDeleteDevice: boolean;
  canAddDevice: boolean;
  canEditDevice: boolean;
  canArchiveDevice: boolean;
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
  const isEngineer = role === "engineer";

  const permissions: ModulePermissions = useMemo(
    () => ({
      ...defaultPermissions,
      ...(admin?.permissions || {}),
    }),
    [admin?.permissions]
  );

  const granularPermissions: Record<GranularPermissionKey, boolean> = useMemo(
    () => resolveEffectiveGranularPermissions(role, admin?.granularPermissions),
    [role, admin?.granularPermissions]
  );

  const hasPermission = useCallback(
    (module: AppModule, requiredLevel: PermissionLevel): boolean => {
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
    },
    [isSuperAdmin, permissions]
  );

  const canRead = useCallback(
    (module: AppModule) => hasPermission(module, "read"),
    [hasPermission]
  );

  const canWrite = useCallback(
    (module: AppModule) => hasPermission(module, "write"),
    [hasPermission]
  );

  const can = useCallback(
    (action: GranularPermissionKey): boolean => {
      if (isSuperAdmin) return true;
      if (action === "device_approve" && isEngineer) return true;
      return Boolean(granularPermissions[action]);
    },
    [isSuperAdmin, isEngineer, granularPermissions]
  );

  const canApproveDevice = isSuperAdmin || isEngineer || can("device_approve");
  const canApprovePendingDevice = isSuperAdmin || isEngineer;
  const canRestoreFrozenDevice = role === "editor";
  const canDeleteDevice = isSuperAdmin || can("device_delete");
  const canAddDevice = isSuperAdmin || can("device_add");
  const canEditDevice = isSuperAdmin || can("device_edit");
  const canArchiveDevice = isSuperAdmin || can("device_archive");

  const value = useMemo(
    () => ({
      admin,
      role,
      isSuperAdmin,
      isEngineer,
      permissions,
      granularPermissions,
      hasPermission,
      canRead,
      canWrite,
      can,
      canApproveDevice,
      canApprovePendingDevice,
      canRestoreFrozenDevice,
      canDeleteDevice,
      canAddDevice,
      canEditDevice,
      canArchiveDevice,
    }),
    [
      admin,
      role,
      isSuperAdmin,
      isEngineer,
      permissions,
      granularPermissions,
      hasPermission,
      canRead,
      canWrite,
      can,
      canApproveDevice,
      canApprovePendingDevice,
      canRestoreFrozenDevice,
      canDeleteDevice,
      canAddDevice,
      canEditDevice,
      canArchiveDevice,
    ]
  );

  return (
    <PermissionContext.Provider value={value}>
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
