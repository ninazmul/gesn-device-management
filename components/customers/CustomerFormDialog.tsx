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
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { createCustomer, updateCustomer } from "@/lib/actions/customer.actions";
import { CUSTOMER_STATUSES } from "@/lib/constants";
import type { CustomerStatus, ICustomer } from "@/types";

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
  const [contactPerson, setContactPerson] = useState(customerToEdit?.contactPerson || "");
  const [phone, setPhone] = useState(customerToEdit?.phone || "");
  const [email, setEmail] = useState(customerToEdit?.email || "");
  const [address, setAddress] = useState(customerToEdit?.address || "");
  const [monthlyBill, setMonthlyBill] = useState(
    customerToEdit?.monthlyBill !== undefined ? String(customerToEdit.monthlyBill) : ""
  );
  const [billingStartDate, setBillingStartDate] = useState(
    customerToEdit?.billingStartDate
      ? new Date(customerToEdit.billingStartDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [billingDay, setBillingDay] = useState(
    customerToEdit?.billingDay ? String(customerToEdit.billingDay) : "1"
  );
  const [status, setStatus] = useState<CustomerStatus>(
    (customerToEdit?.status as CustomerStatus) || "Active"
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setContactPerson(customerToEdit.contactPerson || "");
      setPhone(customerToEdit.phone || "");
      setEmail(customerToEdit.email || "");
      setAddress(customerToEdit.address || "");
      setMonthlyBill(String(customerToEdit.monthlyBill || ""));
      setBillingStartDate(
        customerToEdit.billingStartDate
          ? new Date(customerToEdit.billingStartDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setBillingDay(String(customerToEdit.billingDay || "1"));
      setStatus(customerToEdit.status || "Active");
    } else {
      setName("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setAddress("");
      setMonthlyBill("");
      setBillingStartDate(new Date().toISOString().split("T")[0]);
      setBillingDay("1");
      setStatus("Active");
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
      toast.error("Please enter a valid monthly bill amount");
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
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        monthlyBill: billNum,
        billingStartDate: new Date(billingStartDate),
        billingDay: dayNum,
        status,
      };

      if (isEditing && customerToEdit) {
        await updateCustomer(customerToEdit._id, payload);
        toast.success(`Customer ${customerToEdit.customerId} updated successfully`);
      } else {
        const created = await createCustomer(payload);
        toast.success(`Customer ${created.customerId} created successfully`);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
              {isEditing ? <Users className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </span>
            {isEditing ? `Edit Customer (${customerToEdit?.customerId})` : "Add New Customer"}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEditing
              ? "Update client profile, contact info, and billing parameters."
              : "Register a client account with monthly subscription details."}
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
                  Customer / Business Name <span className="text-rose-500">*</span>
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
                  Contact Person
                </Label>
                <Input
                  placeholder="e.g. Mr. Rafiqul Islam"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </Label>
                <Input
                  placeholder="e.g. 01712-345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
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
                  Physical Address
                </Label>
                <Textarea
                  placeholder="Street, Tower location, Area, City..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Monthly Billing Configuration */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Monthly Billing Setup
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Monthly Bill (৳) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="5000"
                  min="0"
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm font-semibold"
                />
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
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md shadow-sky-600/10"
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
