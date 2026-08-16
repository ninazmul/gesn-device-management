import { getBillings } from "@/lib/actions/billing.actions";
import { BillingTable } from "@/components/billing/BillingTable";
import { BillingMobileCards } from "@/components/billing/BillingMobileCards";
import { BillingFilters } from "@/components/billing/BillingFilters";
import { Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

interface BillingPageProps {
  searchParams: Promise<{
    billingMonth?: string;
    status?: string;
    customerId?: string;
    search?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const { billings, total, totalPages, limit } = await getBillings({
    billingMonth: resolvedParams.billingMonth,
    status: resolvedParams.status,
    customerId: resolvedParams.customerId,
    search: resolvedParams.search,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 25,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Monthly Billing
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage subscriber invoices and payment collections:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {total.toLocaleString()}
              </span>{" "}
              records
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Generate Monthly Invoices */}
      <BillingFilters totalBillings={total} />

      {/* Desktop High-Density Table */}
      <div className="hidden lg:block">
        <BillingTable
          billings={billings}
          total={total}
          page={page}
          totalPages={totalPages}
          limit={limit}
        />
      </div>

      {/* Mobile Card Layout */}
      <BillingMobileCards
        billings={billings}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
