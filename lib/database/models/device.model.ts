import { Schema, model, models } from "mongoose";
import { DEVICE_STATUSES } from "@/lib/constants";

export interface IDeviceDoc {
  sl: string;
  deviceType: string;
  brand: string;
  model: string;
  deviceName: string;
  totalPorts?: number;
  uplinkSwitch?: Schema.Types.ObjectId | IDeviceDoc | null;
  server?: Schema.Types.ObjectId | IDeviceDoc | null;
  description?: string;
  onlineLink?: string;
  macAddress?: string;
  ipAddress?: string;
  activationDate?: Date;
  apNumber?: string;
  customerName?: string;
  customerMobile?: string;
  gpsLink?: string;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  status: (typeof DEVICE_STATUSES)[number];
  submittedBy?: {
    email: string;
    name?: string;
    role?: string;
    userId?: string;
  };
  approvedBy?: {
    email: string;
    name?: string;
    role?: string;
    userId?: string;
    date?: Date;
  };
  rejectedBy?: {
    email: string;
    name?: string;
    role?: string;
    userId?: string;
    date?: Date;
    reason?: string;
  };
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema(
  {
    sl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    deviceType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    model: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    totalPorts: {
      type: Number,
      default: undefined,
    },
    uplinkSwitch: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      default: null,
      index: true,
    },
    server: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      default: null,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    onlineLink: {
      type: String,
      default: "",
      trim: true,
    },
    macAddress: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    activationDate: {
      type: Date,
      index: true,
    },
    gps: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    apNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    customerMobile: {
      type: String,
      default: "",
      trim: true,
    },
    gpsLink: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: DEVICE_STATUSES,
      default: "Pending",
      index: true,
    },
    submittedBy: {
      email: { type: String, trim: true, lowercase: true },
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      userId: { type: String, trim: true },
      date: { type: Date },
    },
    approvedBy: {
      email: { type: String, trim: true, lowercase: true },
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      userId: { type: String, trim: true },
      date: { type: Date },
    },
    rejectedBy: {
      email: { type: String, trim: true, lowercase: true },
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      userId: { type: String, trim: true },
      date: { type: Date },
      reason: { type: String, trim: true },
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes
DeviceSchema.index({ deviceType: 1, status: 1 });
DeviceSchema.index({ deviceType: 1, createdAt: -1 });
DeviceSchema.index({ status: 1, createdAt: -1 });
DeviceSchema.index({ brand: 1, model: 1 });
DeviceSchema.index({
  deviceName: "text",
  sl: "text",
  ipAddress: "text",
  macAddress: "text",
  description: "text",
});

const Device = models.Device || model<IDeviceDoc>("Device", DeviceSchema);

export default Device;
