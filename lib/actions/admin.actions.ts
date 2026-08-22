"use server";

import Admin from "@/lib/database/models/admin.model";
import { connectToDatabase } from "@/lib/database";
import {
  getCurrentAdminProfile,
  requirePermission,
  resolveEffectivePermissions,
  logActivityAndNotify,
} from "@/lib/auth-guard";
import { AdminRole, IAdminUser, ModulePermissions } from "@/types";
import { revalidatePath } from "next/cache";

export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const profile = await getCurrentAdminProfile();
    return !!profile;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

export const getCurrentAdmin = async (): Promise<IAdminUser | null> => {
  return await getCurrentAdminProfile();
};

export const getAllAdmins = async (): Promise<{ success: boolean; admins: IAdminUser[] }> => {
  try {
    await requirePermission("admins", "read");
    await connectToDatabase();

    const rawAdmins = await Admin.find({}).sort({ createdAt: -1 }).lean();

    const admins: IAdminUser[] = rawAdmins.map((a) => {
      const role = (a.role as AdminRole) || "admin";
      return {
        _id: String(a._id),
        email: a.email,
        name: a.name || "",
        role,
        permissions: resolveEffectivePermissions(role, a.permissions),
        isActive: a.isActive !== false,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });

    return { success: true, admins: JSON.parse(JSON.stringify(admins)) };
  } catch (error) {
    console.error("Error getting admins:", error);
    throw error;
  }
};

export const addAdmin = async (data: {
  email: string;
  name?: string;
  role?: AdminRole;
  permissions?: Partial<ModulePermissions>;
}) => {
  try {
    const actor = await requirePermission("admins", "write");
    await connectToDatabase();

    const normalizedEmail = data.email.toLowerCase().trim();
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) throw new Error("Administrator with this email already exists");

    const role: AdminRole = data.role || "admin";

    const newAdmin = await Admin.create({
      email: normalizedEmail,
      name: data.name?.trim() || "",
      role,
      permissions: data.permissions || {},
      isActive: true,
    });

    await logActivityAndNotify({
      actor,
      action: "CREATE_ADMIN",
      module: "admins",
      resourceId: String(newAdmin._id),
      resourceName: normalizedEmail,
      details: `Added new ${role} account for ${normalizedEmail}`,
    });

    revalidatePath("/admins");
    return { success: true, admin: JSON.parse(JSON.stringify(newAdmin)) };
  } catch (error) {
    console.error("Error adding admin:", error);
    throw error;
  }
};

export const updateAdminRoleAndPermissions = async (
  adminId: string,
  data: {
    name?: string;
    role: AdminRole;
    permissions?: Partial<ModulePermissions>;
    isActive?: boolean;
  }
) => {
  try {
    const actor = await requirePermission("admins", "write");
    await connectToDatabase();

    const targetAdmin = await Admin.findById(adminId);
    if (!targetAdmin) throw new Error("Administrator not found");

    // Safeguard: Check if demoting the last super admin
    if (targetAdmin.role === "super_admin" && data.role !== "super_admin") {
      const superAdminCount = await Admin.countDocuments({ role: "super_admin" });
      if (superAdminCount <= 1) {
        throw new Error("Cannot demote the only remaining Super Administrator.");
      }
    }

    if (data.name !== undefined) targetAdmin.name = data.name.trim();
    targetAdmin.role = data.role;
    if (data.permissions !== undefined) targetAdmin.permissions = data.permissions;
    if (data.isActive !== undefined) targetAdmin.isActive = data.isActive;

    await targetAdmin.save();

    await logActivityAndNotify({
      actor,
      action: "UPDATE_ADMIN_ROLE",
      module: "admins",
      resourceId: String(targetAdmin._id),
      resourceName: targetAdmin.email,
      details: `Updated role of ${targetAdmin.email} to ${data.role}`,
    });

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Error updating admin role:", error);
    throw error;
  }
};

export const removeAdmin = async (adminId: string) => {
  try {
    const actor = await requirePermission("admins", "write");
    await connectToDatabase();

    const adminToRemove = await Admin.findById(adminId);
    if (!adminToRemove) throw new Error("Administrator not found");

    // Don't allow removing yourself
    if (adminToRemove.email.toLowerCase() === actor.email.toLowerCase()) {
      throw new Error("Cannot remove your own administrator account.");
    }

    // Safeguard: Don't allow removing the last super admin
    if (adminToRemove.role === "super_admin") {
      const superAdminCount = await Admin.countDocuments({ role: "super_admin" });
      if (superAdminCount <= 1) {
        throw new Error("Cannot delete the only remaining Super Administrator.");
      }
    }

    await Admin.findByIdAndDelete(adminId);

    await logActivityAndNotify({
      actor,
      action: "DELETE_ADMIN",
      module: "admins",
      resourceId: adminId,
      resourceName: adminToRemove.email,
      details: `Removed admin access for ${adminToRemove.email}`,
    });

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Error removing admin:", error);
    throw error;
  }
};
