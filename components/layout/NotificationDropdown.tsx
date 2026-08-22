"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, CheckCheck, ExternalLink, ShieldAlert, Sparkles, Clock, Eye, EyeOff } from "lucide-react";
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
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch only count on mount (lightweight badge update)
  // Full data fetched on demand when dropdown opens
  const fetchUnreadCount = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await getSuperAdminNotifications();
      // Only update count for badge — don't repopulate full list in background
      setUnreadCount(data.unreadCount);
      // Seed notifications only if list is empty (first load)
      setNotifications((prev) =>
        prev.length === 0 ? data.notifications : prev
      );
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [isSuperAdmin]);

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

  // On mount: single lightweight fetch for bell badge — no polling
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Refetch when tab regains visibility (user switches back to tab)
  // This replaces polling — zero CPU cost when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchUnreadCount]);


  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  if (!isSuperAdmin) return null;

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readBy: [...(n.readBy || []), "self"] }))
      );
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, readBy: [...(n.readBy || []), "self"] } : n
        )
      );
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  // Filter: by default show only unread, toggle to show all
  const unreadNotifications = notifications.filter(
    (n) => !n.readBy || n.readBy.length === 0
  );
  const displayedNotifications = showAll ? notifications : unreadNotifications;
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
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

        {/* Unread dot badge – compact dot when count ≤ 9, number when >9 */}
        {hasUnread && (
          unreadCount <= 9 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 ring-2 ring-white dark:ring-[#0a0e1a]" />
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#0a0e1a] animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )
        )}
      </Button>

      {open && (
        <>
          {/* Mobile Overlay Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Popover Card */}
          <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-[380px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {showAll ? "All Notifications" : "Unread Alerts"}
                </span>
                {hasUnread && (
                  <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 border border-rose-200/60 dark:border-rose-800/40">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Toggle All / Unread */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll((v) => !v)}
                  className="h-7 text-xs font-semibold text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 px-2"
                  title={showAll ? "Show only unread" : "Show all notifications"}
                >
                  {showAll ? (
                    <><EyeOff className="w-3 h-3 mr-1" /> Unread</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> All</>
                  )}
                </Button>

                {/* Mark all read */}
                {hasUnread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    className="h-7 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 px-2"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 px-3 pt-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  !showAll
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                Unread
                <span className={`font-bold ${!showAll ? "" : "opacity-60"}`}>
                  ({unreadNotifications.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  showAll
                    ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                All
                <span className={`font-bold ${showAll ? "" : "opacity-60"}`}>
                  ({notifications.length})
                </span>
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-[min(55vh,360px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 overscroll-contain">
              {displayedNotifications.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto text-emerald-500 mb-2">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {showAll ? "No notifications yet" : "All caught up!"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {showAll
                      ? "Activity logs will appear here."
                      : "No unread alerts — switch to \"All\" to view history."}
                  </p>
                  {!showAll && notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-2 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      View {notifications.length} read notification{notifications.length !== 1 ? "s" : ""}
                    </button>
                  )}
                </div>
              ) : (
                displayedNotifications.map((item) => {
                  const isRead = item.readBy && item.readBy.length > 0;
                  return (
                    <div
                      key={item._id}
                      onClick={() => {
                        if (!isRead) handleMarkOneRead(item._id);
                      }}
                      className={`p-3.5 transition-colors cursor-pointer text-left ${
                        !isRead
                          ? "bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                          : "opacity-70 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isRead
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}>
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[11px] font-bold truncate ${
                              isRead ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-200"
                            }`}>
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed break-words">
                            {item.message}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 min-w-0">
                              By{" "}
                              <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[110px] sm:max-w-[150px] inline-block align-bottom">
                                {item.actorEmail}
                              </span>{" "}
                              ({item.actorRole})
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              {!isRead && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkOneRead(item._id);
                                  }}
                                  className="text-[10px] font-semibold text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                  title="Mark as read"
                                >
                                  <CheckCheck className="w-3 h-3" />
                                </button>
                              )}
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
                        </div>

                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread of ${notifications.length} total`
                  : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""} total`}
              </span>
              <Link
                href="/activity-logs"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 inline-flex items-center gap-1"
              >
                Full Audit Log &rarr;
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
