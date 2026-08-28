"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Server,
  Radio,
  Wifi,
  Router as RouterIcon,
  Network,
  Plus,
  FileSpreadsheet,
  Download,
  UploadCloud,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { BulkImportDialog } from "@/components/shared/BulkImportDialog";
import { usePermissions } from "@/components/providers/PermissionContext";
import { getAllDevicesForExport, importDevicesBulk } from "@/lib/actions/device.actions";
import { exportToExcel, downloadTemplate } from "@/lib/excel";
import { toast } from "react-hot-toast";

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

const DEVICE_EXPORT_HEADERS = [
  "SL",
  "Device Name",
  "Device Type",
  "Brand",
  "Model",
  "IP Address",
  "MAC Address",
  "Serial Number",
  "Status",
  "Total Ports",
  "Online Link",
  "Description",
];

const DEVICE_TEMPLATE_HEADERS = [
  "Device Name",
  "Device Type",
  "Brand",
  "Model",
  "IP Address",
  "MAC Address",
  "Serial Number",
  "Status",
  "Total Ports",
  "Online Link",
  "Description",
];

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
  const searchParams = useSearchParams();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const Icon = getDeviceIcon(typeSlug);
  const { canWrite } = usePermissions();
  const canWriteDevices = canWrite("devices");

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const devices = await getAllDevicesForExport({
        deviceType: typeSlug,
        status: searchParams.get("status") || undefined,
        brand: searchParams.get("brand") || undefined,
        model: searchParams.get("model") || undefined,
        search: searchParams.get("search") || undefined,
      });

      if (devices.length === 0) {
        toast.error("No devices available to export.");
        return;
      }

      const rows = devices.map((d) => ({
        "SL": d.sl,
        "Device Name": d.deviceName,
        "Device Type": d.deviceType,
        "Brand": d.brand,
        "Model": d.model,
        "IP Address": d.ipAddress || "",
        "MAC Address": d.macAddress || "",
        "Serial Number": d.serialNumber || "",
        "Status": d.status,
        "Total Ports": d.totalPorts || "",
        "Online Link": d.onlineLink || "",
        "Description": d.description || "",
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      exportToExcel(
        rows,
        DEVICE_EXPORT_HEADERS,
        typeName,
        `${typeSlug}-inventory-${dateStr}.xlsx`
      );
      toast.success(`Exported ${devices.length} ${typeName.toLowerCase()} records!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export devices");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(
      DEVICE_TEMPLATE_HEADERS,
      {
        "Device Name": `${typeName} Main Node`,
        "Device Type": typeSlug,
        "Brand": "MikroTik",
        "Model": "CCR1036",
        "IP Address": "192.168.1.1",
        "MAC Address": "48:8F:5A:11:22:33",
        "Serial Number": "SN-98234719",
        "Status": "Active",
        "Total Ports": typeSlug === "switch" ? 24 : "",
        "Online Link": "https://192.168.1.1",
        "Description": "Installed at Core Rack",
      },
      `${typeSlug}-import-template.xlsx`
    );
    toast.success("Excel template downloaded!");
  };

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

        {/* Polished Actions Dropdown Menu */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-md shadow-sky-600/10 gap-1.5 h-10 px-4"
              >
                <span>Actions</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {canWriteDevices && (
                <>
                  <DropdownMenuLabel>Inventory Management</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Add {typeName}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                    <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Bulk Import (.xlsx)</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuLabel>Export & Templates</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Export to Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Download Template</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Add Device Dialog */}
      <DeviceFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        defaultDeviceType={typeSlug}
        onSuccess={() => {
          setIsAddOpen(false);
          router.refresh();
        }}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        title={`Bulk Import ${typeName}s`}
        description={`Upload an Excel or CSV file to register multiple ${typeName.toLowerCase()} units at once.`}
        templateHeaders={DEVICE_TEMPLATE_HEADERS}
        sampleRow={{
          "Device Name": `${typeName} Alpha-1`,
          "Device Type": typeSlug,
          "Brand": "MikroTik",
          "Model": "CCR2004",
          "IP Address": "10.0.10.5",
          "MAC Address": "BC:24:11:44:88:99",
          "Serial Number": "SN-884210",
          "Status": "Active",
          "Total Ports": typeSlug === "switch" ? 24 : "",
          "Online Link": "https://10.0.10.5",
          "Description": "Tower Node 1",
        }}
        templateFilename={`${typeSlug}-import-template.xlsx`}
        onImport={async (rows) => importDevicesBulk(rows, typeSlug)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
