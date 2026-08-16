import { Schema, model, models } from "mongoose";

export interface IModelDoc {
  name: string;
  deviceType: string; // slug e.g. "antenna"
  brand: string; // brand name
  specifications?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ModelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    deviceType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    brand: { type: String, required: true, trim: true },
    specifications: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate models for the same device type and brand
ModelSchema.index({ name: 1, brand: 1, deviceType: 1 }, { unique: true });
ModelSchema.index({ deviceType: 1, brand: 1 });
ModelSchema.index({ isActive: 1 });

const DeviceModel =
  models.DeviceModel || model<IModelDoc>("DeviceModel", ModelSchema);

export default DeviceModel;
