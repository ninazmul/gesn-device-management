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
  "Service Type",
  "Contact Person",
  "Phone",
  "Email",
  "Address",
  "GPS Location",
  "Monthly Bill (SAR)",
  "Billing Day",
  "Status",
];

const CUSTOMER_TEMPLATE_HEADERS = [
  "Customer Name",
  "Service Type",
  "Contact Person",
  "Phone",
  "Email",
  "Address",
  "GPS Location",
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
        "Service Type": c.serviceType || "Service C",
        "Contact Person": c.contactPerson || "",
        "Phone": c.phone || "",
        "Email": c.email || "",
        "Address": c.address || "",
        "GPS Location": c.gpsLink || "",
        "Monthly Bill (SAR)": c.monthlyBill || 0,
        "Billing Day": c.billingDay || 1,
        "Status": c.status,
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      await exportToExcel(
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

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate(
        CUSTOMER_TEMPLATE_HEADERS,
        {
          "Customer Name": "Apex Security Systems",
          "Service Type": "CCTV",
          "Contact Person": "Abdulrahman Al-Ghamdi",
          "Phone": "+966 50 123 4567",
          "Email": "info@apex-security.com",
          "Address": "King Fahd Road, Olaya District, Riyadh",
          "GPS Location": "https://maps.google.com/?q=24.7136,46.6753",
          "Monthly Bill": 150,
          "Billing Day": 1,
          "Status": "Active",
        },
        "customers-import-template.xlsx"
      );
      toast.success("Excel template downloaded!");
    } catch {
      toast.error("Failed to download the Excel template.");
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
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
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/10 gap-1.5 h-10 px-4"
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
                    <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
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
          "Customer Name": "Al-Naseem Trading",
          "Service Type": "Service C",
          "Contact Person": "Mohammed Al-Otaibi",
          "Phone": "+966 55 987 6543",
          "Email": "info@al-naseem.com",
          "Address": "Exit 10, Al-Quds, Riyadh",
          "GPS Location": "https://maps.google.com/?q=24.7743,46.7386",
          "Monthly Bill": 200,
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
