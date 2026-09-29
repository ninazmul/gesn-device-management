import { Schema, model, models } from "mongoose";
import { BILLING_STATUSES, PAYMENT_METHODS } from "@/lib/constants";

export interface IPaymentRecordDoc {
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  collectedBy?: {
    email: string;
    name?: string;
    role?: string;
    userId?: string;
  };
  note?: string;
  createdAt: Date;
}

export interface IBillingDoc {
  _id?: string | Schema.Types.ObjectId;
  billingId: string;
  customer: Schema.Types.ObjectId;
  billingMonth: string; // e.g. "2026-08"
  billingAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: Date;
  paymentDate?: Date;
  paymentMethod?: (typeof PAYMENT_METHODS)[number] | string;
  paymentNote?: string;
  paymentReference?: string;
  collectedBy?: {
    email: string;
    name?: string;
    role?: string;
    userId?: string;
  };
  paymentHistory?: IPaymentRecordDoc[];
  status: (typeof BILLING_STATUSES)[number];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      default: "Cash",
      trim: true,
    },
    collectedBy: {
      email: { type: String, trim: true },
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      userId: { type: String, trim: true },
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const BillingSchema = new Schema(
  {
    billingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    billingMonth: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    billingAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    dueAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "Cash",
    },
    paymentNote: {
      type: String,
      default: "",
      trim: true,
    },
    paymentReference: {
      type: String,
      default: "",
      trim: true,
    },
    collectedBy: {
      email: { type: String, trim: true },
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      userId: { type: String, trim: true },
    },
    paymentHistory: [PaymentRecordSchema],
    status: {
      type: String,
      enum: BILLING_STATUSES,
      default: "Pending",
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate monthly billing for the same customer and month
BillingSchema.index({ customer: 1, billingMonth: 1 }, { unique: true });

// Query & filter compound indexes
BillingSchema.index({ billingMonth: 1, status: 1 });
BillingSchema.index({ customer: 1, createdAt: -1 });
BillingSchema.index({ status: 1, dueDate: 1 });

const Billing = models.Billing || model<IBillingDoc>("Billing", BillingSchema);

export default Billing;
