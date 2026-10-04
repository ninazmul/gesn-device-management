import mongoose, { ConnectOptions } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  deviceStatusMigrationPromise?: Promise<void> | null;
}

// Extend NodeJS global to include mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongoose: CachedConnection | undefined;
}

let cached: CachedConnection = global.mongoose as CachedConnection;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
  if (!cached.conn || mongoose.connection.readyState !== 1) {
    if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");

    if (!cached.promise) {
      cached.promise = mongoose
        .connect(MONGODB_URI, {
          dbName: "gesn-device-management",
          bufferCommands: false,
          serverSelectionTimeoutMS: 8000,
          socketTimeoutMS: 30000,
          maxPoolSize: 10,
        } as ConnectOptions)
        .then((m) => m);
    }

    try {
      cached.conn = await cached.promise;
    } catch (err) {
      cached.promise = null;
      cached.conn = null;
      throw err;
    }
  }

  if (!cached.deviceStatusMigrationPromise) {
    cached.deviceStatusMigrationPromise = (async () => {
      const devices = mongoose.connection.collection("devices");
      const legacyStatusMap = new Map([
        ["Active", "Online"],
        ["Available", "Storage"],
        ["Offline", "Frozen"],
        ["Inactive", "Frozen"],
        ["Retired", "Frozen"],
        ["Rejected", "Frozen"],
      ]);
      const canonicalStatuses = new Set([
        "Pending",
        "Online",
        "Storage",
        "Frozen",
        "Lost",
        "Maintenance",
      ]);
      const currentStatuses = await devices.distinct("status");
      const unsupportedStatuses = currentStatuses.filter(
        (status) =>
          !canonicalStatuses.has(status) && !legacyStatusMap.has(status),
      );
      if (unsupportedStatuses.length > 0) {
        throw new Error(
          `Unsupported device statuses found during migration: ${unsupportedStatuses.join(", ")}`,
        );
      }

      for (const [legacyStatus, canonicalStatus] of legacyStatusMap) {
        await devices.updateMany(
          { status: legacyStatus },
          { $set: { status: canonicalStatus } },
        );
      }
    })().catch((error: unknown) => {
      cached.deviceStatusMigrationPromise = null;
      throw error;
    });
  }
  await cached.deviceStatusMigrationPromise;

  return cached.conn!;
};
