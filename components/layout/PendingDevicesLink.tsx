"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { getPendingDevicesCount } from "@/lib/actions/device.actions";
import { usePermissions } from "@/components/providers/PermissionContext";

export function PendingDevicesLink() {
  const { canRead } = usePermissions();
  const canViewDevices = canRead("devices");
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    if (!canViewDevices) return;
    try {
      setPendingCount(await getPendingDevicesCount());
    } catch (error) {
      console.error("Failed to load pending device count:", error);
    }
  }, [canViewDevices]);

  useEffect(() => {
    refreshPendingCount();
    const interval = window.setInterval(refreshPendingCount, 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshPendingCount();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshPendingCount]);

  if (!canViewDevices) return null;

  return (
    <Link
      href="/devices/pending"
      aria-label={`Pending device approvals: ${pendingCount}`}
      title="Pending device approvals"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <ClipboardCheck className="h-4 w-4" />
      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#0a0e1a]">
        {pendingCount > 99 ? "99+" : pendingCount}
      </span>
    </Link>
  );
}
