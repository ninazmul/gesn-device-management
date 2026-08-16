import { Schema, model, models } from "mongoose";

export interface IBrandDoc {
  name: string;
  deviceTypes: string[]; // Slugs e.g. ["antenna", "router"]
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    deviceTypes: [{ type: String, required: true, lowercase: true, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BrandSchema.index({ name: 1, deviceTypes: 1 });
BrandSchema.index({ isActive: 1 });

const Brand = models.Brand || model<IBrandDoc>("Brand", BrandSchema);

export default Brand;
