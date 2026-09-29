"use server";

import { connectToDatabase } from "@/lib/database";
import Billing from "@/lib/database/models/billing.model";
import Customer from "@/lib/database/models/customer.model";
import Counter from "@/lib/database/models/counter.model";
import { formatSL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { FilterQuery } from "mongoose";
import type { BillingStatus, GetBillingsParams, IBilling } from "@/types";
import { requirePermission, logActivityAndNotify } from "@/lib/auth-guard";

const OVERDUE_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let lastOverdueSyncAt = 0;

export async function syncOverdueBillsIfNeeded() {
  const now = Date.now();
  if (now - lastOverdueSyncAt < OVERDUE_SYNC_INTERVAL_MS) return;

  // Set this before awaiting so concurrent page requests share one sweep.
  lastOverdueSyncAt = now;
  try {
    await Billing.updateMany(
      {
        dueDate: { $lt: new Date(now) },
        status: { $in: ["Pending", "Partial"] },
      },
      { status: "Overdue" },
    );
  } catch (error) {
    lastOverdueSyncAt = 0;
    throw error;
  }
}

// Helper to generate next sequential Billing ID (e.g. "BILL-000001")
async function getNextBillingId(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    "billing_id",
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `BILL-${formatSL(counter.seq, 6)}`;
}

// ==========================================
// GET BILLINGS (PAGINATED, FILTERED & SEARCHABLE)
// ==========================================
export async function getBillings(params?: GetBillingsParams) {
  await requirePermission("billing", "read");
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

  await syncOverdueBillsIfNeeded();

  const [billings, total] = await Promise.all([
    Billing.find(query)
      .populate({
        path: "customer",
        select:
          "customerId name phone email address monthlyBill billingDay status serviceType server",
        populate: {
          path: "server",
          select: "sl deviceName deviceType ipAddress status",
          model: "Device",
        },
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
  limit = 10,
) {
  await requirePermission("billing", "read");
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
  const actor = await requirePermission("billing", "write");
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
    existingBills.map((b) => String(b.customer)),
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
      new Date(year, monthNum, 0).getDate(),
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

  await logActivityAndNotify({
    actor,
    action: "GENERATE_BILLS",
    module: "billing",
    resourceId: month,
    resourceName: `Month ${month}`,
    details: `Generated ${createdCount} monthly bill(s) for ${month} (skipped ${skippedCount})`,
    link: "/billing",
  });

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
    paymentMethod?: string;
    paymentDate?: string | Date;
    paymentNote?: string;
    paymentReference?: string;
  },
) {
  const actor = await requirePermission("billing", "write");
  await connectToDatabase();

  const bill = await Billing.findById(id).populate(
    "customer",
    "name customerId",
  );
  if (!bill) throw new Error("Billing record not found");

  const paidAmount = Number(data.paidAmount);
  if (isNaN(paidAmount) || paidAmount < 0) {
    throw new Error("Invalid paid amount");
  }

  if (paidAmount > bill.billingAmount) {
    throw new Error(
      `Paid amount (SAR ${paidAmount.toLocaleString()}) cannot exceed billing amount (SAR ${bill.billingAmount.toLocaleString()})`,
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

  const previousPaid = bill.paidAmount || 0;
  const incrementalPaid = paidAmount - previousPaid;

  bill.paidAmount = paidAmount;
  bill.dueAmount = dueAmount;
  bill.status = status;
  bill.paymentDate = data.paymentDate
    ? new Date(data.paymentDate)
    : paidAmount > 0
      ? new Date()
      : undefined;
  if (data.paymentMethod) bill.paymentMethod = data.paymentMethod;
  if (data.paymentNote !== undefined)
    bill.paymentNote = data.paymentNote.trim();
  if (data.paymentReference !== undefined)
    bill.paymentReference = data.paymentReference.trim();

  bill.collectedBy = {
    email: actor.email,
    name: actor.name,
    role: actor.role,
    userId: actor._id,
  };

  // If there's a positive incremental payment, append to paymentHistory
  if (incrementalPaid > 0) {
    if (!bill.paymentHistory) bill.paymentHistory = [];
    bill.paymentHistory.push({
      amount: incrementalPaid,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      paymentMethod: data.paymentMethod || "Cash",
      collectedBy: bill.collectedBy,
      note: data.paymentNote?.trim() || "",
      createdAt: new Date(),
    });
  }

  await bill.save();

  await logActivityAndNotify({
    actor,
    action: "PAYMENT_UPDATE",
    module: "billing",
    resourceId: bill.billingId,
    resourceName: `${bill.billingId} (${bill.billingMonth})`,
    details: `Updated payment for bill ${bill.billingId}: SAR ${previousPaid} ➔ SAR ${paidAmount} via ${data.paymentMethod || "Cash"} (Status: ${status})`,
    link: "/billing",
  });

  revalidatePath("/");
  revalidatePath("/billing");
  revalidatePath(`/customers/${bill.customer?._id || bill.customer}`);

  return JSON.parse(JSON.stringify(bill)) as IBilling;
}

// ==========================================
// COLLECT BILL PAYMENT (Direct collection flow)
// ==========================================
export async function collectBillPayment(data: {
  billingId?: string;
  customerId?: string;
  amount: number;
  paymentMethod?: string;
  paymentDate?: string | Date;
  note?: string;
  reference?: string;
}) {
  const actor = await requirePermission("billing", "write");
  await connectToDatabase();

  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  let bill = null;

  if (data.billingId) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(data.billingId);
    bill = await Billing.findOne({
      $or: [
        { billingId: data.billingId },
        ...(isObjectId ? [{ _id: data.billingId }] : []),
      ],
    }).populate("customer", "name customerId phone email");
  }

  if (!bill && data.customerId) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(data.customerId);
    const customer = await Customer.findOne({
      $or: [
        { customerId: data.customerId },
        ...(isObjectId ? [{ _id: data.customerId }] : []),
      ],
    });

    if (!customer) throw new Error("Customer not found");

    // Look for earliest outstanding bill
    bill = await Billing.findOne({
      customer: customer._id,
      status: { $in: ["Overdue", "Pending", "Partial"] },
      dueAmount: { $gt: 0 },
    })
      .sort({ dueDate: 1 })
      .populate("customer", "name customerId phone email");

    // If no existing unpaid bill, create or fetch the bill for the current month
    if (!bill) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      bill = await Billing.findOne({
        customer: customer._id,
        billingMonth: currentMonth,
      }).populate("customer", "name customerId phone email");

      if (!bill) {
        const newBillingId = await getNextBillingId();
        const dueDate = new Date();
        bill = await Billing.create({
          billingId: newBillingId,
          customer: customer._id,
          billingMonth: currentMonth,
          billingAmount: customer.monthlyBill || amount,
          paidAmount: 0,
          dueAmount: customer.monthlyBill || amount,
          dueDate,
          status: "Pending",
        });
        await bill.populate("customer", "name customerId phone email");
      }
    }
  }

  if (!bill) {
    throw new Error("No bill record found or created for this customer.");
  }

  const previousPaid = bill.paidAmount || 0;
  const newPaid = previousPaid + amount;
  const newDue = Math.max(0, bill.billingAmount - newPaid);

  let newStatus: BillingStatus = "Pending";
  if (newDue <= 0) {
    newStatus = "Paid";
  } else if (newPaid > 0) {
    newStatus = "Partial";
  } else {
    newStatus = bill.dueDate < new Date() ? "Overdue" : "Pending";
  }

  const paymentRecord = {
    amount,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    paymentMethod: data.paymentMethod || "Cash",
    collectedBy: {
      email: actor.email,
      name: actor.name,
      role: actor.role,
      userId: actor._id,
    },
    note: data.note?.trim() || "",
    createdAt: new Date(),
  };

  bill.paidAmount = newPaid;
  bill.dueAmount = newDue;
  bill.status = newStatus;
  bill.paymentDate = paymentRecord.paymentDate;
  bill.paymentMethod = data.paymentMethod || "Cash";
  if (data.reference) bill.paymentReference = data.reference.trim();
  if (data.note) bill.paymentNote = data.note.trim();
  bill.collectedBy = paymentRecord.collectedBy;

  if (!bill.paymentHistory) bill.paymentHistory = [];
  bill.paymentHistory.push(paymentRecord);

  await bill.save();

  await logActivityAndNotify({
    actor,
    action: "PAYMENT_COLLECTED",
    module: "billing",
    resourceId: bill.billingId,
    resourceName: `${bill.billingId} (${bill.billingMonth})`,
    details: `Collected SAR ${amount.toLocaleString()} for bill ${bill.billingId} via ${data.paymentMethod || "Cash"}. Remaining due: SAR ${newDue.toLocaleString()} (Status: ${newStatus})`,
    link: "/billing",
  });

  revalidatePath("/");
  revalidatePath("/billing");
  revalidatePath("/customers");
  if (bill.customer?._id) {
    revalidatePath(`/customers/${bill.customer._id}`);
  }

  return JSON.parse(JSON.stringify(bill)) as IBilling;
}

// ==========================================
// GET PENDING BILL FOR CUSTOMER (QUICK LOOKUP)
// ==========================================
export async function getPendingBillForCustomer(customerId: string) {
  await requirePermission("billing", "read");
  await connectToDatabase();

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(customerId);
  const customerResult = await Customer.findOne({
    $or: [{ customerId }, ...(isObjectId ? [{ _id: customerId }] : [])],
  }).lean();
  const customer = Array.isArray(customerResult)
    ? customerResult[0]
    : customerResult;

  if (!customer) return null;

  await syncOverdueBillsIfNeeded();

  const bill = await Billing.findOne({
    customer: customer._id,
    dueAmount: { $gt: 0 },
    status: { $in: ["Overdue", "Pending", "Partial"] },
  })
    .sort({ dueDate: 1 })
    .lean();

  return {
    customer: JSON.parse(JSON.stringify(customer)),
    bill: bill ? JSON.parse(JSON.stringify(bill)) : null,
  };
}

// ==========================================
// UPDATE BILLING STATUS
// ==========================================
export async function updateBillingStatus(id: string, status: BillingStatus) {
  const actor = await requirePermission("billing", "write");
  await connectToDatabase();
  const bill = (await Billing.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  ).lean()) as IBilling | null;
  if (!bill) throw new Error("Billing record not found");

  await logActivityAndNotify({
    actor,
    action: "STATUS_CHANGE",
    module: "billing",
    resourceId: bill.billingId,
    resourceName: bill.billingId,
    details: `Changed billing status to "${status}" for ${bill.billingId}`,
    link: "/billing",
  });

  revalidatePath("/");
  revalidatePath("/billing");
  return JSON.parse(JSON.stringify(bill)) as IBilling;
}

// ==========================================
// DELETE BILLING RECORD
// ==========================================
export async function deleteBilling(id: string) {
  const actor = await requirePermission("billing", "write");
  await connectToDatabase();
  const bill = (await Billing.findByIdAndDelete(
    id,
  ).lean()) as unknown as IBilling | null;
  if (bill) {
    await logActivityAndNotify({
      actor,
      action: "DELETE_BILLING",
      module: "billing",
      resourceId: bill.billingId,
      resourceName: bill.billingId,
      details: `Deleted billing record ${bill.billingId} (${bill.billingMonth})`,
      link: "/billing",
    });
  }

  revalidatePath("/");
  revalidatePath("/billing");
  return { success: true };
}

// ==========================================
// GET ALL BILLINGS FOR EXCEL EXPORT
// ==========================================
export async function getAllBillingsForExport(params?: {
  billingMonth?: string;
  status?: string;
  search?: string;
}) {
  await requirePermission("billing", "read");
  await connectToDatabase();

  const query: FilterQuery<typeof Billing> = {};
  if (params?.billingMonth && params.billingMonth !== "all") {
    query.billingMonth = params.billingMonth;
  }
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  }

  const billings = await Billing.find(query)
    .populate("customer", "customerId name phone email address")
    .sort({ billingMonth: -1, billingId: 1 })
    .lean();

  return JSON.parse(JSON.stringify(billings)) as IBilling[];
}
