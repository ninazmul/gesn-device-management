"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Server, Radio, Wifi, Router as RouterIcon, Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { usePermissions } from "@/components/providers/PermissionContext";

function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "server":
      return Server;
    case "antenna":
      return Radio;
    case "access-point":
      return Wifi;
    case "router":
      return RouterIcon;
    case "switch":
      return Network;
    default:
      return Network;
  }
}

interface DeviceSectionHeaderProps {
  typeSlug: string;
  typeName: string;
  total: number;
}

export function DeviceSectionHeader({
  typeSlug,
  typeName,
  total,
}: DeviceSectionHeaderProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const Icon = getDeviceIcon(typeSlug);
  const { canWrite } = usePermissions();
  const canWriteDevices = canWrite("devices");

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {typeName}s
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active inventory: <span className="font-bold text-slate-800 dark:text-slate-200">{total.toLocaleString()}</span> units deployed
            </p>
          </div>
        </div>

        {canWriteDevices && (
          <Button
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-md shadow-sky-600/10 shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add {typeName}
          </Button>
        )}
      </div>

      <DeviceFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        defaultDeviceType={typeSlug}
        onSuccess={() => {
          setIsAddOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
