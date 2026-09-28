"use server";

import { connectToDatabase } from "@/lib/database";
import Notification from "@/lib/database/models/notification.model";
import { getCurrentAdminProfile } from "@/lib/auth-guard";
import { INotification } from "@/types";

/**
 * Fetches notifications for super admins and engineers along with the unread count.
 */
export async function getSuperAdminNotifications() {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile || (profile.role !== "super_admin" && profile.role !== "engineer")) {
    return { notifications: [], unreadCount: 0 };
  }

  const notifications = (await Notification.find({})
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()) as unknown as INotification[];

  const unreadCount = await Notification.countDocuments({
    readBy: { $ne: profile.email.toLowerCase() },
  });

  return {
    notifications: JSON.parse(JSON.stringify(notifications)) as INotification[],
    unreadCount,
  };
}

/** Fetches only the bell-badge count; notification rows load when the menu opens. */
export async function getSuperAdminUnreadCount() {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile || (profile.role !== "super_admin" && profile.role !== "engineer")) {
    return 0;
  }

  return Notification.countDocuments({
    readBy: { $ne: profile.email.toLowerCase() },
  });
}

// Export alias for clarity
export const getAdminNotifications = getSuperAdminNotifications;

/**
 * Marks a single notification as read by the current super admin or engineer.
 */
export async function markNotificationAsRead(notificationId: string) {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile || (profile.role !== "super_admin" && profile.role !== "engineer")) {
    throw new Error("Only Super Admins and Engineers can manage notifications.");
  }

  await Notification.findByIdAndUpdate(notificationId, {
    $addToSet: { readBy: profile.email.toLowerCase() },
  });

  return { success: true };
}

/**
 * Marks all notifications as read for the current super admin or engineer.
 */
export async function markAllNotificationsAsRead() {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile || (profile.role !== "super_admin" && profile.role !== "engineer")) {
    throw new Error("Only Super Admins and Engineers can manage notifications.");
  }

  await Notification.updateMany(
    { readBy: { $ne: profile.email.toLowerCase() } },
    { $addToSet: { readBy: profile.email.toLowerCase() } }
  );

  return { success: true };
}
