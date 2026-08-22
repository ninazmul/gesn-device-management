import mongoose, { Schema, Document } from "mongoose";
import { AdminRole, AppModule } from "@/types";

export interface IActivityLogDoc extends Document {
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  module: AppModule | "system";
  resourceId?: string;
  resourceName?: string;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema: Schema = new Schema(
  {
    actorEmail: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    actorRole: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      trim: true,
      default: "",
    },
    resourceName: {
      type: String,
      trim: true,
      default: "",
    },
    details: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ module: 1, action: 1 });

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLogDoc>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
