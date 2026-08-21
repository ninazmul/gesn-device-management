"use client";

import { useEffect, useState } from "react";
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
import { Loader2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { createDevice, updateDevice } from "@/lib/actions/device.actions";
import { getBrands, getModels, getDeviceTypes } from "@/lib/actions/catalog.actions";
import { PRIMARY_DEVICE_TYPES, DEVICE_STATUSES } from "@/lib/constants";
import type { DeviceStatus, IDevice, IDeviceType, IBrand, IModel } from "@/types";

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDeviceType?: string;
  deviceToEdit?: IDevice | null;
  onSuccess?: () => void;
}

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
  const [description, setDescription] = useState(deviceToEdit?.description || "");
  const [onlineLink, setOnlineLink] = useState(deviceToEdit?.onlineLink || "");
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

  // Catalog Options
  const [availableTypes, setAvailableTypes] = useState<IDeviceType[]>([]);
  const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]);
  const [availableModels, setAvailableModels] = useState<IModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync state when editing device changes
  useEffect(() => {
    if (deviceToEdit) {
      setDeviceType(deviceToEdit.deviceType);
      setBrand(deviceToEdit.brand);
      setModel(deviceToEdit.model);
      setDeviceName(deviceToEdit.deviceName || deviceToEdit.model || "");
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
    } else {
      setDeviceType(defaultDeviceType);
      setBrand("");
      setModel("");
      setDeviceName("");
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

  // Load Device Types on open
  useEffect(() => {
    if (open) {
      getDeviceTypes(true).then((types) => {
        if (types && types.length > 0) {
          setAvailableTypes(types);
        } else {
          // fallback to primary types
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

    try {
      setSubmitting(true);
      const payload = {
        deviceType,
        brand,
        model: model.trim(),
        deviceName: deviceName.trim(),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
              <Plus className="w-5 h-5" />
            </span>
            {isEditing ? `Edit Device #${deviceToEdit?.sl}` : `Add New ${getTypeName(deviceType)}`}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEditing
              ? "Update network specifications and deployment properties."
              : "Register infrastructure hardware into the device inventory."}
          </p>
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

          {/* Group 2: Network Configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              2. Network & Connectivity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  IPv4 Address
                </Label>
                <Input
                  placeholder="192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  MAC Address
                </Label>
                <Input
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-mono text-sm uppercase"
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
      </DialogContent>
    </Dialog>
  );
}
