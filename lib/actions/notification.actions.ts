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

  if (!profile) {
    return { notifications: [], unreadCount: 0 };
  }

  const canViewAll =
    profile.role === "super_admin" || profile.role === "engineer";
  const audienceFilter = canViewAll
    ? {}
    : { recipientEmails: profile.email.toLowerCase() };
  const notifications = (await Notification.find(audienceFilter)
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()) as unknown as INotification[];

  const unreadCount = await Notification.countDocuments({
    ...audienceFilter,
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

  if (!profile) {
    return 0;
  }

  const canViewAll =
    profile.role === "super_admin" || profile.role === "engineer";
  return Notification.countDocuments({
    ...(canViewAll ? {} : { recipientEmails: profile.email.toLowerCase() }),
    readBy: { $ne: profile.email.toLowerCase() },
  });
}

// Export alias for clarity
export const getAdminNotifications = getSuperAdminNotifications;

/**
 * Marks a notification as read by an authorized admin audience member.
 */
export async function markNotificationAsRead(notificationId: string) {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile) {
    throw new Error(
      "Unauthorized: Access is restricted to authorized administrators.",
    );
  }

  const notification =
    await Notification.findById(notificationId).select("recipientEmails");
  const canViewAll =
    profile.role === "super_admin" || profile.role === "engineer";
  if (
    !notification ||
    (!canViewAll &&
      !notification.recipientEmails.includes(profile.email.toLowerCase()))
  ) {
    throw new Error("You do not have permission to read this notification.");
  }

  await Notification.findByIdAndUpdate(notificationId, {
    $addToSet: { readBy: profile.email.toLowerCase() },
  });

  return { success: true };
}

/**
 * Marks all notifications visible to the current admin as read.
 */
export async function markAllNotificationsAsRead() {
  await connectToDatabase();
  const profile = await getCurrentAdminProfile();

  if (!profile) {
    throw new Error(
      "Unauthorized: Access is restricted to authorized administrators.",
    );
  }

  const canViewAll =
    profile.role === "super_admin" || profile.role === "engineer";
  await Notification.updateMany(
    {
      ...(canViewAll ? {} : { recipientEmails: profile.email.toLowerCase() }),
      readBy: { $ne: profile.email.toLowerCase() },
    },
    { $addToSet: { readBy: profile.email.toLowerCase() } },
  );

  return { success: true };
}
