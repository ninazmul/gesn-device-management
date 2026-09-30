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
import {
  Loader2,
  UserPlus,
  Users,
  MapPin,
  Server,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createCustomer,
  updateCustomer,
  getServerOptions,
} from "@/lib/actions/customer.actions";
import { CUSTOMER_STATUSES, CUSTOMER_SERVICE_TYPES } from "@/lib/constants";
import type {
  CustomerStatus,
  CustomerServiceType,
  ICustomer,
  IServerOption,
} from "@/types";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerToEdit?: ICustomer | null;
  onSuccess?: () => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customerToEdit,
  onSuccess,
}: CustomerFormDialogProps) {
  const isEditing = Boolean(customerToEdit);

  // Form states
  const [name, setName] = useState(customerToEdit?.name || "");
  const [phone, setPhone] = useState(customerToEdit?.phone || "");
  const [address, setAddress] = useState(customerToEdit?.address || "");
  const [gpsLink, setGpsLink] = useState(customerToEdit?.gpsLink || "");
  const [serviceType, setServiceType] = useState<CustomerServiceType>(
    customerToEdit?.serviceType || "Service C",
  );
  const [serverId, setServerId] = useState<string>(
    customerToEdit?.server
      ? typeof customerToEdit.server === "object"
        ? customerToEdit.server._id
        : customerToEdit.server
      : "none",
  );
  const [monthlyBill, setMonthlyBill] = useState(
    customerToEdit?.monthlyBill !== undefined
      ? String(customerToEdit.monthlyBill)
      : "",
  );
  const [billingStartDate, setBillingStartDate] = useState(
    customerToEdit?.billingStartDate
      ? new Date(customerToEdit.billingStartDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [billingDay, setBillingDay] = useState(
    customerToEdit?.billingDay ? String(customerToEdit.billingDay) : "1",
  );
  const [status, setStatus] = useState<CustomerStatus>(
    (customerToEdit?.status as CustomerStatus) || "Active",
  );

  const [serverOptions, setServerOptions] = useState<IServerOption[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Load server device options
      setLoadingServers(true);
      getServerOptions()
        .then((options) => setServerOptions(options || []))
        .catch(() => {})
        .finally(() => setLoadingServers(false));

      if (customerToEdit) {
        setName(customerToEdit.name);
        setPhone(customerToEdit.phone || "");
        setAddress(customerToEdit.address || "");
        setGpsLink(customerToEdit.gpsLink || "");
        setServiceType(customerToEdit.serviceType || "Service C");
        setServerId(
          customerToEdit.server
            ? typeof customerToEdit.server === "object"
              ? customerToEdit.server._id
              : customerToEdit.server
            : "none",
        );
        setMonthlyBill(String(customerToEdit.monthlyBill || ""));
        setBillingStartDate(
          customerToEdit.billingStartDate
            ? new Date(customerToEdit.billingStartDate)
                .toISOString()
                .split("T")[0]
            : new Date().toISOString().split("T")[0],
        );
        setBillingDay(String(customerToEdit.billingDay || "1"));
        setStatus(customerToEdit.status || "Active");
      } else {
        setName("");
        setPhone("");
        setAddress("");
        setGpsLink("");
        setServiceType("Service C");
        setServerId("none");
        setMonthlyBill("");
        setBillingStartDate(new Date().toISOString().split("T")[0]);
        setBillingDay("1");
        setStatus("Active");
      }
    }
  }, [customerToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const billNum = parseFloat(monthlyBill);
    if (isNaN(billNum) || billNum < 0) {
      toast.error("Please enter a valid monthly bill amount (SAR)");
      return;
    }

    const dayNum = parseInt(billingDay, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      toast.error("Billing day must be between 1 and 31");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gpsLink: gpsLink.trim(),
        serviceType,
        server: serverId && serverId !== "none" ? serverId : null,
        monthlyBill: billNum,
        billingStartDate: new Date(billingStartDate),
        billingDay: dayNum,
        status,
      };

      if (isEditing && customerToEdit) {
        await updateCustomer(customerToEdit._id, payload);
        toast.success(
          `Customer ${customerToEdit.customerId} updated successfully`,
        );
      } else {
        const created = await createCustomer(payload);
        toast.success(`Customer ${created.customerId} created successfully`);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save customer",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              {isEditing ? (
                <Users className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </span>
            {isEditing
              ? `Edit Customer (${customerToEdit?.customerId})`
              : "Add New Customer"}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEditing
              ? "Update client profile, service package, and monthly billing terms."
              : "Register customer account with service type, server link, and monthly bill."}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Section 1: Customer Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Customer Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer / Business Name{" "}
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Apex Fiber Network or John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone / Mobile Number
                </Label>
                <Input
                  placeholder="e.g. +966 50 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Account Status <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as CustomerStatus)}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {CUSTOMER_STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Physical Address / Location
                </Label>
                <Textarea
                  placeholder="Street, Building, Flat / Tower, District..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                />
              </div>

              {/* GPS Link Field */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    GPS Location (Map Link / Pin)
                  </Label>
                  {gpsLink && (
                    <a
                      href={
                        gpsLink.startsWith("http")
                          ? gpsLink
                          : `https://${gpsLink}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <Input
                  placeholder="https://maps.google.com/?q=24.7136,46.6753"
                  value={gpsLink}
                  onChange={(e) => setGpsLink(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Service & Infrastructure Setup */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Service & Infrastructure Connection
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Service Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Service Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={serviceType}
                  onValueChange={(val) =>
                    setServiceType(val as CustomerServiceType)
                  }
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                    <SelectValue placeholder="Select Service Type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {CUSTOMER_SERVICE_TYPES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Select service category (CCTV, TV, or Service C).
                </p>
              </div>

              {/* Server Link */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                  Connected Server
                </Label>
                <Select
                  value={serverId}
                  onValueChange={setServerId}
                  disabled={loadingServers}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm">
                    <SelectValue
                      placeholder={
                        loadingServers
                          ? "Loading servers..."
                          : "None / Unassigned"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    <SelectItem value="none">None / Unassigned</SelectItem>
                    {serverOptions.map((srv) => (
                      <SelectItem key={srv._id} value={srv._id}>
                        {srv.deviceName} ({srv.sl}){" "}
                        {srv.ipAddress ? `• ${srv.ipAddress}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Link customer to central gateway or distribution server.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Monthly Billing Setup */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Monthly Billing Setup (SAR)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Monthly Bill (SAR) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    SAR
                  </span>
                  <Input
                    type="number"
                    placeholder="150"
                    min="0"
                    value={monthlyBill}
                    onChange={(e) => setMonthlyBill(e.target.value)}
                    className="pl-13 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Billing Day of Month <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1-31"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Billing Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={billingStartDate}
                  onChange={(e) => setBillingStartDate(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
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
              disabled={submitting || !name.trim() || !monthlyBill}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md shadow-purple-600/10 px-5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Customer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
