"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
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
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { BulkImportDialog } from "@/components/shared/BulkImportDialog";
import { usePermissions } from "@/components/providers/PermissionContext";
import { getAllCustomersForExport, importCustomersBulk } from "@/lib/actions/customer.actions";
import { exportToExcel, downloadTemplate } from "@/lib/excel";
import { toast } from "react-hot-toast";

const CUSTOMER_EXPORT_HEADERS = [
  "Customer ID",
  "Customer Name",
  "Contact Person",
  "Phone",
  "Email",
  "Address",
  "Monthly Bill",
  "Billing Day",
  "Status",
];

const CUSTOMER_TEMPLATE_HEADERS = [
  "Customer Name",
  "Contact Person",
  "Phone",
  "Email",
  "Address",
  "Monthly Bill",
  "Billing Day",
  "Status",
];

interface CustomersHeaderProps {
  total: number;
}

export function CustomersHeader({ total }: CustomersHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { canWrite } = usePermissions();
  const canWriteCustomers = canWrite("customers");

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const customers = await getAllCustomersForExport({
        status: searchParams.get("status") || undefined,
        search: searchParams.get("search") || undefined,
      });

      if (customers.length === 0) {
        toast.error("No customers available to export.");
        return;
      }

      const rows = customers.map((c) => ({
        "Customer ID": c.customerId,
        "Customer Name": c.name,
        "Contact Person": c.contactPerson || "",
        "Phone": c.phone || "",
        "Email": c.email || "",
        "Address": c.address || "",
        "Monthly Bill": c.monthlyBill || 0,
        "Billing Day": c.billingDay || 1,
        "Status": c.status,
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      exportToExcel(
        rows,
        CUSTOMER_EXPORT_HEADERS,
        "Customers",
        `customers-directory-${dateStr}.xlsx`
      );
      toast.success(`Exported ${customers.length} customer records!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export customers");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(
      CUSTOMER_TEMPLATE_HEADERS,
      {
        "Customer Name": "Green Enterprise Ltd",
        "Contact Person": "Rahim Ahmed",
        "Phone": "+8801711223344",
        "Email": "info@greenenterprise.com",
        "Address": "Plot 12, Road 4, Sector 7, Uttara, Dhaka",
        "Monthly Bill": 2500,
        "Billing Day": 1,
        "Status": "Active",
      },
      "customers-import-template.xlsx"
    );
    toast.success("Excel template downloaded!");
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Customer Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total registered subscriber clients:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {total.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* Polished Actions Dropdown Menu */}
        <div className="flex items-center gap-2 shrink-0">
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
              {canWriteCustomers && (
                <>
                  <DropdownMenuLabel>Customer Management</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Add New Customer</span>
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

      {/* Add Customer Dialog */}
      <CustomerFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => {
          setIsAddOpen(false);
          router.refresh();
        }}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        title="Bulk Import Customers"
        description="Upload an Excel or CSV file to register multiple client subscriber accounts at once."
        templateHeaders={CUSTOMER_TEMPLATE_HEADERS}
        sampleRow={{
          "Customer Name": "Apex IT Solutions",
          "Contact Person": "Mahmudul Hasan",
          "Phone": "+8801819998877",
          "Email": "support@apex-it.com",
          "Address": "Dhanmondi 27, Dhaka",
          "Monthly Bill": 3500,
          "Billing Day": 1,
          "Status": "Active",
        }}
        templateFilename="customers-import-template.xlsx"
        onImport={importCustomersBulk}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
