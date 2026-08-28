import { getBillings } from "@/lib/actions/billing.actions";
import { BillingTable } from "@/components/billing/BillingTable";
import { BillingMobileCards } from "@/components/billing/BillingMobileCards";
import { BillingFilters } from "@/components/billing/BillingFilters";
import { BillingHeader } from "./BillingHeader";

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
      <BillingHeader total={total} />


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
