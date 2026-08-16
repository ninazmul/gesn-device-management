"use server";

import { connectToDatabase } from "@/lib/database";
import Billing from "@/lib/database/models/billing.model";
import Customer from "@/lib/database/models/customer.model";
import Counter from "@/lib/database/models/counter.model";
import { formatSL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { FilterQuery } from "mongoose";
import type { BillingStatus, GetBillingsParams, IBilling } from "@/types";

// Helper to generate next sequential Billing ID (e.g. "BILL-000001")
async function getNextBillingId(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    "billing_id",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `BILL-${formatSL(counter.seq, 6)}`;
}

// ==========================================
// GET BILLINGS (PAGINATED, FILTERED & SEARCHABLE)
// ==========================================
export async function getBillings(params?: GetBillingsParams) {
  await connectToDatabase();

  const {
    billingMonth,
    status,
    customerId,
    search = "",
    sortBy = "newest",
    page = 1,
    limit = 25,
  } = params || {};

  const skip = (Math.max(1, page) - 1) * limit;
  const query: FilterQuery<typeof Billing> = {};

  if (billingMonth && billingMonth !== "all") {
    query.billingMonth = billingMonth.trim();
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (customerId) {
    query.customer = customerId;
  }

  // If search query is provided, find matching customer IDs first
  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const matchingCustomers = await Customer.find({
      $or: [{ name: regex }, { customerId: regex }, { phone: regex }],
    }).select("_id");

    const matchedCustomerIds = matchingCustomers.map((c) => c._id);

    query.$or = [
      { billingId: regex },
      { paymentReference: regex },
      { customer: { $in: matchedCustomerIds } },
    ];
  }

  // Sorting
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  switch (sortBy) {
    case "oldest":
      sortObj = { createdAt: 1 };
      break;
    case "due_date_asc":
      sortObj = { dueDate: 1 };
      break;
    case "due_date_desc":
      sortObj = { dueDate: -1 };
      break;
    case "amount_desc":
      sortObj = { billingAmount: -1 };
      break;
    case "amount_asc":
      sortObj = { billingAmount: 1 };
      break;
    case "newest":
    default:
      sortObj = { createdAt: -1 };
      break;
  }

  // Auto-evaluate overdue bills whose due date has passed
  const now = new Date();
  await Billing.updateMany(
    {
      dueDate: { $lt: now },
      status: { $in: ["Pending", "Partial"] },
    },
    { status: "Overdue" }
  );

  const [billings, total] = await Promise.all([
    Billing.find(query)
      .populate({
        path: "customer",
        select: "customerId name phone email address monthlyBill billingDay status",
        model: Customer,
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Billing.countDocuments(query),
  ]);

  return {
    billings: JSON.parse(JSON.stringify(billings)) as IBilling[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// ==========================================
// GET CUSTOMER BILLING HISTORY (PAGINATED)
// ==========================================
export async function getCustomerBillingHistory(
  customerId: string,
  page = 1,
  limit = 10
) {
  await connectToDatabase();

  const skip = (Math.max(1, page) - 1) * limit;
  const query = { customer: customerId };

  const [billings, total] = await Promise.all([
    Billing.find(query)
      .sort({ billingMonth: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Billing.countDocuments(query),
  ]);

  return {
    billings: JSON.parse(JSON.stringify(billings)) as IBilling[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// ==========================================
// GENERATE MONTHLY BILLS
// ==========================================
export async function generateMonthlyBills(targetMonth?: string) {
  await connectToDatabase();

  // If no month provided, use current month "YYYY-MM"
  const now = new Date();
  const month =
    targetMonth ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  // End date of the billing month
  const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

  // Find all active customers who started billing on or before this month
  const activeCustomers = await Customer.find({
    status: "Active",
    billingStartDate: { $lte: endOfMonth },
    monthlyBill: { $gt: 0 },
  }).lean();

  if (activeCustomers.length === 0) {
    return {
      success: true,
      created: 0,
      skipped: 0,
      totalActive: 0,
      month,
    };
  }

  // Find existing bills for this month to avoid duplicates
  const existingBills = await Billing.find({
    billingMonth: month,
    customer: { $in: activeCustomers.map((c) => c._id) },
  }).select("customer");

  const existingCustomerIds = new Set(
    existingBills.map((b) => String(b.customer))
  );

  let createdCount = 0;
  let skippedCount = 0;

  for (const customer of activeCustomers) {
    const custIdStr = String(customer._id);
    if (existingCustomerIds.has(custIdStr)) {
      skippedCount++;
      continue;
    }

    const billingId = await getNextBillingId();
    const billingDay = Math.min(
      Math.max(1, customer.billingDay || 1),
      new Date(year, monthNum, 0).getDate()
    );
    const dueDate = new Date(year, monthNum - 1, billingDay, 23, 59, 59);

    // Initial status: if dueDate has already passed, set to Overdue, else Pending
    const isPastDue = dueDate < new Date();
    const initialStatus = isPastDue ? "Overdue" : "Pending";

    try {
      await Billing.create({
        billingId,
        customer: customer._id,
        billingMonth: month,
        billingAmount: customer.monthlyBill,
        paidAmount: 0,
        dueAmount: customer.monthlyBill,
        dueDate,
        status: initialStatus,
      });
      createdCount++;
    } catch {
      // Caught if duplicate key triggered
      skippedCount++;
    }
  }

  revalidatePath("/");
  revalidatePath("/billing");
  revalidatePath("/customers");

  return {
    success: true,
    created: createdCount,
    skipped: skippedCount,
    totalActive: activeCustomers.length,
    month,
  };
}

// ==========================================
// UPDATE PAYMENT
// ==========================================
export async function updatePayment(
  id: string,
  data: {
    paidAmount: number;
    paymentDate?: string | Date;
    paymentNote?: string;
    paymentReference?: string;
  }
) {
  await connectToDatabase();

  const bill = await Billing.findById(id);
  if (!bill) throw new Error("Billing record not found");

  const paidAmount = Number(data.paidAmount);
  if (isNaN(paidAmount) || paidAmount < 0) {
    throw new Error("Invalid paid amount");
  }

  if (paidAmount > bill.billingAmount) {
    throw new Error(
      `Paid amount (৳${paidAmount.toLocaleString()}) cannot exceed billing amount (৳${bill.billingAmount.toLocaleString()})`
    );
  }

  const dueAmount = Math.max(0, bill.billingAmount - paidAmount);

  // Determine status
  let status: BillingStatus = "Pending";
  if (paidAmount >= bill.billingAmount) {
    status = "Paid";
  } else if (paidAmount > 0) {
    status = "Partial";
  } else {
    // If 0 paid, check if due date passed
    status = bill.dueDate < new Date() ? "Overdue" : "Pending";
  }

  bill.paidAmount = paidAmount;
  bill.dueAmount = dueAmount;
  bill.status = status;
  bill.paymentDate = data.paymentDate ? new Date(data.paymentDate) : paidAmount > 0 ? new Date() : undefined;
  if (data.paymentNote !== undefined) bill.paymentNote = data.paymentNote.trim();
  if (data.paymentReference !== undefined) bill.paymentReference = data.paymentReference.trim();

  await bill.save();

  revalidatePath("/");
  revalidatePath("/billing");
  revalidatePath(`/customers/${bill.customer}`);

  return JSON.parse(JSON.stringify(bill)) as IBilling;
}

// ==========================================
// UPDATE BILLING STATUS
// ==========================================
export async function updateBillingStatus(id: string, status: BillingStatus) {
  await connectToDatabase();
  const bill = (await Billing.findByIdAndUpdate(id, { status }, { new: true }).lean()) as IBilling | null;
  if (!bill) throw new Error("Billing record not found");

  revalidatePath("/");
  revalidatePath("/billing");
  return JSON.parse(JSON.stringify(bill)) as IBilling;
}

// ==========================================
// DELETE BILLING RECORD
// ==========================================
export async function deleteBilling(id: string) {
  await connectToDatabase();
  await Billing.findByIdAndDelete(id);

  revalidatePath("/");
  revalidatePath("/billing");
  return { success: true };
}
