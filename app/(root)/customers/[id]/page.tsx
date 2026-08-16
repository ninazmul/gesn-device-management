import { notFound } from "next/navigation";
import { getCustomerById } from "@/lib/actions/customer.actions";
import { getCustomerBillingHistory } from "@/lib/actions/billing.actions";
import { CustomerDetailsView } from "@/components/customers/CustomerDetailsView";

export const dynamic = "force-dynamic";

interface CustomerDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    billingPage?: string;
  }>;
}

export default async function CustomerDetailsPage({
  params,
  searchParams,
}: CustomerDetailsPageProps) {
  const { id } = await params;
  const { billingPage } = await searchParams;

  const page = billingPage ? parseInt(billingPage, 10) : 1;

  const [customer, billingData] = await Promise.all([
    getCustomerById(id),
    getCustomerBillingHistory(id, page, 10),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <CustomerDetailsView
        customer={customer}
        billings={billingData.billings}
        billingTotal={billingData.total}
        billingPage={billingData.page}
        billingTotalPages={billingData.totalPages}
      />
    </div>
  );
}
