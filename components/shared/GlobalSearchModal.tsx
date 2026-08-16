"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Server, Radio, Wifi, Router as RouterIcon, Network, ExternalLink } from "lucide-react";
import { searchGlobalDevices } from "@/lib/actions/device.actions";
import { DeviceStatusBadge } from "@/components/devices/DeviceStatusBadge";
import type { IDevice } from "@/types";

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

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IDevice[]>([]);
  const [isPending, startTransition] = useTransition();

  // Reset when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Handle live search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchGlobalDevices(query);
          setResults(res);
        } catch {
          setResults([]);
        }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectDevice = (device: IDevice) => {
    onOpenChange(false);
    router.push(`/devices/${device.deviceType}/${device._id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <DialogTitle className="sr-only">Quick Device Search</DialogTitle>
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by SL, Device Name, IP, MAC, Model, Brand..."
            className="border-0 shadow-none focus-visible:ring-0 text-base bg-transparent p-0 placeholder:text-slate-400 dark:text-slate-100"
            autoFocus
          />
          {isPending && <Loader2 className="w-4 h-4 text-sky-500 animate-spin shrink-0" />}
          <kbd className="hidden sm:inline-block text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                Matching Devices ({results.length})
              </p>
              {results.map((device) => {
                const Icon = getDeviceIcon(device.deviceType);
                return (
                  <button
                    key={device._id}
                    onClick={() => handleSelectDevice(device)}
                    type="button"
                    className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                            #{device.sl}
                          </span>
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {device.deviceName}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({device.brand})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="capitalize">{device.deviceType}</span>
                          {device.ipAddress && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{device.ipAddress}</span>
                            </>
                          )}
                          {device.macAddress && (
                            <>
                              <span>•</span>
                              <span className="font-mono hidden sm:inline">{device.macAddress}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <DeviceStatusBadge status={device.status} />
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.trim() ? (
            <div className="text-center py-12 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No devices found matching &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">Try checking the IP, MAC, or Serial Number.</p>
            </div>
          ) : (
            <div className="py-8 px-4 text-center text-slate-400">
              <p className="text-xs">Type to instantly search across all infrastructure devices</p>
              <div className="flex justify-center gap-2 mt-3 text-[11px] text-slate-400">
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">SL Number</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">IP Address</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">MAC</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Model / Brand</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
