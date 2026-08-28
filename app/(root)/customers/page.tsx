import { getCustomers } from "@/lib/actions/customer.actions";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerMobileCards } from "@/components/customers/CustomerMobileCards";
import { CustomerFilters } from "@/components/customers/CustomerFilters";
import { CustomersHeader } from "./CustomersHeader";

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
      <CustomersHeader total={total} />


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
