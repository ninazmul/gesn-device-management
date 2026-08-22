"use server";

import { connectToDatabase } from "@/lib/database";
import Customer from "@/lib/database/models/customer.model";
import Billing from "@/lib/database/models/billing.model";
import Counter from "@/lib/database/models/counter.model";
import Device from "@/lib/database/models/device.model";
import { formatSL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { FilterQuery } from "mongoose";
import type { CustomerStatus, GetCustomersParams, ICustomer } from "@/types";
import { requirePermission, logActivityAndNotify } from "@/lib/auth-guard";

// Helper to generate next sequential Customer ID (e.g. "CUS-000001")
async function getNextCustomerId(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    "customer_id",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `CUS-${formatSL(counter.seq, 6)}`;
}

// ==========================================
// GET CUSTOMERS (PAGINATED & SEARCHABLE)
// ==========================================
export async function getCustomers(params?: GetCustomersParams) {
  await requirePermission("customers", "read");
  await connectToDatabase();

  const {
    status,
    search = "",
    sortBy = "newest",
    page = 1,
    limit = 25,
  } = params || {};

  const skip = (Math.max(1, page) - 1) * limit;
  const query: FilterQuery<typeof Customer> = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { customerId: regex },
      { name: regex },
      { contactPerson: regex },
      { phone: regex },
      { email: regex },
      { address: regex },
    ];
  }

  // Sorting
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  switch (sortBy) {
    case "oldest":
      sortObj = { createdAt: 1 };
      break;
    case "id_asc":
      sortObj = { customerId: 1 };
      break;
    case "id_desc":
      sortObj = { customerId: -1 };
      break;
    case "name_asc":
      sortObj = { name: 1 };
      break;
    case "name_desc":
      sortObj = { name: -1 };
      break;
    case "bill_desc":
      sortObj = { monthlyBill: -1 };
      break;
    case "bill_asc":
      sortObj = { monthlyBill: 1 };
      break;
    case "newest":
    default:
      sortObj = { createdAt: -1 };
      break;
  }

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .populate({
        path: "assignedDevices",
        select: "sl deviceName deviceType brand model ipAddress status",
        model: Device,
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Customer.countDocuments(query),
  ]);

  return {
    customers: JSON.parse(JSON.stringify(customers)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// ==========================================
// GET SINGLE CUSTOMER BY ID
// ==========================================
export async function getCustomerById(id: string) {
  await requirePermission("customers", "read");
  await connectToDatabase();
  const customer = await Customer.findById(id)
    .populate({
      path: "assignedDevices",
      select: "sl deviceName deviceType brand model ipAddress macAddress status onlineLink",
      model: Device,
    })
    .lean();

  if (!customer) return null;
  return JSON.parse(JSON.stringify(customer)) as ICustomer;
}

// ==========================================
// CREATE CUSTOMER
// ==========================================
export async function createCustomer(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  monthlyBill: number;
  billingStartDate?: string | Date;
  billingDay?: number;
  status?: CustomerStatus;
  assignedDeviceIds?: string[];
}) {
  const actor = await requirePermission("customers", "write");
  await connectToDatabase();

  const customerId = await getNextCustomerId();

  const customer = await Customer.create({
    customerId,
    name: data.name.trim(),
    contactPerson: data.contactPerson?.trim() || "",
    phone: data.phone?.trim() || "",
    email: data.email?.trim().toLowerCase() || "",
    address: data.address?.trim() || "",
    monthlyBill: Number(data.monthlyBill) || 0,
    billingStartDate: data.billingStartDate ? new Date(data.billingStartDate) : new Date(),
    billingDay: data.billingDay ? Math.min(31, Math.max(1, Number(data.billingDay))) : 1,
    status: data.status || "Active",
    assignedDevices: data.assignedDeviceIds || [],
  });

  await logActivityAndNotify({
    actor,
    action: "CREATE_CUSTOMER",
    module: "customers",
    resourceId: customerId,
    resourceName: `${data.name.trim()} (${customerId})`,
    details: `Added new customer: ${data.name.trim()} (ID: ${customerId}, Monthly Bill: ৳${Number(data.monthlyBill) || 0})`,
    link: `/customers/${customer._id}`,
  });

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/billing");

  return JSON.parse(JSON.stringify(customer)) as ICustomer;
}

// ==========================================
// UPDATE CUSTOMER
// ==========================================
export async function updateCustomer(
  id: string,
  data: {
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    monthlyBill?: number;
    billingStartDate?: string | Date;
    billingDay?: number;
    status?: CustomerStatus;
    assignedDeviceIds?: string[];
  }
) {
  const actor = await requirePermission("customers", "write");
  await connectToDatabase();

  const updatePayload: Record<string, unknown> = {};
  if (data.name) updatePayload.name = data.name.trim();
  if (data.contactPerson !== undefined) updatePayload.contactPerson = data.contactPerson.trim();
  if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
  if (data.email !== undefined) updatePayload.email = data.email.trim().toLowerCase();
  if (data.address !== undefined) updatePayload.address = data.address.trim();
  if (data.monthlyBill !== undefined) updatePayload.monthlyBill = Number(data.monthlyBill);
  if (data.billingStartDate) updatePayload.billingStartDate = new Date(data.billingStartDate);
  if (data.billingDay !== undefined) {
    updatePayload.billingDay = Math.min(31, Math.max(1, Number(data.billingDay)));
  }
  if (data.status) updatePayload.status = data.status;
  if (data.assignedDeviceIds !== undefined) updatePayload.assignedDevices = data.assignedDeviceIds;

  const customer = (await Customer.findByIdAndUpdate(id, updatePayload, { new: true }).lean()) as ICustomer | null;
  if (!customer) throw new Error("Customer not found");

  await logActivityAndNotify({
    actor,
    action: "UPDATE_CUSTOMER",
    module: "customers",
    resourceId: customer.customerId,
    resourceName: `${customer.name} (${customer.customerId})`,
    details: `Updated customer information for ${customer.name} (${customer.customerId})`,
    link: `/customers/${id}`,
  });

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/billing");

  return JSON.parse(JSON.stringify(customer)) as ICustomer;
}

// ==========================================
// UPDATE CUSTOMER STATUS
// ==========================================
export async function updateCustomerStatus(id: string, status: CustomerStatus) {
  const actor = await requirePermission("customers", "write");
  await connectToDatabase();
  const customer = (await Customer.findByIdAndUpdate(id, { status }, { new: true }).lean()) as ICustomer | null;
  if (!customer) throw new Error("Customer not found");

  await logActivityAndNotify({
    actor,
    action: "STATUS_CHANGE",
    module: "customers",
    resourceId: customer.customerId,
    resourceName: `${customer.name} (${customer.customerId})`,
    details: `Changed customer status to "${status}" for ${customer.name} (${customer.customerId})`,
    link: `/customers/${id}`,
  });

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);

  return JSON.parse(JSON.stringify(customer)) as ICustomer;
}

// ==========================================
// DELETE OR ARCHIVE CUSTOMER
// ==========================================
export async function deleteCustomer(id: string) {
  const actor = await requirePermission("customers", "write");
  await connectToDatabase();

  const customer = await Customer.findById(id);
  if (!customer) throw new Error("Customer not found");

  // Check if historical billing exists
  const billingCount = await Billing.countDocuments({ customer: id });
  if (billingCount > 0) {
    throw new Error(
      `Cannot permanently delete this customer because they have ${billingCount} historical billing record(s). Please set their status to "Inactive" or "Suspended" to preserve financial history.`
    );
  }

  await Customer.findByIdAndDelete(id);

  await logActivityAndNotify({
    actor,
    action: "DELETE_CUSTOMER",
    module: "customers",
    resourceId: customer.customerId,
    resourceName: `${customer.name} (${customer.customerId})`,
    details: `Deleted customer record: ${customer.name} (${customer.customerId})`,
  });

  revalidatePath("/");
  revalidatePath("/customers");
  return { success: true };
}

// ==========================================
// SEARCH ACTIVE CUSTOMERS FOR SELECTION
// ==========================================
export async function searchActiveCustomers(query: string = "") {
  await requirePermission("customers", "read");
  await connectToDatabase();
  const filter: FilterQuery<typeof Customer> = { status: "Active" };

  if (query.trim()) {
    const regex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ customerId: regex }, { name: regex }, { phone: regex }];
  }

  const customers = await Customer.find(filter)
    .select("customerId name phone monthlyBill billingDay")
    .sort({ name: 1 })
    .limit(20)
    .lean();

  return JSON.parse(JSON.stringify(customers));
}
