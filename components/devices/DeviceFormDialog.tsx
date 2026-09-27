"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plus,
  Network,
  Server,
  X,
  ScanBarcode,
  Camera,
  Wifi,
  Radio,
  Router as RouterIcon,
  Fingerprint,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createDevice,
  updateDevice,
  getAvailableSwitches,
  getAvailableServers,
} from "@/lib/actions/device.actions";
import { getBrands, getModels, getDeviceTypes } from "@/lib/actions/catalog.actions";
import { PRIMARY_DEVICE_TYPES, DEVICE_STATUSES } from "@/lib/constants";
import type {
  DeviceStatus,
  IDevice,
  IDeviceType,
  IBrand,
  IModel,
  ISwitchOption,
  IServerOption,
} from "@/types";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { useBarcodeGun } from "@/hooks/useBarcodeGun";
import type { ParsedBarcodeResult } from "@/lib/barcode";
import { usePermissions } from "@/components/providers/PermissionContext";
import { formatDisplaySL } from "@/lib/utils";

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDeviceType?: string;
  deviceToEdit?: IDevice | null;
  onSuccess?: () => void;
}

const SWITCH_PORT_PRESETS = [4, 8, 16, 24, 48, 52];

export function DeviceFormDialog({
  open,
  onOpenChange,
  defaultDeviceType = "antenna",
  deviceToEdit,
  onSuccess,
}: DeviceFormDialogProps) {
  const { isSuperAdmin, isDeveloper, canApproveDevice } = usePermissions();
  const isEditing = !!deviceToEdit;

  // Active Device Type
  const [deviceType, setDeviceType] = useState(
    deviceToEdit?.deviceType || defaultDeviceType
  );

  // Main Form Fields (Required based on deviceType)
  const [macAddress, setMacAddress] = useState(deviceToEdit?.macAddress || "");
  const [apNumber, setApNumber] = useState(deviceToEdit?.apNumber || "");
  const [server, setServer] = useState<string>(
    typeof deviceToEdit?.server === "object" && deviceToEdit.server
      ? (deviceToEdit.server as IDevice)._id
      : typeof deviceToEdit?.server === "string"
      ? deviceToEdit.server
      : ""
  );
  const [customerName, setCustomerName] = useState(deviceToEdit?.customerName || "");
  const [customerMobile, setCustomerMobile] = useState(deviceToEdit?.customerMobile || "");
  const [gpsLink, setGpsLink] = useState(deviceToEdit?.gpsLink || "");
  const [description, setDescription] = useState(deviceToEdit?.description || "");

  // More (Optional) Toggle & Fields
  const [showMore, setShowMore] = useState(false);
  const [brand, setBrand] = useState(deviceToEdit?.brand || "");
  const [model, setModel] = useState(deviceToEdit?.model || "");
  const [deviceName, setDeviceName] = useState(deviceToEdit?.deviceName || "");
  const [ipAddress, setIpAddress] = useState(deviceToEdit?.ipAddress || "");
  const [onlineLink, setOnlineLink] = useState(deviceToEdit?.onlineLink || "");
  const [totalPorts, setTotalPorts] = useState<string>(
    deviceToEdit?.totalPorts !== undefined ? String(deviceToEdit.totalPorts) : "8"
  );
  const [uplinkSwitch, setUplinkSwitch] = useState<string>(
    typeof deviceToEdit?.uplinkSwitch === "object" && deviceToEdit.uplinkSwitch
      ? (deviceToEdit.uplinkSwitch as IDevice)._id
      : typeof deviceToEdit?.uplinkSwitch === "string"
      ? deviceToEdit.uplinkSwitch
      : ""
  );
  const [latitude, setLatitude] = useState(
    deviceToEdit?.gps?.latitude !== undefined ? String(deviceToEdit.gps.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    deviceToEdit?.gps?.longitude !== undefined ? String(deviceToEdit.gps.longitude) : ""
  );
  const [activationDate, setActivationDate] = useState(
    deviceToEdit?.activationDate
      ? new Date(deviceToEdit.activationDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [frequency, setFrequency] = useState("");
  const [status, setStatus] = useState<DeviceStatus>(
    (deviceToEdit?.status as DeviceStatus) || "Pending"
  );

  // Catalog, Switch & Server Options
  const [availableTypes, setAvailableTypes] = useState<IDeviceType[]>([]);
  const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]);
  const [availableModels, setAvailableModels] = useState<IModel[]>([]);
  const [availableSwitches, setAvailableSwitches] = useState<ISwitchOption[]>([]);
  const [availableServers, setAvailableServers] = useState<IServerOption[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingSwitches, setLoadingSwitches] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Scanner modal states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetField, setScannerTargetField] = useState<string>("MAC Address");
  const [scannedFields, setScannedFields] = useState<Set<string>>(new Set());
  const [scanPendingResult, setScanPendingResult] = useState<{
    raw: string;
    parsed: ParsedBarcodeResult;
  } | null>(null);

  // Assign scan to field helper
  const assignScanToField = (
    value: string,
    field: "macAddress" | "ipAddress" | "deviceName"
  ) => {
    const highlighted = new Set<string>();
    if (field === "macAddress") {
      setMacAddress(value.toUpperCase());
      highlighted.add("macAddress");
      toast.success(`MAC set to: ${value.toUpperCase()}`);
    } else if (field === "ipAddress") {
      setIpAddress(value);
      highlighted.add("ipAddress");
      toast.success(`IP set to: ${value}`);
    } else if (field === "deviceName") {
      setDeviceName(value);
      highlighted.add("deviceName");
      toast.success(`Device Name set to: ${value}`);
    }
    setScannedFields(highlighted);
    setTimeout(() => setScannedFields(new Set()), 1400);
    setScanPendingResult(null);
  };

  // Handle scanned barcode / QR code
  const handleBarcodeScan = (result: ParsedBarcodeResult) => {
    const filledFields: string[] = [];
    const highlighted = new Set<string>();
    let hasAmbiguous = false;

    if (result.macAddress) {
      setMacAddress(result.macAddress);
      filledFields.push(`MAC: ${result.macAddress}`);
      highlighted.add("macAddress");
    }

    if (result.ipAddress) {
      setIpAddress(result.ipAddress);
      filledFields.push(`IP: ${result.ipAddress}`);
      highlighted.add("ipAddress");
    }

    if (result.model) {
      setModel(result.model);
      if (!deviceName || deviceName === model) {
        setDeviceName(result.model);
        highlighted.add("deviceName");
      }
      filledFields.push(`Model: ${result.model}`);
      highlighted.add("model");
    }

    if (result.brand && !brand) {
      setBrand(result.brand);
      filledFields.push(`Brand: ${result.brand}`);
      highlighted.add("brand");
    }

    // Fallback: raw value wasn't categorized at all
    if (!result.macAddress && !result.ipAddress && !result.model && result.raw) {
      const rawText = result.raw.trim();
      if (/^[0-9A-Fa-f:.-]{12,17}$/.test(rawText)) {
        const cleanedHex = rawText.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
        if (cleanedHex.length === 12) {
          const formatted = (cleanedHex.match(/.{1,2}/g) || []).join(":");
          setMacAddress(formatted);
          filledFields.push(`MAC: ${formatted}`);
          highlighted.add("macAddress");
        } else {
          hasAmbiguous = true;
        }
      } else {
        hasAmbiguous = true;
      }
    }

    if (hasAmbiguous) {
      const ambiguousValue = result.raw.trim();
      setScanPendingResult({ raw: ambiguousValue, parsed: result });
    }

    if (filledFields.length > 0) {
      setScannedFields(highlighted);
      setTimeout(() => setScannedFields(new Set()), 1400);
      if (!hasAmbiguous) {
        toast.success(`Scanned: ${filledFields.join(", ")}`);
      }
    }
  };

  useBarcodeGun({
    onScan: handleBarcodeScan,
    enabled: open,
  });

  const prevOpenRef = useRef(open);

  // Sync state on open/reset
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (!justOpened && !deviceToEdit) return;
    if (!open && !deviceToEdit) return;

    if (deviceToEdit) {
      setDeviceType(deviceToEdit.deviceType);
      setMacAddress(deviceToEdit.macAddress || "");
      setApNumber(deviceToEdit.apNumber || "");
      setServer(
        typeof deviceToEdit.server === "object" && deviceToEdit.server
          ? (deviceToEdit.server as IDevice)._id
          : typeof deviceToEdit.server === "string"
          ? deviceToEdit.server
          : ""
      );
      setCustomerName(deviceToEdit.customerName || "");
      setCustomerMobile(deviceToEdit.customerMobile || "");
      setGpsLink(deviceToEdit.gpsLink || "");
      setDescription(deviceToEdit.description || "");

      // More fields
      setBrand(deviceToEdit.brand || "");
      setModel(deviceToEdit.model || "");
      setDeviceName(deviceToEdit.deviceName || "");
      setIpAddress(deviceToEdit.ipAddress || "");
      setOnlineLink(deviceToEdit.onlineLink || "");
      setTotalPorts(
        deviceToEdit.totalPorts !== undefined ? String(deviceToEdit.totalPorts) : "8"
      );
      setUplinkSwitch(
        typeof deviceToEdit.uplinkSwitch === "object" && deviceToEdit.uplinkSwitch
          ? (deviceToEdit.uplinkSwitch as IDevice)._id
          : typeof deviceToEdit.uplinkSwitch === "string"
          ? deviceToEdit.uplinkSwitch
          : ""
      );
      setLatitude(
        deviceToEdit.gps?.latitude !== undefined ? String(deviceToEdit.gps.latitude) : ""
      );
      setLongitude(
        deviceToEdit.gps?.longitude !== undefined ? String(deviceToEdit.gps.longitude) : ""
      );
      setActivationDate(
        deviceToEdit.activationDate
          ? new Date(deviceToEdit.activationDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setStatus(deviceToEdit.status || "Pending");
      setShowMore(false); // Collapsed by default
    } else if (justOpened) {
      setDeviceType(defaultDeviceType);
      setMacAddress("");
      setApNumber("");
      setServer("");
      setCustomerName("");
      setCustomerMobile("");
      setGpsLink("");
      setDescription("");
      setBrand("");
      setModel("");
      setDeviceName("");
      setIpAddress("");
      setOnlineLink("");
      setTotalPorts(defaultDeviceType === "switch" ? "8" : "");
      setUplinkSwitch("");
      setLatitude("");
      setLongitude("");
      setActivationDate(new Date().toISOString().split("T")[0]);
      setFrequency("");
      setStatus("Pending");
      setShowMore(false); // Collapsed by default
    }
  }, [deviceToEdit, defaultDeviceType, open]);

  // Load available types, servers, and switches on open
  useEffect(() => {
    if (open) {
      getDeviceTypes(true).then((types) => {
        if (types && types.length > 0) {
          setAvailableTypes(types);
        } else {
          setAvailableTypes(
            PRIMARY_DEVICE_TYPES.map((p) => ({
              _id: p.slug,
              name: p.name,
              slug: p.slug,
              isProtected: p.isProtected,
              isActive: true,
            }))
          );
        }
      });

      setLoadingServers(true);
      getAvailableServers()
        .then(setAvailableServers)
        .finally(() => setLoadingServers(false));

      setLoadingSwitches(true);
      getAvailableSwitches()
        .then(setAvailableSwitches)
        .finally(() => setLoadingSwitches(false));
    }
  }, [open]);

  // Load Brands when deviceType changes
  useEffect(() => {
    if (!deviceType) return;
    setLoadingBrands(true);
    getBrands(deviceType, true)
      .then(setAvailableBrands)
      .finally(() => setLoadingBrands(false));
  }, [deviceType]);

  // Load Models when brand changes
  useEffect(() => {
    if (!brand || !deviceType) {
      setAvailableModels([]);
      return;
    }
    setLoadingModels(true);
    getModels({ deviceType, brand, onlyActive: true })
      .then(setAvailableModels)
      .finally(() => setLoadingModels(false));
  }, [brand, deviceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedType = deviceType.toLowerCase().trim();

    // 1. Common required field for all forms: MAC Address
    if (!macAddress.trim()) {
      toast.error("MAC Address is required");
      return;
    }

    // 2. Strict required fields per device type
    if (normalizedType === "access-point") {
      if (!apNumber.trim()) {
        toast.error("AP Number is required");
        return;
      }
      if (!server) {
        toast.error("Please select a Connected Server");
        return;
      }
      if (!customerName.trim()) {
        toast.error("Customer Name is required");
        return;
      }
      if (!customerMobile.trim()) {
        toast.error("Mobile Number is required");
        return;
      }
      if (!gpsLink.trim()) {
        toast.error("GPS Link is required");
        return;
      }
      if (!description.trim()) {
        toast.error("Description is required");
        return;
      }
    } else if (normalizedType === "router") {
      if (!server) {
        toast.error("Please select a Connected Server");
        return;
      }
      if (!customerName.trim()) {
        toast.error("Customer Name is required");
        return;
      }
      if (!customerMobile.trim()) {
        toast.error("Mobile Number is required");
        return;
      }
      if (!gpsLink.trim()) {
        toast.error("GPS Link is required");
        return;
      }
      if (!description.trim()) {
        toast.error("Description is required");
        return;
      }
    } else if (normalizedType === "switch") {
      if (!server) {
        toast.error("Please select a Connected Server");
        return;
      }
      if (!gpsLink.trim()) {
        toast.error("GPS Link / Location is required");
        return;
      }
      if (!description.trim()) {
        toast.error("Description is required");
        return;
      }
    } else if (normalizedType === "antenna") {
      if (!server) {
        toast.error("Please select a Connected Server");
        return;
      }
      if (!gpsLink.trim()) {
        toast.error("Location / GPS Link is required");
        return;
      }
      if (!description.trim()) {
        toast.error("Description is required");
        return;
      }
    } else {
      // General fallback (e.g. server or other custom types)
      if (!description.trim()) {
        toast.error("Description is required");
        return;
      }
    }

    try {
      setSubmitting(true);
      const combinedDescription = frequency.trim()
        ? `${description.trim()}\nFrequency: ${frequency.trim()}`
        : description.trim();

      const payload = {
        deviceType: normalizedType,
        macAddress: macAddress.trim(),
        server: normalizedType !== "server" && server ? server : null,
        description: combinedDescription,
        // AP & Customer fields
        apNumber: ["access-point"].includes(normalizedType) ? apNumber.trim() : undefined,
        customerName: ["access-point", "router"].includes(normalizedType) ? customerName.trim() : undefined,
        customerMobile: ["access-point", "router"].includes(normalizedType) ? customerMobile.trim() : undefined,
        gpsLink: gpsLink.trim() || undefined,
        // More (Optional) fields
        brand: brand.trim(),
        model: model.trim(),
        deviceName: deviceName.trim(),
        ipAddress: ipAddress.trim() || undefined,
        onlineLink: onlineLink.trim() || undefined,
        totalPorts:
          normalizedType === "switch" && totalPorts
            ? Number(totalPorts)
            : undefined,
        uplinkSwitch:
          ["antenna", "access-point", "router", "switch"].includes(normalizedType) && uplinkSwitch
            ? uplinkSwitch
            : null,
        gps: {
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
        },
        activationDate: activationDate ? new Date(activationDate) : new Date(),
        status,
      };

      if (isEditing && deviceToEdit) {
        await updateDevice(deviceToEdit._id, payload);
        toast.success(`Device #${formatDisplaySL(deviceToEdit.sl)} updated successfully`);
      } else {
        const created = await createDevice(payload);
        toast.success(
          created.status === "Pending"
            ? `Device #${formatDisplaySL(created.sl)} created — Pending approval`
            : `Device #${formatDisplaySL(created.sl)} created successfully`
        );
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save device");
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeName = (slug: string) => {
    const found = availableTypes.find((t) => t.slug === slug);
    return found ? found.name : slug;
  };

  const selectedSwitchData = availableSwitches.find((s) => s._id === uplinkSwitch);
  const selectedServerData = availableServers.find((s) => s._id === server);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 sm:gap-2.5">
                <span className="p-1.5 sm:p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="truncate">
                  {isEditing
                    ? `Edit Device #${formatDisplaySL(deviceToEdit?.sl)}`
                    : `Quick Add ${getTypeName(deviceType)}`}
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isEditing
                  ? "Update network specifications and deployment properties."
                  : "Simple, fast mobile-friendly entry. Fill required fields to submit."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Device Type Switcher */}
          {!isEditing && (
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Device Type <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">Selecting type updates required form fields</span>
              </div>
              <Select
                value={deviceType}
                onValueChange={(val) => {
                  setDeviceType(val);
                  setBrand("");
                  setModel("");
                  if (val === "switch" && !totalPorts) {
                    setTotalPorts("8");
                  }
                  if (!["antenna", "access-point", "router", "switch"].includes(val)) {
                    setUplinkSwitch("");
                  }
                  if (val === "server") {
                    setServer("");
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 font-semibold text-sm">
                  <SelectValue placeholder="Select Device Type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  {availableTypes.map((t) => (
                    <SelectItem key={t.slug} value={t.slug} className="py-2 font-medium">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MAIN REQUIRED FORM FIELDS (EXACT ORDER PER SPECIFICATION) */}
          {/* ========================================================================= */}
          <div className="space-y-3.5 bg-slate-50/50 dark:bg-slate-950/30 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                Main Form (All Required)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                All fields below are mandatory
              </span>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 1. ACCESS POINT FORM (Exact order: MAC, AP Number, Server, Customer Name, Mobile, GPS Link, Description) */}
            {/* ------------------------------------------------------------- */}
            {deviceType === "access-point" && (
              <div className="space-y-3">
                {/* 1. MAC Address */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. MAC Address <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Scan MAC
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="AA:BB:CC:DD:EE:FF"
                      value={macAddress}
                      onChange={(e) => setMacAddress(e.target.value)}
                      className={`h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase pr-10 ${
                        scannedFields.has("macAddress") ? "scan-field-highlight" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      title="Live Scan MAC Address"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors p-1"
                    >
                      <ScanBarcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. AP Number */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    2. AP Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. AP-001 or AP-North-05"
                    value={apNumber}
                    onChange={(e) => setApNumber(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-mono"
                  />
                </div>

                {/* 3. Connected Server */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>3. Connected Server <span className="text-rose-500">*</span></span>
                    {loadingServers && <span className="text-[10px] text-slate-400">Loading servers...</span>}
                  </Label>
                  <Select value={server} onValueChange={setServer}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                      <SelectValue placeholder="Select Connected Server" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-60">
                      {availableServers.map((srv) => (
                        <SelectItem key={srv._id} value={srv._id} className="py-2">
                          #{srv.sl} — {srv.deviceName} ({srv.brand} {srv.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Customer Name & 5. Mobile Number (Responsive 2-col on desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      4. Customer Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Md. Rahim Uddin"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      5. Mobile Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder="e.g. 01700000000"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>

                {/* 6. GPS Link */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    6. GPS Link <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="https://maps.google.com/?q=23.8103,90.4125"
                    value={gpsLink}
                    onChange={(e) => setGpsLink(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                  />
                </div>

                {/* 7. Description (Free Text) */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    7. Description (Free Text) <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Enter any relevant deployment info, location notes, or subscriber details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. ROUTER FORM (Exact order: MAC, Server, Customer Name, Mobile, GPS Link, Description) */}
            {/* ------------------------------------------------------------- */}
            {deviceType === "router" && (
              <div className="space-y-3">
                {/* 1. MAC Address */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. MAC Address <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Scan MAC
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="AA:BB:CC:DD:EE:FF"
                      value={macAddress}
                      onChange={(e) => setMacAddress(e.target.value)}
                      className={`h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase pr-10 ${
                        scannedFields.has("macAddress") ? "scan-field-highlight" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      title="Live Scan MAC Address"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors p-1"
                    >
                      <ScanBarcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Connected Server */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>2. Connected Server <span className="text-rose-500">*</span></span>
                    {loadingServers && <span className="text-[10px] text-slate-400">Loading servers...</span>}
                  </Label>
                  <Select value={server} onValueChange={setServer}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                      <SelectValue placeholder="Select Connected Server" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-60">
                      {availableServers.map((srv) => (
                        <SelectItem key={srv._id} value={srv._id} className="py-2">
                          #{srv.sl} — {srv.deviceName} ({srv.brand} {srv.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Customer Name & 4. Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      3. Customer Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Md. Rahim Uddin"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      4. Mobile Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder="e.g. 01700000000"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>

                {/* 5. GPS Link */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    5. GPS Link <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="https://maps.google.com/?q=23.8103,90.4125"
                    value={gpsLink}
                    onChange={(e) => setGpsLink(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                  />
                </div>

                {/* 6. Description (Free Text) */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    6. Description (Free Text) <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Enter any deployment info, customer package or location details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 3. SWITCH FORM (Exact order: MAC, Connected Server, GPS Link / Location, Description) */}
            {/* ------------------------------------------------------------- */}
            {deviceType === "switch" && (
              <div className="space-y-3">
                {/* 1. MAC Address */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. MAC Address <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Scan MAC
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="AA:BB:CC:DD:EE:FF"
                      value={macAddress}
                      onChange={(e) => setMacAddress(e.target.value)}
                      className={`h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase pr-10 ${
                        scannedFields.has("macAddress") ? "scan-field-highlight" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      title="Live Scan MAC Address"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors p-1"
                    >
                      <ScanBarcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Connected Server */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>2. Connected Server <span className="text-rose-500">*</span></span>
                    {loadingServers && <span className="text-[10px] text-slate-400">Loading servers...</span>}
                  </Label>
                  <Select value={server} onValueChange={setServer}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                      <SelectValue placeholder="Select Connected Server" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-60">
                      {availableServers.map((srv) => (
                        <SelectItem key={srv._id} value={srv._id} className="py-2">
                          #{srv.sl} — {srv.deviceName} ({srv.brand} {srv.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. GPS Link / Location */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. GPS Link / Location <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Rack A-02, Core Room or https://maps.google.com/..."
                    value={gpsLink}
                    onChange={(e) => setGpsLink(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                  />
                </div>

                {/* 4. Description (Free Text) */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    4. Description (Free Text) <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Enter switch distribution role, building location, or cabinet notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 4. ANTENNA FORM (Exact order: MAC, Connected Server, Location / GPS Link, Description) */}
            {/* ------------------------------------------------------------- */}
            {deviceType === "antenna" && (
              <div className="space-y-3">
                {/* 1. MAC Address */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. MAC Address <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Scan MAC
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="AA:BB:CC:DD:EE:FF"
                      value={macAddress}
                      onChange={(e) => setMacAddress(e.target.value)}
                      className={`h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase pr-10 ${
                        scannedFields.has("macAddress") ? "scan-field-highlight" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTargetField("MAC Address");
                        setScannerOpen(true);
                      }}
                      title="Live Scan MAC Address"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors p-1"
                    >
                      <ScanBarcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Connected Server */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>2. Connected Server <span className="text-rose-500">*</span></span>
                    {loadingServers && <span className="text-[10px] text-slate-400">Loading servers...</span>}
                  </Label>
                  <Select value={server} onValueChange={setServer}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                      <SelectValue placeholder="Select Connected Server" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-60">
                      {availableServers.map((srv) => (
                        <SelectItem key={srv._id} value={srv._id} className="py-2">
                          #{srv.sl} — {srv.deviceName} ({srv.brand} {srv.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Location / GPS Link */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. Location / GPS Link <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Tower 3 North or https://maps.google.com/?q=..."
                    value={gpsLink}
                    onChange={(e) => setGpsLink(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                  />
                </div>

                {/* 4. Description (Free Text) */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    4. Description (Free Text) <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Enter tower antenna sector coverage, height, azimuth, or technical notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 5. SERVER OR OTHER FORM */}
            {/* ------------------------------------------------------------- */}
            {!["access-point", "router", "switch", "antenna"].includes(deviceType) && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    1. MAC Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    2. Location / GPS Link
                  </Label>
                  <Input
                    placeholder="Data Center Rack 04 or GPS Link"
                    value={gpsLink}
                    onChange={(e) => setGpsLink(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. Description (Free Text) <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Enter server operational purpose and location..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SMALL EXPANDABLE BUTTON: More (Optional) */}
          {/* ========================================================================= */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMore((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-2xs"
            >
              {showMore ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>More (Optional)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {showMore ? "(click to collapse)" : "(Brand, Model, IP, Uplink, etc.)"}
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* MORE (OPTIONAL) SECTION - COLLAPSED BY DEFAULT */}
          {/* ========================================================================= */}
          {showMore && (
            <div className="space-y-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
                  Additional & Advanced Specifications (Optional)
                </span>
                <span className="text-[10px] text-slate-400">All fields below are optional</span>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Brand
                  </Label>
                  <Select
                    value={brand}
                    onValueChange={(val) => {
                      setBrand(val);
                      setModel("");
                    }}
                    disabled={loadingBrands}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs">
                      <SelectValue placeholder={loadingBrands ? "Loading..." : "Select Brand (Optional)"} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                      {availableBrands.map((b) => (
                        <SelectItem key={b._id} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Model
                  </Label>
                  {availableModels.length > 0 ? (
                    <Select
                      value={model}
                      onValueChange={(val) => {
                        setModel(val);
                        if (!deviceName || deviceName === model) {
                          setDeviceName(val);
                        }
                      }}
                      disabled={loadingModels}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs">
                        <SelectValue placeholder={loadingModels ? "Loading..." : "Select Model"} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                        {availableModels.map((m) => (
                          <SelectItem key={m._id} value={m.name}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="e.g. Rocket Prism 5AC"
                      value={model}
                      onChange={(e) => {
                        const val = e.target.value;
                        setModel(val);
                        if (!deviceName || deviceName === model) {
                          setDeviceName(val);
                        }
                      }}
                      className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                    />
                  )}
                </div>
              </div>

              {/* Device Name */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Device Name
                </Label>
                <Input
                  placeholder="e.g. Tower North Sector 1 or custom identifier"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                />
              </div>

              {/* IPv4 Address & Online Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    IPv4 Address
                  </Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Online Management Link
                  </Label>
                  <Input
                    placeholder="https://192.168.1.100"
                    value={onlineLink}
                    onChange={(e) => setOnlineLink(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              {/* Switch Port Capacity Configuration (When Switch) */}
              {deviceType === "switch" && (
                <div className="space-y-2 p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-sky-900 dark:text-sky-300">
                      Switch Port Capacity
                    </Label>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400">Total physical ports</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                    <Input
                      type="number"
                      min="1"
                      max="128"
                      placeholder="e.g. 8, 16, 24, 48"
                      value={totalPorts}
                      onChange={(e) => setTotalPorts(e.target.value)}
                      className="h-8 rounded-lg border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs font-semibold"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {SWITCH_PORT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTotalPorts(String(preset))}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                            totalPorts === String(preset)
                              ? "bg-sky-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {preset}P
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Uplink Switch Assignment (For Antenna, AP, Router, Switch) */}
              {["antenna", "access-point", "router", "switch"].includes(deviceType) && (
                <div className="space-y-2 p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                        Uplink Switch Assignment
                      </Label>
                    </div>
                    {uplinkSwitch && (
                      <button
                        type="button"
                        onClick={() => setUplinkSwitch("")}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-medium inline-flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Detach
                      </button>
                    )}
                  </div>
                  <Select value={uplinkSwitch} onValueChange={setUplinkSwitch} disabled={loadingSwitches}>
                    <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs">
                      <SelectValue
                        placeholder={
                          loadingSwitches
                            ? "Loading switches..."
                            : availableSwitches.length === 0
                            ? "No active switches found"
                            : "Select Uplink Switch (Optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-56">
                      {availableSwitches.map((sw) => (
                        <SelectItem key={sw._id} value={sw._id} className="py-1.5 text-xs">
                          #{sw.sl} — {sw.deviceName} ({sw.brand} {sw.model}) [{sw.availablePorts}/{sw.totalPorts} Free]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSwitchData && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 text-xs flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        #{selectedSwitchData.sl} {selectedSwitchData.deviceName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                        {selectedSwitchData.availablePorts} Ports Available
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Antenna Frequency / Tech info */}
              {deviceType === "antenna" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Frequency / Technical Specs
                  </Label>
                  <Input
                    placeholder="e.g. 5GHz 30dBi / MIMO 2x2"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                  />
                </div>
              )}

              {/* GPS Coordinates & Activation Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GPS Latitude
                  </Label>
                  <Input
                    placeholder="e.g. 23.8103"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GPS Longitude
                  </Label>
                  <Input
                    placeholder="e.g. 90.4125"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Date of Activation
                  </Label>
                  <Input
                    type="date"
                    value={activationDate}
                    onChange={(e) => setActivationDate(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              {/* Status Selection (Accessible to Super Admin / Developer or permitted staff) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status
                </Label>
                <Select value={status} onValueChange={(val) => setStatus(val as DeviceStatus)}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {DEVICE_STATUSES.filter(
                      (st) => isSuperAdmin || canApproveDevice || st !== "Active"
                    ).map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isSuperAdmin && !canApproveDevice && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    New devices submitted by staff will be saved as Pending for Super Admin / Developer approval.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl border-slate-200 dark:border-slate-800 h-10 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !macAddress.trim()}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs h-10 px-5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Device"
              )}
            </Button>
          </div>
        </form>

        {/* Live Camera Scanner Modal */}
        <BarcodeScannerModal
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={handleBarcodeScan}
          title="Scan Device Barcode / Sticker"
          description="Point your camera at the MAC barcode or sticker on the device."
          targetFieldLabel={scannerTargetField}
        />

        {/* Scan Result Field-Assignment Confirmation */}
        {scanPendingResult && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setScanPendingResult(null)}
            />
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center gap-2">
                  <ScanBarcode className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Assign Scanned Value
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScanPendingResult(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 py-3 space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Decoded Value
                  </p>
                  <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 break-all">
                      {scanPendingResult.raw}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose which field this scanned value should populate:
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => assignScanToField(scanPendingResult.raw, "macAddress")}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-100 transition-colors text-left"
                  >
                    <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                    MAC Address
                  </button>

                  <button
                    type="button"
                    onClick={() => assignScanToField(scanPendingResult.raw, "ipAddress")}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors text-left"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    IP Address
                  </button>

                  <button
                    type="button"
                    onClick={() => assignScanToField(scanPendingResult.raw, "deviceName")}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-300 text-xs font-semibold hover:bg-orange-100 transition-colors text-left"
                  >
                    <Wifi className="w-3.5 h-3.5 shrink-0" />
                    Device Name
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setScanPendingResult(null)}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
                >
                  Dismiss — discard value
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
