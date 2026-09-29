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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Receipt, Search, CheckCircle2, User } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  collectBillPayment,
  getPendingBillForCustomer,
} from "@/lib/actions/billing.actions";
import { searchActiveCustomers } from "@/lib/actions/customer.actions";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { ICustomer } from "@/types";

interface CollectCustomer {
  _id: string;
  customerId: string;
  name: string;
  phone?: string;
  serviceType?: string;
  monthlyBill?: number;
  serverName?: string;
}

interface CollectableBill {
  _id?: string;
  billingId: string;
  billingMonth: string;
  billingAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string | Date;
  status: string;
}

interface CollectBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomer?: CollectCustomer | null;
  initialBilling?: CollectableBill | null;
  onSuccess?: () => void;
}

export function CollectBillDialog({
  open,
  onOpenChange,
  initialCustomer = null,
  initialBilling = null,
  onSuccess,
}: CollectBillDialogProps) {
  // Search & Selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ICustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CollectCustomer | null>(initialCustomer);
  const [activeBill, setActiveBill] = useState<CollectableBill | null>(
    initialBilling,
  );
  const [loadingBill, setLoadingBill] = useState(false);

  // Form Fields
  const [collectAmount, setCollectAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset or initialize when opened
  useEffect(() => {
    if (open) {
      if (initialCustomer) {
        setSelectedCustomer(initialCustomer);
        if (initialBilling) {
          setActiveBill(initialBilling);
          setCollectAmount(
            String(
              initialBilling.dueAmount || initialBilling.billingAmount || 0,
            ),
          );
        } else {
          loadBillForCustomer(
            initialCustomer.customerId || initialCustomer._id,
          );
        }
      } else {
        setSelectedCustomer(null);
        setActiveBill(null);
        setCollectAmount("");
        setSearchQuery("");
        setSearchResults([]);
      }
      setPaymentMethod("Cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setReference("");
      setNote("");
    }
  }, [open, initialCustomer, initialBilling]);

  const loadBillForCustomer = async (custIdentifier: string) => {
    try {
      setLoadingBill(true);
      const res = await getPendingBillForCustomer(custIdentifier);
      if (res?.customer) {
        setSelectedCustomer(res.customer);
      }
      if (res?.bill) {
        setActiveBill(res.bill);
        setCollectAmount(
          String(res.bill.dueAmount || res.bill.billingAmount || 0),
        );
      } else {
        setActiveBill(null);
        // Default to customer's monthly bill
        if (res?.customer?.monthlyBill) {
          setCollectAmount(String(res.customer.monthlyBill));
        }
      }
    } catch {
      toast.error("Failed to load customer billing information");
    } finally {
      setLoadingBill(false);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchQuery(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await searchActiveCustomers(term);
      setSearchResults(results || []);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCustomer = (cust: ICustomer) => {
    setSelectedCustomer(cust);
    setSearchQuery("");
    setSearchResults([]);
    loadBillForCustomer(cust.customerId || cust._id);
  };

  const dueAmount = activeBill
    ? (activeBill.dueAmount ?? activeBill.billingAmount)
    : (selectedCustomer?.monthlyBill ?? 0);

  const handleSetFullAmount = () => {
    setCollectAmount(String(dueAmount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Please select a customer to collect payment for");
      return;
    }

    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid collection amount greater than 0");
      return;
    }

    try {
      setSubmitting(true);
      await collectBillPayment({
        billingId: activeBill?.billingId || activeBill?._id,
        customerId: selectedCustomer.customerId || selectedCustomer._id,
        amount: amountNum,
        paymentMethod,
        paymentDate: new Date(paymentDate),
        reference: reference.trim(),
        note: note.trim(),
      });

      toast.success(
        `Collected SAR ${amountNum.toLocaleString()} for ${selectedCustomer.name}`,
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to record payment collection",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
              <Receipt className="w-5 h-5" />
            </span>
            Collect Bill Payment
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fast, audit-tracked bill collection with receipt history (SAR).
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Step 1: Customer Selection */}
          {!selectedCustomer ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Search Customer <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  placeholder="Search by name, customer ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-3" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((cust) => (
                    <button
                      key={cust._id}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {cust.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {cust.customerId} • {cust.phone || "No phone"}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(cust.monthlyBill)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Selected Customer Card */
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-purple-600 dark:text-purple-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                      {selectedCustomer.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {selectedCustomer.customerId} •{" "}
                      {selectedCustomer.phone || "No phone"}
                    </p>
                  </div>
                </div>

                {!initialCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setActiveBill(null);
                    }}
                    className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Service & Server Tag */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
                {selectedCustomer.serviceType && (
                  <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                    {selectedCustomer.serviceType}
                  </span>
                )}
                {selectedCustomer.serverName && (
                  <span className="px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Server: {selectedCustomer.serverName}
                  </span>
                )}
              </div>

              {/* Current Bill Info Banner */}
              {loadingBill ? (
                <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching
                  billing records...
                </div>
              ) : activeBill ? (
                <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Month
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">
                      {activeBill.billingMonth}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Due Date
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      {formatDate(activeBill.dueDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Outstanding
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs">
                      {formatCurrency(
                        activeBill.dueAmount ?? activeBill.billingAmount,
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    No overdue bill found. Collecting for current cycle.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Payment Details */}
          {selectedCustomer && (
            <div className="space-y-3.5 pt-1">
              {/* Collection Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Collection Amount (SAR){" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  {dueAmount > 0 && (
                    <button
                      type="button"
                      onClick={handleSetFullAmount}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Pay Full Due ({formatCurrency(dueAmount)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    SAR
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="pl-14 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-base font-black text-slate-900 dark:text-slate-100 font-mono"
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Method <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs sm:text-sm">
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                      {PAYMENT_METHODS.map((pm) => (
                        <SelectItem key={pm} value={pm}>
                          {pm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Collection Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Reference / Transaction ID */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Transaction Reference / Slip No (Optional)
                </Label>
                <Input
                  placeholder="e.g. STC-99214, Bank Ref #8210"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs sm:text-sm"
                />
              </div>

              {/* Note / Remarks */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Remarks / Audit Notes (Optional)
                </Label>
                <Textarea
                  placeholder="Any extra comments regarding this collection..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs sm:text-sm resize-none"
                />
              </div>

              {/* Notice */}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
                * Note: Collecting this bill will update the financial ledger
                and credit the customer&apos;s account. Line connectivity will
                remain unaffected.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
              disabled={
                submitting ||
                !selectedCustomer ||
                !collectAmount ||
                parseFloat(collectAmount) <= 0
              }
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/10 px-5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording...
                </>
              ) : (
                `Collect ${collectAmount ? formatCurrency(parseFloat(collectAmount)) : "Payment"}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
