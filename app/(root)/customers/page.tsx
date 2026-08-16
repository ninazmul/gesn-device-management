import { getCustomers } from "@/lib/actions/customer.actions";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerMobileCards } from "@/components/customers/CustomerMobileCards";
import { CustomerFilters } from "@/components/customers/CustomerFilters";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface CustomersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const { customers, total, totalPages, limit } = await getCustomers({
    search: resolvedParams.search,
    status: resolvedParams.status,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 25,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
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
      </div>

      {/* Filter Toolbar & Add Customer Action */}
      <CustomerFilters totalCustomers={total} />

      {/* Desktop High-Density Table */}
      <div className="hidden lg:block">
        <CustomerTable
          customers={customers}
          total={total}
          page={page}
          totalPages={totalPages}
          limit={limit}
        />
      </div>

      {/* Mobile Card Layout */}
      <CustomerMobileCards
        customers={customers}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
