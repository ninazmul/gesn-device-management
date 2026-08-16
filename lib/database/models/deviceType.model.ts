import { Schema, model, models } from "mongoose";

export interface IDeviceTypeDoc {
  name: string;
  slug: string;
  description?: string;
  isProtected: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, default: "" },
    isProtected: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DeviceTypeSchema.index({ isActive: 1 });

const DeviceType =
  models.DeviceType ||
  model<IDeviceTypeDoc>("DeviceType", DeviceTypeSchema);

export default DeviceType;
