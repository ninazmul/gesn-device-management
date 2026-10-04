import mongoose from "mongoose";

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

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is required to migrate device statuses.");
}

try {
  await mongoose.connect(uri, {
    dbName: "gesn-device-management",
    serverSelectionTimeoutMS: 8000,
  });

  const devices = mongoose.connection.collection("devices");
  const currentStatuses = await devices.distinct("status");
  const unsupportedStatuses = currentStatuses.filter(
    (status) =>
      !canonicalStatuses.has(status) && !legacyStatusMap.has(status),
  );
  if (unsupportedStatuses.length > 0) {
    throw new Error(
      `Cannot migrate unknown device statuses: ${unsupportedStatuses.join(", ")}`,
    );
  }

  for (const [legacyStatus, canonicalStatus] of legacyStatusMap) {
    const result = await devices.updateMany(
      { status: legacyStatus },
      { $set: { status: canonicalStatus } },
    );
    if (result.modifiedCount > 0) {
      console.log(`${legacyStatus} -> ${canonicalStatus}: ${result.modifiedCount}`);
    }
  }
  console.log("Device status migration completed.");
} finally {
  await mongoose.disconnect();
}
