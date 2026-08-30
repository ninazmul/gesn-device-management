"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Globe,
  MapPin,
  Pencil,
  Server,
  Radio,
  Wifi,
  Router as RouterIcon,
  Network,
  Trash2,
  Cpu,
  Clock,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceStatusBadge } from "./DeviceStatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { DeviceStatusDialog } from "./DeviceStatusDialog";
import { DeviceFormDialog } from "./DeviceFormDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { deleteDevice } from "@/lib/actions/device.actions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "react-hot-toast";
import type { IDevice } from "@/types";
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

interface DeviceDetailsViewProps {
  device: IDevice;
}

export function DeviceDetailsView({ device }: DeviceDetailsViewProps) {
  const router = useRouter();
  const Icon = getDeviceIcon(device.deviceType);
  const { canWrite } = usePermissions();
  const canWriteDevices = canWrite("devices");

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await deleteDevice(device._id);
      toast.success(`Device #${device.sl} deleted successfully`);
      router.push(`/devices/${device.deviceType}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete device");
    } finally {
      setIsDeleting(false);
    }
  };

  const hasGps =
    device.gps?.latitude !== undefined &&
    device.gps?.longitude !== undefined &&
    !isNaN(device.gps.latitude) &&
    !isNaN(device.gps.longitude);

  const mapsUrl = hasGps
    ? `https://www.google.com/maps/search/?api=1&query=${device.gps?.latitude},${device.gps?.longitude}`
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Return Link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/devices/${device.deviceType}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {device.deviceType.charAt(0).toUpperCase() + device.deviceType.slice(1)}s</span>
        </Link>
        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-200/50 dark:border-sky-900/50">
          SL: #{device.sl}
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 to-blue-600/10 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40 shrink-0">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {device.deviceName}
                </h1>
                <DeviceStatusBadge status={device.status} size="lg" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {device.brand} • <span className="capitalize">{device.deviceType}</span> • Model: {device.model}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {canWriteDevices && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStatusOpen(true)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <Activity className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
                Change Status
              </Button>
            )}

            {canWriteDevices && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Edit Device
              </Button>
            )}

            {device.onlineLink && (
              <a
                href={
                  device.onlineLink.startsWith("http")
                    ? device.onlineLink
                    : `http://${device.onlineLink}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Management Portal
                </Button>
              </a>
            )}

            {canWriteDevices && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsDeleteOpen(true)}
                className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Delete Device"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grouped Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Network & Connectivity */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
            <Globe className="w-5 h-5 text-sky-500" />
            <h2>Network & Connectivity</h2>
          </div>

          <div className="space-y-4">


            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-xs text-slate-400 block">IPv4 Address</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {device.ipAddress || "Not configured"}
                </span>
              </div>
              {device.ipAddress && <CopyButton text={device.ipAddress} label="IP Address" />}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-xs text-slate-400 block">MAC Address</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {device.macAddress || "Not configured"}
                </span>
              </div>
              {device.macAddress && <CopyButton text={device.macAddress} label="MAC Address" />}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-400 block">Online Management URL</span>
              {device.onlineLink ? (
                <a
                  href={
                    device.onlineLink.startsWith("http")
                      ? device.onlineLink
                      : `http://${device.onlineLink}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline break-all inline-flex items-center gap-1.5 mt-1"
                >
                  <span>{device.onlineLink}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              ) : (
                <span className="text-xs text-slate-400 mt-1 block">No URL specified</span>
              )}
            </div>
          </div>
        </div>

        {/* Deployment & Location */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <h2>Deployment & Location</h2>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-400 block">Date of Activation</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                {formatDate(device.activationDate)}
              </span>
            </div>

            {/* Access Point specific: AP Number */}
            {device.deviceType === "access-point" && device.apNumber && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/30">
                <div>
                  <span className="text-xs text-violet-500 dark:text-violet-400 block">AP Number</span>
                  <span className="font-mono text-sm font-bold text-violet-900 dark:text-violet-100">
                    {device.apNumber}
                  </span>
                </div>
                <CopyButton text={device.apNumber} label="AP Number" />
              </div>
            )}

            {/* Access Point / Router: Customer Name */}
            {["access-point", "router"].includes(device.deviceType) && device.customerName && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/30">
                <div>
                  <span className="text-xs text-violet-500 dark:text-violet-400 block">Customer Name</span>
                  <span className="text-sm font-bold text-violet-900 dark:text-violet-100">
                    {device.customerName}
                  </span>
                </div>
                <CopyButton text={device.customerName} label="Customer Name" />
              </div>
            )}

            {/* Access Point / Router: Mobile Number */}
            {["access-point", "router"].includes(device.deviceType) && device.customerMobile && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/30">
                <div>
                  <span className="text-xs text-violet-500 dark:text-violet-400 block">Mobile Number</span>
                  <span className="font-mono text-sm font-bold text-violet-900 dark:text-violet-100">
                    {device.customerMobile}
                  </span>
                </div>
                <CopyButton text={device.customerMobile} label="Mobile Number" />
              </div>
            )}

            {/* Access Point / Router: GPS Link */}
            {["access-point", "router"].includes(device.deviceType) && device.gpsLink && (
              <div className="p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/30">
                <span className="text-xs text-violet-500 dark:text-violet-400 block">GPS Link</span>
                <a
                  href={device.gpsLink.startsWith("http") ? device.gpsLink : `https://${device.gpsLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline break-all inline-flex items-center gap-1.5 mt-1"
                >
                  <span>{device.gpsLink}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">GPS Coordinates</span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                    {hasGps
                      ? `${device.gps?.latitude}, ${device.gps?.longitude}`
                      : "No GPS recorded"}
                  </span>
                </div>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View Map</span>
                  </a>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-400 block">Serial Number (SL)</span>
              <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400 mt-1 block">
                #{device.sl}
              </span>
            </div>
          </div>
        </div>

        {/* Hardware & Description */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <h2>Hardware Specifications & Description</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-400 block">Brand Manufacturer</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {device.brand}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-400 block">Catalog Model</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {device.model}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-400 block">Classification</span>
              <span className="text-sm font-bold capitalize text-slate-900 dark:text-slate-100 mt-1 block">
                {device.deviceType}
              </span>
            </div>
          </div>

          {device.description && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <span className="text-xs text-slate-400 block">Notes / Description</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {device.description}
              </p>
            </div>
          )}

          {/* System Audit Information */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Created: {formatDateTime(device.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Last Updated: {formatDateTime(device.updatedAt)}
            </span>
          </div>
        </div>

        {/* SECTION FOR SWITCH: Port Capacity & Downlink Devices */}
        {device.deviceType === "switch" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Network className="w-5 h-5 text-sky-500" />
                <h2>Switch Port Allocation & Downlink Topology</h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {device.totalPorts || 0} Total Physical Ports
              </span>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block">Total Ports</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
                  {device.totalPorts || 0}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Hardware port capacity</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block">Active / Connected</span>
                <span className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-1 block">
                  {device.activePortsCount || 0}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Downlink devices plugged</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block">Available Ports</span>
                <span
                  className={`text-2xl font-extrabold mt-1 block ${
                    (device.availablePorts || 0) > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {device.availablePorts ?? 0}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  {(device.availablePorts || 0) > 0 ? "Free for uplink assignment" : "Switch capacity fully utilized"}
                </span>
              </div>
            </div>

            {/* Port Utilization Gauge */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">Port Capacity Utilization</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {device.totalPorts
                    ? Math.round(((device.activePortsCount || 0) / device.totalPorts) * 100)
                    : 0}
                  % Used
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden flex">
                <div
                  className={`h-full transition-all rounded-full ${
                    (device.activePortsCount || 0) >= (device.totalPorts || 0)
                      ? "bg-rose-500"
                      : (device.activePortsCount || 0) / (device.totalPorts || 1) > 0.75
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (device.totalPorts || 0) > 0
                        ? ((device.activePortsCount || 0) / (device.totalPorts || 1)) * 100
                        : 0
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Connected Downlink Devices List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Connected Downlink Devices ({device.connectedDevices?.length || 0})
              </h3>

              {device.connectedDevices && device.connectedDevices.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="py-3 px-4">SL #</th>
                        <th className="py-3 px-4">Device Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Brand & Model</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {device.connectedDevices.map((downlink) => (
                        <tr
                          key={downlink._id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                            #{downlink.sl}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {downlink.deviceName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {downlink.deviceType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {downlink.brand} • {downlink.model}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {downlink.ipAddress || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <DeviceStatusBadge status={downlink.status} size="sm" />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/devices/${downlink.deviceType}/${downlink._id}`}
                              className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Network className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No downlink devices currently connected
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                    When Antennas, Access Points, or Routers select this switch as their UpLink, they will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION FOR SERVER: Hosted Infrastructure Devices */}
        {device.deviceType === "server" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Server className="w-5 h-5 text-sky-500" />
                <h2>Hosted Devices & Infrastructure ({device.connectedDevices?.length || 0})</h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {device.connectedDevices?.length || 0} Connected
              </span>
            </div>

            {device.connectedDevices && device.connectedDevices.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-4">SL #</th>
                      <th className="py-3 px-4">Device Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Brand & Model</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {device.connectedDevices.map((downlink) => (
                      <tr
                        key={downlink._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          #{downlink.sl}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {downlink.deviceName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {downlink.deviceType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {downlink.brand} • {downlink.model}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {downlink.ipAddress || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <DeviceStatusBadge status={downlink.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/devices/${downlink.deviceType}/${downlink._id}`}
                            className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Server className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No devices currently linked to this server
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                  When devices select this server as their Hosting / Connected Server, they will appear here automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SECTION FOR DEVICES: Connected/Hosting Server */}
        {device.deviceType !== "server" && device.server && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Server className="w-5 h-5 text-sky-500" />
                <h2>Hosting Server Infrastructure</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">Assigned Server</span>
            </div>

            {typeof device.server === "object" && device.server ? (
              <div className="p-4 rounded-2xl bg-sky-50/30 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 shrink-0">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        #{(device.server as IDevice).sl}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {(device.server as IDevice).deviceName}
                      </h3>
                      <DeviceStatusBadge
                        status={(device.server as IDevice).status}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {(device.server as IDevice).brand} • {(device.server as IDevice).model}
                      {(device.server as IDevice).ipAddress &&
                        ` • IP: ${(device.server as IDevice).ipAddress}`}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/devices/server/${(device.server as IDevice)._id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-center shadow-sm"
                >
                  <span>View Server Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
                Connected to Server ID: {String(device.server)}
              </div>
            )}
          </div>
        )}

        {/* SECTION FOR DOWNLINK DEVICES: UpLink Switch Infrastructure */}
        {["antenna", "access-point", "router"].includes(device.deviceType) && device.uplinkSwitch && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Network className="w-5 h-5 text-indigo-500" />
                <h2>UpLink Infrastructure Connection</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">Upstream Parent Switch</span>
            </div>

            {typeof device.uplinkSwitch === "object" && device.uplinkSwitch ? (
              <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Network className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        #{(device.uplinkSwitch as IDevice).sl}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {(device.uplinkSwitch as IDevice).deviceName}
                      </h3>
                      <DeviceStatusBadge
                        status={(device.uplinkSwitch as IDevice).status}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {(device.uplinkSwitch as IDevice).brand} • {(device.uplinkSwitch as IDevice).model}
                      {(device.uplinkSwitch as IDevice).ipAddress &&
                        ` • IP: ${(device.uplinkSwitch as IDevice).ipAddress}`}
                      {(device.uplinkSwitch as IDevice).totalPorts &&
                        ` • ${(device.uplinkSwitch as IDevice).totalPorts} Port Switch`}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/devices/switch/${(device.uplinkSwitch as IDevice)._id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-center shadow-sm"
                >
                  <span>View Switch Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
                Connected to Switch ID: {String(device.uplinkSwitch)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Update Dialog */}
      <DeviceStatusDialog
        device={device}
        open={isStatusOpen}
        onOpenChange={setIsStatusOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Edit Form Dialog */}
      <DeviceFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        deviceToEdit={device}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Delete Device #${device.sl}?`}
        description={`Are you sure you want to permanently delete ${device.deviceName} (${device.brand})? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
