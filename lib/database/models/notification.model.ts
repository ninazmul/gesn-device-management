import mongoose, { Schema, Document } from "mongoose";
import { AdminRole, AppModule } from "@/types";

export interface INotificationDoc extends Document {
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  module: AppModule | "system";
  title: string;
  message: string;
  link?: string;
  readBy: string[]; // List of super admin emails who have read this notification
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
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
    },
    action: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    readBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ createdAt: -1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotificationDoc>("Notification", NotificationSchema);

export default Notification;
