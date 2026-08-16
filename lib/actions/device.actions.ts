"use server";

import { connectToDatabase } from "@/lib/database";
import Device from "@/lib/database/models/device.model";
import Counter from "@/lib/database/models/counter.model";
import Brand from "@/lib/database/models/brand.model";
import DeviceModel from "@/lib/database/models/model.model";
import { formatSL, isValidIPv4, isValidMAC } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { FilterQuery } from "mongoose";
import type { DeviceStatus, GetDevicesParams, IDevice } from "@/types";

// Helper to generate next sequential SL (e.g. "000001")
async function getNextSL(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    "device_sl",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return formatSL(counter.seq, 6);
}

// ==========================================
// GET DEVICES (PAGINATED & SERVER FILTERED)
// ==========================================
export async function getDevices(params?: GetDevicesParams) {
  await connectToDatabase();

  const {
    deviceType,
    brand,
    model,
    status,
    search = "",
    sortBy = "newest",
    page = 1,
    limit = 25,
  } = params || {};

  const skip = (Math.max(1, page) - 1) * limit;
  const query: FilterQuery<typeof Device> = {};

  if (deviceType && deviceType !== "all") {
    query.deviceType = deviceType.toLowerCase().trim();
  }

  if (brand && brand !== "all") {
    query.brand = brand.trim();
  }

  if (model && model !== "all") {
    query.model = model.trim();
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { sl: regex },
      { deviceName: regex },
      { brand: regex },
      { model: regex },
      { ipAddress: regex },
      { macAddress: regex },
      { description: regex },
    ];
  }

  // Sorting
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  switch (sortBy) {
    case "oldest":
      sortObj = { createdAt: 1 };
      break;
    case "sl_asc":
      sortObj = { sl: 1 };
      break;
    case "sl_desc":
      sortObj = { sl: -1 };
      break;
    case "name_asc":
      sortObj = { deviceName: 1 };
      break;
    case "name_desc":
      sortObj = { deviceName: -1 };
      break;
    case "status":
      sortObj = { status: 1, createdAt: -1 };
      break;
    case "newest":
    default:
      sortObj = { createdAt: -1 };
      break;
  }

  const [devices, total] = await Promise.all([
    Device.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Device.countDocuments(query),
  ]);

  return {
    devices: JSON.parse(JSON.stringify(devices)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// ==========================================
// GET SINGLE DEVICE BY ID
// ==========================================
export async function getDeviceById(id: string) {
  await connectToDatabase();
  const device = await Device.findById(id).lean();
  if (!device) return null;
  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// CREATE DEVICE
// ==========================================
export async function createDevice(data: {
  deviceType: string;
  brand: string;
  model: string;
  description?: string;
  onlineLink?: string;
  macAddress?: string;
  ipAddress?: string;
  activationDate?: string | Date;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  status?: DeviceStatus;
}) {
  await connectToDatabase();

  // Validate MAC & IP if provided
  if (data.macAddress && !isValidMAC(data.macAddress)) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  if (data.ipAddress && !isValidIPv4(data.ipAddress)) {
    throw new Error("Invalid IPv4 Address format. Example: 192.168.1.100");
  }

  // Device Name is automatically derived from Model Name
  const deviceName = data.model.trim();
  const sl = await getNextSL();

  const device = await Device.create({
    sl,
    deviceType: data.deviceType.toLowerCase().trim(),
    brand: data.brand.trim(),
    model: data.model.trim(),
    deviceName,
    description: data.description?.trim() || "",
    onlineLink: data.onlineLink?.trim() || "",
    macAddress: data.macAddress?.trim().toUpperCase() || "",
    ipAddress: data.ipAddress?.trim() || "",
    activationDate: data.activationDate ? new Date(data.activationDate) : new Date(),
    gps: {
      latitude: data.gps?.latitude !== undefined && !isNaN(Number(data.gps.latitude)) ? Number(data.gps.latitude) : undefined,
      longitude: data.gps?.longitude !== undefined && !isNaN(Number(data.gps.longitude)) ? Number(data.gps.longitude) : undefined,
    },
    status: data.status || "Active",
  });

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${data.deviceType.toLowerCase().trim()}`);

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// UPDATE DEVICE
// ==========================================
export async function updateDevice(
  id: string,
  data: {
    deviceType?: string;
    brand?: string;
    model?: string;
    description?: string;
    onlineLink?: string;
    macAddress?: string;
    ipAddress?: string;
    activationDate?: string | Date;
    gps?: {
      latitude?: number;
      longitude?: number;
    };
    status?: DeviceStatus;
  }
) {
  await connectToDatabase();

  if (data.macAddress && !isValidMAC(data.macAddress)) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  if (data.ipAddress && !isValidIPv4(data.ipAddress)) {
    throw new Error("Invalid IPv4 Address format. Example: 192.168.1.100");
  }

  const updatePayload: Record<string, unknown> = {};

  if (data.brand) updatePayload.brand = data.brand.trim();
  if (data.model) {
    updatePayload.model = data.model.trim();
    updatePayload.deviceName = data.model.trim();
  }
  if (data.deviceType) updatePayload.deviceType = data.deviceType.toLowerCase().trim();
  if (data.description !== undefined) updatePayload.description = data.description.trim();
  if (data.onlineLink !== undefined) updatePayload.onlineLink = data.onlineLink.trim();
  if (data.macAddress !== undefined) updatePayload.macAddress = data.macAddress.trim().toUpperCase();
  if (data.ipAddress !== undefined) updatePayload.ipAddress = data.ipAddress.trim();
  if (data.activationDate) updatePayload.activationDate = new Date(data.activationDate);
  if (data.gps) {
    updatePayload.gps = {
      latitude: data.gps.latitude !== undefined && !isNaN(Number(data.gps.latitude)) ? Number(data.gps.latitude) : undefined,
      longitude: data.gps.longitude !== undefined && !isNaN(Number(data.gps.longitude)) ? Number(data.gps.longitude) : undefined,
    };
  }
  if (data.status) updatePayload.status = data.status;

  const device = (await Device.findByIdAndUpdate(id, updatePayload, { new: true }).lean()) as IDevice | null;
  if (!device) throw new Error("Device not found");

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${device.deviceType}`);

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// UPDATE DEVICE STATUS
// ==========================================
export async function updateDeviceStatus(id: string, status: DeviceStatus) {
  await connectToDatabase();
  const device = (await Device.findByIdAndUpdate(id, { status }, { new: true }).lean()) as IDevice | null;
  if (!device) throw new Error("Device not found");

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${device.deviceType}`);

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// DELETE DEVICE
// ==========================================
export async function deleteDevice(id: string) {
  await connectToDatabase();
  const device = (await Device.findByIdAndDelete(id).lean()) as IDevice | null;
  if (device) {
    revalidatePath("/");
    revalidatePath("/devices");
    revalidatePath(`/devices/${device.deviceType}`);
  }
  return { success: true };
}

// ==========================================
// GLOBAL SEARCH (⌘K Fast Lookup)
// ==========================================
export async function searchGlobalDevices(searchTerm: string) {
  if (!searchTerm || searchTerm.trim().length < 1) return [];
  await connectToDatabase();

  const term = searchTerm.trim();
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const results = await Device.find({
    $or: [
      { sl: regex },
      { deviceName: regex },
      { ipAddress: regex },
      { macAddress: regex },
      { brand: regex },
      { model: regex },
    ],
  })
    .select("sl deviceName deviceType brand model ipAddress macAddress status")
    .limit(10)
    .lean();

  return JSON.parse(JSON.stringify(results));
}

// ==========================================
// GET FILTER OPTIONS
// ==========================================
export async function getDeviceFilterOptions(deviceType?: string) {
  await connectToDatabase();

  const brandQuery: Record<string, unknown> = { isActive: true };
  if (deviceType && deviceType !== "all") {
    brandQuery.deviceTypes = deviceType.toLowerCase().trim();
  }

  const modelQuery: Record<string, unknown> = { isActive: true };
  if (deviceType && deviceType !== "all") {
    modelQuery.deviceType = deviceType.toLowerCase().trim();
  }

  const [brands, models] = await Promise.all([
    Brand.find(brandQuery).select("name").sort({ name: 1 }).lean(),
    DeviceModel.find(modelQuery).select("name brand deviceType").sort({ name: 1 }).lean(),
  ]);

  return {
    brands: brands.map((b) => b.name),
    models: JSON.parse(JSON.stringify(models)),
  };
}
