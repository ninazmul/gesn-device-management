"use client";

import React, { createContext, useContext } from "react";
import {
  AdminRole,
  AppModule,
  IAdminUser,
  ModulePermissions,
  PermissionLevel,
} from "@/types";

interface PermissionContextValue {
  admin: IAdminUser | null;
  role: AdminRole;
  isSuperAdmin: boolean;
  permissions: ModulePermissions;
  hasPermission: (module: AppModule, requiredLevel: PermissionLevel) => boolean;
  canRead: (module: AppModule) => boolean;
  canWrite: (module: AppModule) => boolean;
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
  const permissions: ModulePermissions = {
    ...defaultPermissions,
    ...(admin?.permissions || {}),
  };

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

  return (
    <PermissionContext.Provider
      value={{
        admin,
        role,
        isSuperAdmin,
        permissions,
        hasPermission,
        canRead,
        canWrite,
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
