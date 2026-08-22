import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/database";
import Admin from "@/lib/database/models/admin.model";
import ActivityLog from "@/lib/database/models/activityLog.model";
import Notification from "@/lib/database/models/notification.model";
import {
  AdminRole,
  AppModule,
  PermissionLevel,
  IAdminUser,
} from "@/types";

import {
  ALL_APP_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  resolveEffectivePermissions,
  hasPermissionLevel,
} from "@/lib/rbac-utils";

export {
  ALL_APP_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  resolveEffectivePermissions,
  hasPermissionLevel,
};


/**
 * Fetches the currently authenticated admin profile with resolved effective permissions.
 * Auto-promotes the first user in the database to super_admin.
 */
export async function getCurrentAdminProfile(): Promise<IAdminUser | null> {
  try {
    await connectToDatabase();
    const user = await currentUser();
    if (!user) return null;

    const primaryEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (!primaryEmail) return null;

    // Check total admins
    const totalAdmins = await Admin.countDocuments();
    let adminDoc = await Admin.findOne({ email: primaryEmail });

    // Auto-create initial super_admin if DB is empty
    if (!adminDoc && totalAdmins === 0) {
      adminDoc = await Admin.create({
        email: primaryEmail,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || primaryEmail.split("@")[0],
        role: "super_admin",
        isActive: true,
        permissions: DEFAULT_ROLE_PERMISSIONS.super_admin,
      });
    }

    if (!adminDoc || !adminDoc.isActive) return null;

    // Auto-migrate legacy admin records without role to super_admin or admin
    if (!adminDoc.role) {
      adminDoc.role = totalAdmins === 1 ? "super_admin" : "admin";
      await adminDoc.save();
    }

    const effective = resolveEffectivePermissions(
      adminDoc.role as AdminRole,
      adminDoc.permissions
    );

    return {
      _id: String(adminDoc._id),
      email: adminDoc.email,
      name: adminDoc.name || "",
      role: adminDoc.role as AdminRole,
      permissions: effective,
      isActive: adminDoc.isActive,
      createdAt: adminDoc.createdAt,
      updatedAt: adminDoc.updatedAt,
    };
  } catch (error) {
    console.error("Error in getCurrentAdminProfile:", error);
    return null;
  }
}

/**
 * Enforces permission requirements on server actions. Throws an error if unauthorized.
 */
export async function requirePermission(
  module: AppModule,
  requiredLevel: PermissionLevel = "write"
): Promise<IAdminUser> {
  const profile = await getCurrentAdminProfile();
  if (!profile) {
    throw new Error("Unauthorized: Access is restricted to authorized administrators.");
  }

  if (profile.role === "super_admin") {
    return profile;
  }

  const effective = resolveEffectivePermissions(profile.role, profile.permissions);
  if (!hasPermissionLevel(effective, module, requiredLevel)) {
    throw new Error(
      `Forbidden: You do not have ${requiredLevel} permission for the "${module}" module.`
    );
  }

  return profile;
}

/**
 * Logs an administrative activity to the audit trail.
 * If the actor is NOT a super admin, automatically notifies all super admins.
 */
export async function logActivityAndNotify({
  actor,
  action,
  module,
  resourceId,
  resourceName,
  details,
  metadata,
  link,
}: {
  actor?: IAdminUser;
  action: string;
  module: AppModule | "system";
  resourceId?: string;
  resourceName?: string;
  details: string;
  metadata?: Record<string, unknown>;
  link?: string;
}) {
  try {
    await connectToDatabase();
    const currentActor = actor || (await getCurrentAdminProfile());
    if (!currentActor) return;

    // 1. Create Activity Log
    await ActivityLog.create({
      actorEmail: currentActor.email,
      actorRole: currentActor.role,
      action,
      module,
      resourceId: resourceId || "",
      resourceName: resourceName || "",
      details,
      metadata: metadata || {},
    });

    // 2. If actor is NOT a super_admin, create Notification for Super Admins
    if (currentActor.role !== "super_admin") {
      const readableModule =
        module.charAt(0).toUpperCase() + module.slice(1).replace("_", " ");
      const title = `${readableModule}: ${action.replace("_", " ")}`;
      const message = `${currentActor.email} (${currentActor.role}) performed ${action.toLowerCase()} on ${resourceName || module}: "${details}"`;

      await Notification.create({
        actorEmail: currentActor.email,
        actorRole: currentActor.role,
        action,
        module,
        title,
        message,
        link: link || "",
        readBy: [],
      });
    }
  } catch (error) {
    console.error("Failed to log activity or trigger notification:", error);
  }
}
