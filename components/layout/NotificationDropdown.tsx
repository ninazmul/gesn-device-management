"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, CheckCheck, ExternalLink, ShieldAlert, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSuperAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/actions/notification.actions";
import { usePermissions } from "@/components/providers/PermissionContext";
import { INotification } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { toast } from "react-hot-toast";

export function NotificationDropdown() {
  const { isSuperAdmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await getSuperAdminNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchNotifications();

    // Poll periodically every 30 seconds for real-time update
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!isSuperAdmin) {
    return null;
  }

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readBy: [...(n.readBy || []), "self"],
        }))
      );
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOneRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? { ...n, readBy: [...(n.readBy || []), "self"] }
            : n
        )
      );
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) fetchNotifications();
        }}
        aria-label="Notifications"
        className={`relative h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
          open ? "ring-2 ring-sky-500/20 bg-sky-50 dark:bg-slate-800" : ""
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#0a0e1a] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Staff Activity Alerts
              </span>
              {unreadCount > 0 && (
                <span className="bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="h-7 text-xs font-semibold text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 p-1"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center mx-auto text-sky-500 mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No non-super-admin activities have been recorded recently.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isRead =
                  item.readBy && item.readBy.length > 0;

                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      if (!isRead) handleMarkOneRead(item._id);
                    }}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left ${
                      !isRead
                        ? "bg-sky-50/40 dark:bg-sky-950/20"
                        : "opacity-85"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            By <span className="font-semibold text-slate-600 dark:text-slate-300">{item.actorEmail}</span> ({item.actorRole})
                          </span>

                          {item.link && (
                            <Link
                              href={item.link}
                              onClick={() => setOpen(false)}
                              className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                            >
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-center">
            <Link
              href="/activity-logs"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 inline-flex items-center gap-1"
            >
              View Full Audit Log &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
