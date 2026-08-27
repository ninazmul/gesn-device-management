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
import { Loader2, Plus, Network, X, ScanBarcode, Camera } from "lucide-react";
import { toast } from "react-hot-toast";
import { createDevice, updateDevice, getAvailableSwitches } from "@/lib/actions/device.actions";
import { getBrands, getModels, getDeviceTypes } from "@/lib/actions/catalog.actions";
import { PRIMARY_DEVICE_TYPES, DEVICE_STATUSES } from "@/lib/constants";
import type { DeviceStatus, IDevice, IDeviceType, IBrand, IModel, ISwitchOption } from "@/types";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { useBarcodeGun } from "@/hooks/useBarcodeGun";
import type { ParsedBarcodeResult } from "@/lib/barcode";

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
  const isEditing = Boolean(deviceToEdit);

  // Form State
  const [deviceType, setDeviceType] = useState(
    deviceToEdit?.deviceType || defaultDeviceType
  );
  const [brand, setBrand] = useState(deviceToEdit?.brand || "");
  const [model, setModel] = useState(deviceToEdit?.model || "");
  const [deviceName, setDeviceName] = useState(deviceToEdit?.deviceName || "");
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
  const [description, setDescription] = useState(deviceToEdit?.description || "");
  const [onlineLink, setOnlineLink] = useState(deviceToEdit?.onlineLink || "");
  const [serialNumber, setSerialNumber] = useState(deviceToEdit?.serialNumber || "");
  const [macAddress, setMacAddress] = useState(deviceToEdit?.macAddress || "");
  const [ipAddress, setIpAddress] = useState(deviceToEdit?.ipAddress || "");
  const [activationDate, setActivationDate] = useState(
    deviceToEdit?.activationDate
      ? new Date(deviceToEdit.activationDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [latitude, setLatitude] = useState(
    deviceToEdit?.gps?.latitude !== undefined ? String(deviceToEdit.gps.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    deviceToEdit?.gps?.longitude !== undefined ? String(deviceToEdit.gps.longitude) : ""
  );
  const [status, setStatus] = useState<DeviceStatus>(
    (deviceToEdit?.status as DeviceStatus) || "Active"
  );

  // Catalog & Switch Options
  const [availableTypes, setAvailableTypes] = useState<IDeviceType[]>([]);
  const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]);
  const [availableModels, setAvailableModels] = useState<IModel[]>([]);
  const [availableSwitches, setAvailableSwitches] = useState<ISwitchOption[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingSwitches, setLoadingSwitches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetField, setScannerTargetField] = useState<string>("Barcode / QR / MAC");
  // Tracks which form fields were just populated by scan (for glow animation)
  const [scannedFields, setScannedFields] = useState<Set<string>>(new Set());

  // Handle scanned barcode: ONLY puts values into form input fields (does NOT auto-save)
  const handleBarcodeScan = (result: ParsedBarcodeResult) => {
    const filledFields: string[] = [];
    const highlighted = new Set<string>();

    if (result.macAddress) {
      setMacAddress(result.macAddress);
      filledFields.push(`MAC: ${result.macAddress}`);
      highlighted.add("macAddress");
    }

    if (result.serialNumber) {
      setSerialNumber(result.serialNumber);
      filledFields.push(`S/N: ${result.serialNumber}`);
      highlighted.add("serialNumber");
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

    // Fallback if raw text wasn't categorized by key-value parser
    if (filledFields.length === 0 && result.raw) {
      const rawText = result.raw.trim();
      if (/^[0-9A-Fa-f:.-]{12,17}$/.test(rawText)) {
        const cleanedHex = rawText.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
        if (cleanedHex.length === 12) {
          const formatted = (cleanedHex.match(/.{1,2}/g) || []).join(":");
          setMacAddress(formatted);
          filledFields.push(`MAC: ${formatted}`);
          highlighted.add("macAddress");
        } else {
          setMacAddress(rawText.toUpperCase());
          filledFields.push(`MAC: ${rawText.toUpperCase()}`);
          highlighted.add("macAddress");
        }
      } else {
        setSerialNumber(rawText);
        filledFields.push(`S/N: ${rawText}`);
        highlighted.add("serialNumber");
      }
    }

    if (filledFields.length > 0) {
      // Apply glow animation to affected fields
      setScannedFields(highlighted);
      // Remove after animation completes so re-scan re-triggers it
      setTimeout(() => setScannedFields(new Set()), 1400);
      toast.success(`Scanned: ${filledFields.join(", ")}. Form inputs updated.`);
    }
  };

  // Hardware Scanner Gun Listener (Keyboard Wedge) - Fills inputs only
  useBarcodeGun({
    onScan: handleBarcodeScan,
    enabled: open,
  });

  // Track previous open value so we only reset fields when the dialog
  // transitions from closed → open (not on every re-render while it's open,
  // e.g. when the scanner sub-modal opens/closes and changes scannerOpen state).
  const prevOpenRef = useRef(open);

  // Sync state when editing device changes OR when the dialog first opens
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    // Only reset/populate fields when the dialog actually opens or the target
    // device changes. Skip intermediate renders (open already true) so that
    // values written by handleBarcodeScan are not overwritten.
    if (!justOpened && !deviceToEdit) return;
    if (!open && !deviceToEdit) return;

    if (deviceToEdit) {
      setDeviceType(deviceToEdit.deviceType);
      setBrand(deviceToEdit.brand);
      setModel(deviceToEdit.model);
      setDeviceName(deviceToEdit.deviceName || deviceToEdit.model || "");
      setSerialNumber(deviceToEdit.serialNumber || "");
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
      setDescription(deviceToEdit.description || "");
      setOnlineLink(deviceToEdit.onlineLink || "");
      setMacAddress(deviceToEdit.macAddress || "");
      setIpAddress(deviceToEdit.ipAddress || "");
      setActivationDate(
        deviceToEdit.activationDate
          ? new Date(deviceToEdit.activationDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setLatitude(
        deviceToEdit.gps?.latitude !== undefined ? String(deviceToEdit.gps.latitude) : ""
      );
      setLongitude(
        deviceToEdit.gps?.longitude !== undefined ? String(deviceToEdit.gps.longitude) : ""
      );
      setStatus(deviceToEdit.status || "Active");
    } else if (justOpened) {
      // Only clear fields when the dialog is freshly opened for a new device
      setDeviceType(defaultDeviceType);
      setBrand("");
      setModel("");
      setDeviceName("");
      setSerialNumber("");
      setTotalPorts(defaultDeviceType === "switch" ? "8" : "");
      setUplinkSwitch("");
      setDescription("");
      setOnlineLink("");
      setMacAddress("");
      setIpAddress("");
      setActivationDate(new Date().toISOString().split("T")[0]);
      setLatitude("");
      setLongitude("");
      setStatus("Active");
    }
  }, [deviceToEdit, defaultDeviceType, open]);

  // Load Device Types and Available Switches on open
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

      setLoadingSwitches(true);
      getAvailableSwitches()
        .then((switches) => {
          setAvailableSwitches(switches);
        })
        .finally(() => setLoadingSwitches(false));
    }
  }, [open]);

  // Load Brands when deviceType changes
  useEffect(() => {
    if (!deviceType) return;
    setLoadingBrands(true);
    getBrands(deviceType, true)
      .then((brands) => {
        setAvailableBrands(brands);
      })
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
      .then((models) => {
        setAvailableModels(models);
      })
      .finally(() => setLoadingModels(false));
  }, [brand, deviceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brand) {
      toast.error("Please select a brand");
      return;
    }
    if (!model.trim()) {
      toast.error("Please select or enter a model");
      return;
    }
    if (!deviceName.trim()) {
      toast.error("Please enter a device name");
      return;
    }
    if (deviceType === "switch" && (!totalPorts || isNaN(Number(totalPorts)) || Number(totalPorts) < 1)) {
      toast.error("Please enter valid total ports for the switch");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        deviceType,
        brand,
        model: model.trim(),
        deviceName: deviceName.trim(),
        serialNumber: serialNumber.trim().toUpperCase(),
        totalPorts: deviceType === "switch" && totalPorts ? Number(totalPorts) : undefined,
        uplinkSwitch: ["antenna", "access-point", "router"].includes(deviceType) && uplinkSwitch ? uplinkSwitch : null,
        description,
        onlineLink,
        macAddress,
        ipAddress,
        activationDate: activationDate ? new Date(activationDate) : new Date(),
        gps: {
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
        },
        status,
      };

      if (isEditing && deviceToEdit) {
        await updateDevice(deviceToEdit._id, payload);
        toast.success(`Device #${deviceToEdit.sl} updated successfully`);
      } else {
        const created = await createDevice(payload);
        toast.success(`Device #${created.sl} created successfully`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 sm:gap-2.5">
                <span className="p-1.5 sm:p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="truncate">
                  {isEditing ? `Edit Device #${deviceToEdit?.sl}` : `Add New ${getTypeName(deviceType)}`}
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isEditing
                  ? "Update network specifications and deployment properties."
                  : "Register infrastructure hardware into the device inventory."}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setScannerTargetField("Device Back Sticker");
                setScannerOpen(true);
              }}
              className="w-full sm:w-auto shrink-0 h-9 px-3 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <ScanBarcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Live Scan Barcode</span>
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Group 1: Hardware Classification & Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              1. Hardware Classification & Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Device Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Device Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={deviceType}
                  onValueChange={(val) => {
                    setDeviceType(val);
                    setBrand("");
                    setModel("");
                    if (val === "switch" && !totalPorts) {
                      setTotalPorts("8");
                    }
                    if (!["antenna", "access-point", "router"].includes(val)) {
                      setUplinkSwitch("");
                    }
                  }}
                  disabled={isEditing}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {availableTypes.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand (Dependent) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Brand <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={brand}
                  onValueChange={(val) => {
                    setBrand(val);
                    setModel("");
                  }}
                  disabled={loadingBrands}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950">
                    <SelectValue
                      placeholder={loadingBrands ? "Loading..." : "Select Brand"}
                    />
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

              {/* Model (Dependent) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Model <span className="text-rose-500">*</span>
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
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950">
                      <SelectValue
                        placeholder={loadingModels ? "Loading..." : "Select Model"}
                      />
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
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                    disabled={!brand}
                  />
                )}
              </div>

              {/* Device Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Device Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Tower North Sector 1 or Rocket Prism 5AC"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Switch Port Capacity Configuration (When Switch) */}
          {deviceType === "switch" && (
            <div className="space-y-3 p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <Label className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">
                    Switch Port Capacity <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                  Physical Ethernet / SFP Ports
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    min="1"
                    max="128"
                    placeholder="e.g. 8, 16, 24, 48"
                    value={totalPorts}
                    onChange={(e) => setTotalPorts(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-semibold"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SWITCH_PORT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTotalPorts(String(preset))}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                        totalPorts === String(preset)
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-sky-400"
                      }`}
                    >
                      {preset}P
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* UpLink Switch Infrastructure Selection (Only for Antenna, Access Point, Router) */}
          {["antenna", "access-point", "router"].includes(deviceType) && (
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <Label className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                    UpLink Switch Assignment
                  </Label>
                </div>
                {uplinkSwitch && (
                  <button
                    type="button"
                    onClick={() => setUplinkSwitch("")}
                    className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-medium inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Detach UpLink
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Select
                  value={uplinkSwitch}
                  onValueChange={setUplinkSwitch}
                  disabled={loadingSwitches}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950">
                    <SelectValue
                      placeholder={
                        loadingSwitches
                          ? "Loading available switches..."
                          : availableSwitches.length === 0
                          ? "No active switches found in inventory"
                          : "Select UpLink Switch (Optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800 max-h-60">
                    {availableSwitches.map((sw) => {
                      const isFull = sw.availablePorts <= 0 && sw._id !== uplinkSwitch;
                      return (
                        <SelectItem
                          key={sw._id}
                          value={sw._id}
                          disabled={isFull}
                          className="py-2 cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              #{sw.sl} — {sw.deviceName} ({sw.brand} {sw.model})
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ml-auto ${
                                sw.availablePorts > 0
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {sw.availablePorts > 0
                                ? `${sw.availablePorts}/${sw.totalPorts} Free`
                                : `Full (0 Free)`}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Live Selected Switch Details Card */}
              {selectedSwitchData && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100/80 dark:border-indigo-900/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        <Network className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{selectedSwitchData.deviceName}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{selectedSwitchData.sl}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {selectedSwitchData.brand} • {selectedSwitchData.model}
                          {selectedSwitchData.ipAddress && ` • ${selectedSwitchData.ipAddress}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                          selectedSwitchData.availablePorts > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {selectedSwitchData.availablePorts > 0
                          ? `${selectedSwitchData.availablePorts} Port${selectedSwitchData.availablePorts > 1 ? "s" : ""} Available`
                          : "Switch Capacity Full"}
                      </span>
                    </div>
                  </div>

                  {/* Port Utilization Gauge */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span>Port Allocation</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedSwitchData.activePortsCount} Active / {selectedSwitchData.totalPorts} Total Ports ({selectedSwitchData.availablePorts} free)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
                      <div
                        className={`h-full transition-all rounded-full ${
                          selectedSwitchData.activePortsCount >= selectedSwitchData.totalPorts
                            ? "bg-rose-500"
                            : selectedSwitchData.activePortsCount / selectedSwitchData.totalPorts > 0.75
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            selectedSwitchData.totalPorts > 0
                              ? (selectedSwitchData.activePortsCount / selectedSwitchData.totalPorts) * 100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group 2: Hardware Identifiers & Connectivity */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              2. Hardware Identifiers & Connectivity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Serial Number (S/N) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Serial Number (S/N)
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTargetField("Serial Number (S/N)");
                      setScannerOpen(true);
                    }}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" /> Scan
                  </button>
                </div>
                <div className={`relative transition-all${scannedFields.has("serialNumber") ? " scan-field-highlight" : ""}`}>
                  <Input
                    placeholder="e.g. SN123456789"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTargetField("Serial Number (S/N)");
                      setScannerOpen(true);
                    }}
                    title="Live Scan Serial Number"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    <ScanBarcode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MAC Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    MAC Address
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTargetField("MAC Address");
                      setScannerOpen(true);
                    }}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" /> Scan
                  </button>
                </div>
                <div className={`relative transition-all${scannedFields.has("macAddress") ? " scan-field-highlight" : ""}`}>
                  <Input
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTargetField("MAC Address");
                      setScannerOpen(true);
                    }}
                    title="Live Scan MAC Address"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    <ScanBarcode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* IPv4 Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  IPv4 Address
                </Label>
                <Input
                  placeholder="192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className={`rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm${scannedFields.has("ipAddress") ? " scan-field-highlight" : ""}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Online Management Link
              </Label>
              <Input
                placeholder="https://192.168.1.100 or management portal URL"
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          {/* Group 3: Deployment & Location */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              3. Deployment & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date of Activation
                </Label>
                <Input
                  type="date"
                  value={activationDate}
                  onChange={(e) => setActivationDate(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GPS Latitude
                </Label>
                <Input
                  placeholder="e.g. 23.8103"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GPS Longitude
                </Label>
                <Input
                  placeholder="e.g. 90.4125"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Group 4: Operational Status & Notes */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              4. Operational State & Notes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status <span className="text-rose-500">*</span>
                </Label>
                <Select value={status} onValueChange={(val) => setStatus(val as DeviceStatus)}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {DEVICE_STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description / Notes
                </Label>
                <Textarea
                  placeholder="Main tower antenna used for sector coverage..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !brand || !model.trim() || !deviceName.trim()}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md shadow-sky-600/10"
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
          title="Scan Device Barcode / Back Sticker"
          description="Point your camera at the barcode, MAC address sticker, or QR code on the back of the device."
          targetFieldLabel={scannerTargetField}
        />
      </DialogContent>
    </Dialog>
  );
}
