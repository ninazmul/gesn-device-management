"use server";

import { connectToDatabase } from "@/lib/database";
import Notification from "@/lib/database/models/notification.model";
import { getCurrentAdminProfile } from "@/lib/auth-guard";
import { INotification } from "@/types";

/**
 * Fetches notifications for super admins along with the unread count.
 */
export async function getSuperAdminNotifications() {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile || profile.role !== "super_admin") {
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

/**
 * Marks a single notification as read by the current super admin.
 */
export async function markNotificationAsRead(notificationId: string) {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Only Super Admins can manage notifications.");
  }

  await Notification.findByIdAndUpdate(notificationId, {
    $addToSet: { readBy: profile.email.toLowerCase() },
  });

  return { success: true };
}

/**
 * Marks all notifications as read for the current super admin.
 */
export async function markAllNotificationsAsRead() {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Only Super Admins can manage notifications.");
  }

  await Notification.updateMany(
    { readBy: { $ne: profile.email.toLowerCase() } },
    { $addToSet: { readBy: profile.email.toLowerCase() } }
  );

  return { success: true };
}
