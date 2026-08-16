import { Schema, model, models } from "mongoose";
import { CUSTOMER_STATUSES } from "@/lib/constants";

export interface ICustomerDoc {
  _id?: string | Schema.Types.ObjectId;
  customerId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  monthlyBill: number;
  billingStartDate: Date;
  billingDay: number;
  status: (typeof CUSTOMER_STATUSES)[number];
  assignedDevices?: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    contactPerson: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    monthlyBill: {
      type: Number,
      required: true,
      default: 0,
    },
    billingStartDate: {
      type: Date,
      default: Date.now,
    },
    billingDay: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 31,
    },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      default: "Active",
      index: true,
    },
    assignedDevices: [
      {
        type: Schema.Types.ObjectId,
        ref: "Device",
      },
    ],
  },
  {
    timestamps: true,
  }
);

CustomerSchema.index({ status: 1, createdAt: -1 });
CustomerSchema.index({ name: "text", customerId: "text", phone: "text", email: "text", contactPerson: "text" });

const Customer = models.Customer || model<ICustomerDoc>("Customer", CustomerSchema);

export default Customer;
