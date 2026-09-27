import mongoose, { Schema, Document } from "mongoose";
import { AdminRole, ModulePermissions } from "@/types";

export interface IAdmin extends Document {
  email: string;
  name?: string;
  role: AdminRole;
  permissions?: Partial<ModulePermissions>;
  granularPermissions?: Record<string, boolean>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["super_admin", "developer", "admin", "editor", "moderator", "viewer", "custom"],
      default: "admin",
    },
    permissions: {
      type: Map,
      of: String,
      default: {},
    },
    granularPermissions: {
      type: Map,
      of: Boolean,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
