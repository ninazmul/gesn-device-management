"use server";

import { currentUser } from "@clerk/nextjs/server";
import Admin from "@/lib/database/models/admin.model";
import { connectToDatabase } from "@/lib/database";

export const checkIsAdmin = async () => {
  try {
    await connectToDatabase();
    const user = await currentUser();
    
    if (!user) return false;

    const primaryEmail = user.emailAddresses[0]?.emailAddress;
    if (!primaryEmail) return false;

    // Check if there are any admins at all
    const totalAdmins = await Admin.countDocuments();
    
    // If no admins exist, auto-create this user as the first admin
    if (totalAdmins === 0) {
      await Admin.create({ email: primaryEmail.toLowerCase() });
      return true;
    }

    const admin = await Admin.findOne({ email: primaryEmail.toLowerCase() });
    return !!admin;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

export const addAdmin = async (email: string) => {
  try {
    await connectToDatabase();
    const user = await currentUser();
    
    if (!user) throw new Error("Not authenticated");
    
    const primaryEmail = user.emailAddresses[0]?.emailAddress;
    const isCurrentAdmin = await Admin.findOne({ email: primaryEmail?.toLowerCase() });
    
    if (!isCurrentAdmin) throw new Error("Not authorized to add admins");

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) throw new Error("Admin already exists");

    const newAdmin = await Admin.create({ email: email.toLowerCase() });
    return { success: true, admin: JSON.parse(JSON.stringify(newAdmin)) };
  } catch (error) {
    console.error("Error adding admin:", error);
    throw error;
  }
};

export const removeAdmin = async (adminId: string) => {
  try {
    await connectToDatabase();
    const user = await currentUser();
    
    if (!user) throw new Error("Not authenticated");
    
    const primaryEmail = user.emailAddresses[0]?.emailAddress;
    const isCurrentAdmin = await Admin.findOne({ email: primaryEmail?.toLowerCase() });
    
    if (!isCurrentAdmin) throw new Error("Not authorized to remove admins");

    // Don't allow removing yourself
    const adminToRemove = await Admin.findById(adminId);
    if (adminToRemove?.email === primaryEmail?.toLowerCase()) {
      throw new Error("Cannot remove yourself as admin");
    }

    await Admin.findByIdAndDelete(adminId);
    return { success: true };
  } catch (error) {
    console.error("Error removing admin:", error);
    throw error;
  }
};

export const getAllAdmins = async () => {
  try {
    await connectToDatabase();
    const user = await currentUser();
    
    if (!user) throw new Error("Not authenticated");
    
    const primaryEmail = user.emailAddresses[0]?.emailAddress;
    const isCurrentAdmin = await Admin.findOne({ email: primaryEmail?.toLowerCase() });
    
    if (!isCurrentAdmin) throw new Error("Not authorized to view admins");

    const admins = await Admin.find({}).sort({ createdAt: -1 }).lean();
    return { success: true, admins: JSON.parse(JSON.stringify(admins)) };
  } catch (error) {
    console.error("Error getting admins:", error);
    throw error;
  }
};
