import mongoose, { ConnectOptions } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
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
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

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

  return cached.conn;
};
