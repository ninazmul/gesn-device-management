"use server";

import { connectToDatabase } from "@/lib/database";
import Device from "@/lib/database/models/device.model";
import Counter from "@/lib/database/models/counter.model";
import Brand from "@/lib/database/models/brand.model";
import DeviceModel from "@/lib/database/models/model.model";
import { formatSL, isValidIPv4, isValidMAC } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { FilterQuery } from "mongoose";
import type { DeviceStatus, GetDevicesParams, IDevice, ISwitchOption, IServerOption } from "@/types";
import { requirePermission, logActivityAndNotify } from "@/lib/auth-guard";

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
// GET AVAILABLE SWITCHES (WITH LIVE PORT UTILIZATION)
// ==========================================
export async function getAvailableSwitches(): Promise<ISwitchOption[]> {
  await requirePermission("devices", "read");
  await connectToDatabase();

  const switches = await Device.find({
    deviceType: "switch",
    status: { $nin: ["Retired"] },
  })
    .select("sl deviceName brand model ipAddress status totalPorts")
    .sort({ deviceName: 1 })
    .lean();

  if (switches.length === 0) return [];

  const switchIds = switches.map((s) => s._id);

  // Aggregate count of devices connected to each switch
  const connections = await Device.aggregate([
    {
      $match: {
        uplinkSwitch: { $in: switchIds },
        status: { $nin: ["Retired"] },
      },
    },
    {
      $group: {
        _id: "$uplinkSwitch",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map<string, number>();
  for (const c of connections) {
    countMap.set(String(c._id), c.count);
  }

  const result: ISwitchOption[] = switches.map((s) => {
    const totalPorts = s.totalPorts || 0;
    const activePortsCount = countMap.get(String(s._id)) || 0;
    const availablePorts = Math.max(0, totalPorts - activePortsCount);

    return {
      _id: String(s._id),
      sl: s.sl,
      deviceName: s.deviceName,
      brand: s.brand,
      model: s.model,
      ipAddress: s.ipAddress,
      status: s.status,
      totalPorts,
      activePortsCount,
      availablePorts,
    };
  });

  return JSON.parse(JSON.stringify(result));
}

// ==========================================
// GET AVAILABLE SERVERS
// ==========================================
export async function getAvailableServers(): Promise<IServerOption[]> {
  await requirePermission("devices", "read");
  await connectToDatabase();

  const servers = await Device.find({
    deviceType: "server",
    status: { $nin: ["Retired"] },
  })
    .select("sl deviceName brand model ipAddress status")
    .sort({ deviceName: 1 })
    .lean();

  return JSON.parse(JSON.stringify(servers));
}

// ==========================================
// GET DEVICES (PAGINATED & SERVER FILTERED)
// ==========================================
export async function getDevices(params?: GetDevicesParams) {
  await requirePermission("devices", "read");
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
      { serialNumber: regex },
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

  const [rawDevices, total] = await Promise.all([
    Device.find(query)
      .populate("uplinkSwitch", "sl deviceName brand model totalPorts ipAddress status")
      .populate("server", "sl deviceName brand model ipAddress status")
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Device.countDocuments(query),
  ]);

  const devices = rawDevices as unknown as IDevice[];

  // For switches in the returned list, calculate connected devices count
  const switchIds = devices.filter((d) => d.deviceType === "switch").map((d) => d._id);
  const switchCountMap = new Map<string, number>();
  if (switchIds.length > 0) {
    const counts = await Device.aggregate([
      {
        $match: {
          uplinkSwitch: { $in: switchIds },
          status: { $nin: ["Retired"] },
        },
      },
      {
        $group: {
          _id: "$uplinkSwitch",
          count: { $sum: 1 },
        },
      },
    ]);
    for (const c of counts) {
      switchCountMap.set(String(c._id), c.count);
    }
  }

  const formattedDevices = devices.map((d) => {
    if (d.deviceType === "switch") {
      const totalPorts = d.totalPorts || 0;
      const activePortsCount = switchCountMap.get(String(d._id)) || 0;
      const availablePorts = Math.max(0, totalPorts - activePortsCount);
      return {
        ...d,
        activePortsCount,
        availablePorts,
      };
    }
    return d;
  });

  return {
    devices: JSON.parse(JSON.stringify(formattedDevices)),
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
  await requirePermission("devices", "read");
  await connectToDatabase();
  const device = (await Device.findById(id)
    .populate("uplinkSwitch", "sl deviceName brand model totalPorts ipAddress status")
    .populate("server", "sl deviceName brand model ipAddress status")
    .lean()) as unknown as IDevice | null;
  if (!device) return null;

  // If the device is a switch, fetch connected downlink devices and compute metrics
  if (device.deviceType === "switch") {
    const connectedDevices = (await Device.find({ uplinkSwitch: id })
      .select("sl deviceName deviceType brand model ipAddress macAddress status")
      .sort({ sl: 1 })
      .lean()) as unknown as IDevice[];

    const totalPorts = device.totalPorts || 0;
    const activePortsCount = connectedDevices.filter((d) => d.status !== "Retired").length;
    const availablePorts = Math.max(0, totalPorts - activePortsCount);

    return JSON.parse(
      JSON.stringify({
        ...device,
        connectedDevices,
        activePortsCount,
        availablePorts,
      })
    );
  }

  // If the device is a server, fetch all devices hosted/assigned to this server
  if (device.deviceType === "server") {
    const connectedDevices = (await Device.find({ server: id })
      .select("sl deviceName deviceType brand model ipAddress macAddress status")
      .sort({ sl: 1 })
      .lean()) as unknown as IDevice[];

    return JSON.parse(
      JSON.stringify({
        ...device,
        connectedDevices,
      })
    );
  }

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// CREATE DEVICE
// ==========================================
export async function createDevice(data: {
  deviceType: string;
  brand: string;
  model: string;
  deviceName?: string;
  serialNumber?: string;
  totalPorts?: number;
  uplinkSwitch?: string | null;
  server?: string | null;
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
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  // Validate MAC & IP if provided
  if (data.macAddress && !isValidMAC(data.macAddress)) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  if (data.ipAddress && !isValidIPv4(data.ipAddress)) {
    throw new Error("Invalid IPv4 Address format. Example: 192.168.1.100");
  }

  const deviceName = data.deviceName?.trim() || data.model.trim();
  const sl = await getNextSL();

  const device = await Device.create({
    sl,
    deviceType: data.deviceType.toLowerCase().trim(),
    brand: data.brand.trim(),
    model: data.model.trim(),
    deviceName,
    serialNumber: data.serialNumber?.trim().toUpperCase() || "",
    totalPorts: data.totalPorts !== undefined && !isNaN(Number(data.totalPorts)) ? Number(data.totalPorts) : undefined,
    uplinkSwitch: data.uplinkSwitch ? data.uplinkSwitch : null,
    server: data.deviceType.toLowerCase().trim() !== "server" && data.server ? data.server : null,
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

  await logActivityAndNotify({
    actor,
    action: "CREATE_DEVICE",
    module: "devices",
    resourceId: sl,
    resourceName: `${deviceName} (${sl})`,
    details: `Added new ${data.deviceType} device: ${deviceName} (SL: ${sl}, IP: ${data.ipAddress || "N/A"})`,
    link: `/devices/${data.deviceType.toLowerCase().trim()}`,
  });

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${data.deviceType.toLowerCase().trim()}`);
  if (data.uplinkSwitch) {
    revalidatePath(`/devices/switch/${data.uplinkSwitch}`);
  }
  if (data.server) {
    revalidatePath(`/devices/server/${data.server}`);
  }

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
    deviceName?: string;
    serialNumber?: string;
    totalPorts?: number;
    uplinkSwitch?: string | null;
    server?: string | null;
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
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  if (data.macAddress && !isValidMAC(data.macAddress)) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  if (data.ipAddress && !isValidIPv4(data.ipAddress)) {
    throw new Error("Invalid IPv4 Address format. Example: 192.168.1.100");
  }

  const updatePayload: Record<string, unknown> = {};

  if (data.brand) updatePayload.brand = data.brand.trim();
  if (data.model) updatePayload.model = data.model.trim();
  if (data.deviceName) updatePayload.deviceName = data.deviceName.trim();
  if (data.serialNumber !== undefined) updatePayload.serialNumber = data.serialNumber.trim().toUpperCase();
  if (data.totalPorts !== undefined) {
    updatePayload.totalPorts = !isNaN(Number(data.totalPorts)) ? Number(data.totalPorts) : undefined;
  }
  if (data.uplinkSwitch !== undefined) {
    updatePayload.uplinkSwitch = data.uplinkSwitch ? data.uplinkSwitch : null;
  }
  if (data.server !== undefined) {
    const isServer = (data.deviceType || "").toLowerCase().trim() === "server";
    updatePayload.server = isServer ? null : data.server ? data.server : null;
  }
  if (data.deviceType) {
    const normalizedType = data.deviceType.toLowerCase().trim();
    updatePayload.deviceType = normalizedType;
    if (normalizedType === "server") {
      updatePayload.server = null;
    }
  }
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

  await logActivityAndNotify({
    actor,
    action: "UPDATE_DEVICE",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName} (${device.sl})`,
    details: `Updated device parameters for ${device.deviceName} (SL: ${device.sl})`,
    link: `/devices/${device.deviceType}`,
  });

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${device.deviceType}`);
  revalidatePath(`/devices/${device.deviceType}/${device._id}`);
  if (data.server) {
    revalidatePath(`/devices/server/${data.server}`);
  }

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// UPDATE DEVICE STATUS
// ==========================================
export async function updateDeviceStatus(id: string, status: DeviceStatus) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();
  const device = (await Device.findByIdAndUpdate(id, { status }, { new: true }).lean()) as IDevice | null;
  if (!device) throw new Error("Device not found");

  await logActivityAndNotify({
    actor,
    action: "STATUS_CHANGE",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName} (${device.sl})`,
    details: `Changed device status to "${status}" for ${device.deviceName} (SL: ${device.sl})`,
    link: `/devices/${device.deviceType}`,
  });

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${device.deviceType}`);

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// DELETE DEVICE
// ==========================================
export async function deleteDevice(id: string) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();
  const device = (await Device.findByIdAndDelete(id).lean()) as IDevice | null;
  if (device) {
    await logActivityAndNotify({
      actor,
      action: "DELETE_DEVICE",
      module: "devices",
      resourceId: device.sl,
      resourceName: `${device.deviceName} (${device.sl})`,
      details: `Deleted ${device.deviceType} device: ${device.deviceName} (SL: ${device.sl})`,
    });

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

// ==========================================
// GET ALL DEVICES FOR EXCEL EXPORT
// ==========================================
export async function getAllDevicesForExport(params?: {
  deviceType?: string;
  status?: string;
  brand?: string;
  model?: string;
  search?: string;
}) {
  await requirePermission("devices", "read");
  await connectToDatabase();

  const query: FilterQuery<typeof Device> = {};
  if (params?.deviceType && params.deviceType !== "all") {
    query.deviceType = params.deviceType;
  }
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  }
  if (params?.brand && params.brand !== "all") {
    query.brand = params.brand;
  }
  if (params?.model && params.model !== "all") {
    query.model = params.model;
  }
  if (params?.search && params.search.trim()) {
    const term = params.search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { sl: regex },
      { deviceName: regex },
      { brand: regex },
      { model: regex },
      { ipAddress: regex },
      { macAddress: regex },
      { serialNumber: regex },
      { description: regex },
    ];
  }

  const devices = await Device.find(query).sort({ sl: 1 }).lean();
  return JSON.parse(JSON.stringify(devices)) as IDevice[];
}

// ==========================================
// BULK IMPORT DEVICES FROM EXCEL
// ==========================================
export async function importDevicesBulk(
  rows: Record<string, unknown>[],
  defaultDeviceType?: string
) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  if (!rows || rows.length === 0) {
    throw new Error("No data rows provided for import.");
  }

  let createdCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2;

    const rawType = String(r["Device Type"] || r["Type"] || r["deviceType"] || defaultType(defaultDeviceType) || "antenna").trim().toLowerCase();
    const deviceType = ["switch", "router", "antenna", "access-point", "server"].includes(rawType)
      ? rawType
      : (defaultType(defaultDeviceType) || "antenna");

    const brand = String(r["Brand"] || r["brand"] || "Generic").trim();
    const model = String(r["Model"] || r["model"] || "Standard").trim();
    const deviceName = String(r["Device Name"] || r["Name"] || r["deviceName"] || `${brand} ${model}`).trim();
    const ipAddress = String(r["IP Address"] || r["IP"] || r["ipAddress"] || "").trim();
    const macAddress = String(r["MAC Address"] || r["MAC"] || r["macAddress"] || "").trim().toUpperCase();
    const serialNumber = String(r["Serial Number"] || r["Serial"] || r["serialNumber"] || r["SN"] || "").trim();
    const rawPorts = r["Total Ports"] || r["Ports"] || r["totalPorts"] || 0;
    const totalPorts = deviceType === "switch" ? Math.max(1, Number(rawPorts) || 8) : undefined;
    const rawStatus = String(r["Status"] || r["status"] || "Active").trim();
    const status: DeviceStatus = ["Active", "Inactive", "Maintenance", "Decommissioned"].includes(rawStatus)
      ? (rawStatus as DeviceStatus)
      : "Active";
    const description = String(r["Description"] || r["Notes"] || r["description"] || "").trim();
    const onlineLink = String(r["Online Link"] || r["Portal"] || r["onlineLink"] || "").trim();

    try {
      await createDevice({
        deviceType,
        brand,
        model,
        deviceName,
        ipAddress,
        macAddress,
        serialNumber,
        totalPorts,
        status,
        description,
        onlineLink,
      });
      createdCount++;
    } catch (err) {
      errors.push(`Row ${rowNum} (${deviceName}): ${err instanceof Error ? err.message : "Failed to import"}`);
    }
  }

  if (createdCount > 0) {
    await logActivityAndNotify({
      actor,
      action: "CREATE_DEVICE",
      module: "devices",
      resourceId: "BULK_IMPORT",
      resourceName: `${createdCount} Devices`,
      details: `Bulk imported ${createdCount} devices from Excel file`,
      link: "/devices",
    });

    revalidatePath("/");
    revalidatePath("/devices");
    if (defaultDeviceType) {
      revalidatePath(`/devices/${defaultDeviceType}`);
    }
  }

  return {
    success: true,
    createdCount,
    totalRows: rows.length,
    errors,
  };
}

function defaultType(input?: string): string {
  if (!input || input === "all") return "antenna";
  return input;
}

