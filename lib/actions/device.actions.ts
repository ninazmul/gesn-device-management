"use server";

import { connectToDatabase } from "@/lib/database";
import Device from "@/lib/database/models/device.model";
import Counter from "@/lib/database/models/counter.model";
import Brand from "@/lib/database/models/brand.model";
import DeviceModel from "@/lib/database/models/model.model";
import { formatSL, isValidIPv4, normalizeMAC } from "@/lib/utils";
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
  return formatSL(counter.seq, 3);
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
  brand?: string;
  model?: string;
  deviceName?: string;
  totalPorts?: number;
  uplinkSwitch?: string | null;
  server?: string | null;
  description?: string;
  onlineLink?: string;
  macAddress?: string;
  ipAddress?: string;
  activationDate?: string | Date;
  apNumber?: string;
  customerName?: string;
  customerMobile?: string;
  gpsLink?: string;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  status?: DeviceStatus;
}) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  if (!data.deviceType || !data.deviceType.trim()) {
    throw new Error("Device Type is required");
  }

  // MAC Address is required
  const rawMac = data.macAddress?.trim() || "";
  if (!rawMac) {
    throw new Error("MAC Address is required");
  }

  const normalizedMAC = normalizeMAC(rawMac);
  if (!normalizedMAC) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  // IP Address is optional
  const rawIp = data.ipAddress?.trim() || "";
  if (rawIp && !isValidIPv4(rawIp)) {
    throw new Error("Invalid IPv4 Address format. Example: 192.168.1.100");
  }

  const deviceName = data.deviceName?.trim() || data.model?.trim() || data.brand?.trim() || `${data.deviceType.toUpperCase()} ${normalizedMAC.slice(-5)}`;
  const sl = await getNextSL();

  const isSuperAdmin = actor.role === "super_admin";
  // Non-super-admins cannot activate devices directly; status is forced to "Pending"
  const finalStatus: DeviceStatus = isSuperAdmin ? (data.status || "Active") : "Pending";

  const device = await Device.create({
    sl,
    deviceType: data.deviceType.toLowerCase().trim(),
    brand: data.brand?.trim() || "",
    model: data.model?.trim() || "",
    deviceName,
    totalPorts: data.totalPorts !== undefined && !isNaN(Number(data.totalPorts)) ? Number(data.totalPorts) : undefined,
    uplinkSwitch: data.uplinkSwitch ? data.uplinkSwitch : null,
    server: data.deviceType.toLowerCase().trim() !== "server" && data.server ? data.server : null,
    description: data.description?.trim() || "",
    onlineLink: data.onlineLink?.trim() || "",
    macAddress: normalizedMAC,
    ipAddress: rawIp,
    activationDate: data.activationDate ? new Date(data.activationDate) : new Date(),
    apNumber: data.apNumber?.trim() || "",
    customerName: data.customerName?.trim() || "",
    customerMobile: data.customerMobile?.trim() || "",
    gpsLink: data.gpsLink?.trim() || "",
    gps: {
      latitude: data.gps?.latitude !== undefined && !isNaN(Number(data.gps.latitude)) ? Number(data.gps.latitude) : undefined,
      longitude: data.gps?.longitude !== undefined && !isNaN(Number(data.gps.longitude)) ? Number(data.gps.longitude) : undefined,
    },
    status: finalStatus,
  });

  const logDetails = isSuperAdmin
    ? `Added new ${data.deviceType} device: ${deviceName} (SL: ${sl}, IP: ${rawIp || "N/A"}, Status: ${finalStatus})`
    : `Added new ${data.deviceType} device: ${deviceName} (SL: ${sl}, MAC: ${normalizedMAC}) - Pending Super Admin activation approval.`;

  await logActivityAndNotify({
    actor,
    action: "CREATE_DEVICE",
    module: "devices",
    resourceId: sl,
    resourceName: `${deviceName} (${sl})`,
    details: logDetails,
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

  return JSON.parse(JSON.stringify(device)) as IDevice;
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
    totalPorts?: number;
    uplinkSwitch?: string | null;
    server?: string | null;
    description?: string;
    onlineLink?: string;
    macAddress?: string;
    ipAddress?: string;
    activationDate?: string | Date;
    apNumber?: string;
    customerName?: string;
    customerMobile?: string;
    gpsLink?: string;
    gps?: {
      latitude?: number;
      longitude?: number;
    };
    status?: DeviceStatus;
  }
) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const device = await Device.findById(id);
  if (!device) {
    throw new Error("Device not found");
  }

  const isSuperAdmin = actor.role === "super_admin";
  const updatePayload: Record<string, unknown> = {};

  if (data.deviceType) updatePayload.deviceType = data.deviceType.toLowerCase().trim();
  if (data.brand !== undefined) updatePayload.brand = data.brand.trim();
  if (data.model !== undefined) updatePayload.model = data.model.trim();
  if (data.deviceName !== undefined) updatePayload.deviceName = data.deviceName.trim();
  if (data.totalPorts !== undefined) {
    updatePayload.totalPorts = !isNaN(Number(data.totalPorts)) ? Number(data.totalPorts) : undefined;
  }
  if (data.uplinkSwitch !== undefined) {
    updatePayload.uplinkSwitch = data.uplinkSwitch || null;
  }
  if (data.server !== undefined) {
    updatePayload.server = data.server || null;
  }
  if (data.description !== undefined) updatePayload.description = data.description.trim();
  if (data.onlineLink !== undefined) updatePayload.onlineLink = data.onlineLink.trim();
  
  if (data.macAddress !== undefined) {
    const rawMac = data.macAddress.trim();
    if (rawMac) {
      const normalized = normalizeMAC(rawMac);
      if (!normalized) {
        throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
      }
      updatePayload.macAddress = normalized;
    } else {
      updatePayload.macAddress = "";
    }
  }

  if (data.ipAddress !== undefined) {
    const rawIp = data.ipAddress.trim();
    if (rawIp && !isValidIPv4(rawIp)) {
      throw new Error("Invalid IPv4 Address format. Example: 192.168.1.100");
    }
    updatePayload.ipAddress = rawIp;
  }

  if (data.activationDate !== undefined) {
    updatePayload.activationDate = data.activationDate ? new Date(data.activationDate) : undefined;
  }

  if (data.apNumber !== undefined) updatePayload.apNumber = data.apNumber.trim();
  if (data.customerName !== undefined) updatePayload.customerName = data.customerName.trim();
  if (data.customerMobile !== undefined) updatePayload.customerMobile = data.customerMobile.trim();
  if (data.gpsLink !== undefined) updatePayload.gpsLink = data.gpsLink.trim();

  if (data.gps !== undefined) {
    updatePayload.gps = {
      latitude: data.gps.latitude !== undefined && !isNaN(Number(data.gps.latitude)) ? Number(data.gps.latitude) : undefined,
      longitude: data.gps.longitude !== undefined && !isNaN(Number(data.gps.longitude)) ? Number(data.gps.longitude) : undefined,
    };
  }

  if (data.status) {
    if (data.status === "Active" && !isSuperAdmin && device.status !== "Active") {
      throw new Error("Only Super Admins can activate devices or approve pending devices.");
    }
    updatePayload.status = data.status;
  }

  const updatedDevice = await Device.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!updatedDevice) {
    throw new Error("Device could not be updated");
  }

  await logActivityAndNotify({
    actor,
    action: "UPDATE_DEVICE",
    module: "devices",
    resourceId: updatedDevice.sl,
    resourceName: `${updatedDevice.deviceName} (${updatedDevice.sl})`,
    details: `Updated device details for SL: ${updatedDevice.sl}`,
    link: `/devices/${updatedDevice.deviceType.toLowerCase().trim()}`,
  });

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${updatedDevice.deviceType.toLowerCase().trim()}`);
  if (updatedDevice.uplinkSwitch) {
    revalidatePath(`/devices/switch/${updatedDevice.uplinkSwitch}`);
  }
  if (updatedDevice.server) {
    revalidatePath(`/devices/server/${updatedDevice.server}`);
  }

  return JSON.parse(JSON.stringify(updatedDevice)) as IDevice;
}

// ==========================================
// UPDATE DEVICE STATUS
// ==========================================
export async function updateDeviceStatus(id: string, status: DeviceStatus) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  if (status === "Active" && !isSuperAdmin) {
    throw new Error("Only Super Admins can activate devices or approve pending devices.");
  }

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
// TOGGLE DEVICE ACTIVE (SUPER ADMIN ONLY QUICK TOGGLE)
// ==========================================
export async function toggleDeviceActive(id: string) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  if (actor.role !== "super_admin") {
    throw new Error("Only Super Admins can toggle device activation.");
  }

  const device = await Device.findById(id);
  if (!device) throw new Error("Device not found");

  const newStatus: DeviceStatus = device.status === "Active" ? "Pending" : "Active";
  device.status = newStatus;
  await device.save();

  await logActivityAndNotify({
    actor,
    action: "STATUS_CHANGE",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName} (${device.sl})`,
    details: `Super Admin toggled device #${device.sl} (${device.deviceName}) to ${newStatus}`,
    link: `/devices/${device.deviceType}`,
  });

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${device.deviceType}`);

  return { success: true, newStatus };
}

// ==========================================
// DELETE DEVICE
// ==========================================
export async function deleteDevice(id: string) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const device = await Device.findById(id);
  if (!device) {
    throw new Error("Device not found");
  }

  // Check if any devices are connected to this device as an uplink switch
  const connectedCount = await Device.countDocuments({ uplinkSwitch: id });
  if (connectedCount > 0) {
    throw new Error(
      `Cannot delete this switch. It is currently acting as an uplink switch for ${connectedCount} connected device(s). Reassign them first.`
    );
  }

  // Check if any devices are connected to this device as a server
  const serverClientsCount = await Device.countDocuments({ server: id });
  if (serverClientsCount > 0) {
    throw new Error(
      `Cannot delete this server. It is linked to ${serverClientsCount} client device(s). Reassign them first.`
    );
  }

  await Device.findByIdAndDelete(id);

  await logActivityAndNotify({
    actor,
    action: "DELETE_DEVICE",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName} (${device.sl})`,
    details: `Deleted ${device.deviceType} device: ${device.deviceName} (SL: ${device.sl})`,
    link: "/devices",
  });

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath(`/devices/${device.deviceType.toLowerCase().trim()}`);

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
      { apNumber: regex },
      { customerName: regex },
      { customerMobile: regex },
      { description: regex },
    ];
  }

  const devices = await Device.find(query)
    .populate("server", "sl deviceName brand model")
    .populate("uplinkSwitch", "sl deviceName brand model")
    .sort({ sl: 1 })
    .lean();
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

  // Pre-fetch servers and switches for fast relation resolution
  const [servers, switches] = await Promise.all([
    Device.find({ deviceType: "server" }, { _id: 1, sl: 1, deviceName: 1 }).lean(),
    Device.find({ deviceType: "switch" }, { _id: 1, sl: 1, deviceName: 1 }).lean(),
  ]);

  let createdCount = 0;
  const errors: string[] = [];
  const seenMacsInBatch = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // Row 1 is header in Excel, data starts at Row 2

    // 1. Verification: Skip completely blank rows
    const hasAnyValue = Object.values(r).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    );
    if (!hasAnyValue) {
      continue;
    }

    try {
      // 2. Verification: Device Type (Required)
      const rawType = String(
        r["Device Type"] ||
          r["Type"] ||
          r["deviceType"] ||
          defaultType(defaultDeviceType) ||
          ""
      )
        .trim()
        .toLowerCase();

      const validTypes = ["switch", "router", "antenna", "access-point", "server"];
      if (!rawType) {
        errors.push(`Row ${rowNum}: Device Type is required.`);
        continue;
      }
      if (!validTypes.includes(rawType)) {
        errors.push(
          `Row ${rowNum}: Invalid Device Type "${rawType}". Must be one of: switch, router, antenna, access-point, server.`
        );
        continue;
      }
      const deviceType = rawType;

      // 3. Verification: MAC Address (Required)
      const rawMac = String(
        r["MAC Address"] ||
          r["MAC"] ||
          r["macAddress"] ||
          r["Mac Address"] ||
          r["mac"] ||
          ""
      ).trim();

      if (!rawMac) {
        errors.push(`Row ${rowNum}: MAC Address is required.`);
        continue;
      }

      const macAddress = normalizeMAC(rawMac);
      if (!macAddress) {
        errors.push(
          `Row ${rowNum}: Invalid MAC Address "${rawMac}". Must be a valid 12-hex MAC address (e.g. AA:BB:CC:DD:EE:FF).`
        );
        continue;
      }

      // 4. Verification: Duplicate MAC check within uploaded spreadsheet batch
      if (seenMacsInBatch.has(macAddress)) {
        errors.push(
          `Row ${rowNum}: Duplicate MAC Address "${macAddress}" found within the uploaded spreadsheet.`
        );
        continue;
      }
      seenMacsInBatch.add(macAddress);

      // 5. Verification: Optional IPv4 Address
      const rawIp = String(
        r["IP Address"] || r["IP"] || r["ipAddress"] || r["Ip Address"] || ""
      ).trim();
      let ipAddress = "";
      if (rawIp) {
        if (!isValidIPv4(rawIp)) {
          errors.push(
            `Row ${rowNum}: Invalid IPv4 format "${rawIp}". Example: 192.168.1.100`
          );
          continue;
        }
        ipAddress = rawIp;
      }

      // 6. Optional text fields (Brand, Model, Device Name, Notes, Online Link)
      const brand = String(r["Brand"] || r["brand"] || "").trim();
      const model = String(r["Model"] || r["model"] || "").trim();
      const rawName = String(
        r["Device Name"] || r["Name"] || r["deviceName"] || ""
      ).trim();
      const deviceName =
        rawName || model || brand || `${deviceType.toUpperCase()} ${macAddress.slice(-5)}`;
      const description = String(r["Description"] || r["Notes"] || r["description"] || "").trim();
      const onlineLink = String(
        r["Online Link"] || r["Portal"] || r["Management URL"] || r["onlineLink"] || ""
      ).trim();

      // 7. Verification: Optional Switch Ports
      const rawPorts = r["Total Ports"] || r["Ports"] || r["totalPorts"];
      let totalPorts: number | undefined = undefined;
      if (deviceType === "switch") {
        if (rawPorts !== undefined && rawPorts !== null && rawPorts !== "") {
          const numPorts = Number(rawPorts);
          if (!isNaN(numPorts) && numPorts > 0) {
            totalPorts = Math.floor(numPorts);
          } else {
            totalPorts = 8;
          }
        } else {
          totalPorts = 8;
        }
      }

      // 8. Verification: Status (Forced to "Pending" for non-super-admins)
      const isSuperAdmin = actor.role === "super_admin";
      const rawStatus = String(r["Status"] || r["status"] || "").trim();
      let status: DeviceStatus = "Pending";
      if (isSuperAdmin) {
        status = ["Pending", "Active", "Available", "Offline", "Maintenance", "Inactive", "Retired"].includes(rawStatus)
          ? (rawStatus as DeviceStatus)
          : "Active";
      }

      // 9. Verification: Optional Server lookup
      const rawServer = String(
        r["Server"] || r["Connected Server"] || r["Server SL"] || r["server"] || ""
      ).trim();
      let serverId: string | null = null;
      if (rawServer && deviceType !== "server") {
        const found = (servers as Array<{ _id: unknown; sl?: string; deviceName?: string }>).find(
          (s) =>
            s.sl?.toLowerCase() === rawServer.toLowerCase() ||
            s.deviceName?.toLowerCase() === rawServer.toLowerCase() ||
            String(s._id) === rawServer
        );
        if (found) serverId = String(found._id);
      }

      // 10. Verification: Optional Uplink Switch lookup
      const rawSwitch = String(
        r["Uplink Switch"] || r["Switch"] || r["Switch SL"] || r["uplinkSwitch"] || ""
      ).trim();
      let switchId: string | null = null;
      if (rawSwitch && ["antenna", "access-point", "router"].includes(deviceType)) {
        const found = (switches as Array<{ _id: unknown; sl?: string; deviceName?: string }>).find(
          (sw) =>
            sw.sl?.toLowerCase() === rawSwitch.toLowerCase() ||
            sw.deviceName?.toLowerCase() === rawSwitch.toLowerCase() ||
            String(sw._id) === rawSwitch
        );
        if (found) switchId = String(found._id);
      }

      // 11. Optional AP & Customer fields
      const apNumber = String(r["AP Number"] || r["AP"] || r["apNumber"] || "").trim();
      const customerName = String(r["Customer Name"] || r["Customer"] || r["customerName"] || "").trim();
      const customerMobile = String(
        r["Customer Mobile"] || r["Mobile Number"] || r["Mobile"] || r["Phone"] || r["customerMobile"] || ""
      ).trim();
      const gpsLink = String(r["GPS Link"] || r["Map Link"] || r["gpsLink"] || "").trim();

      // 12. Verification: Optional GPS Coordinates
      const rawLat = r["GPS Latitude"] ?? r["Latitude"] ?? r["Lat"] ?? r["gpsLatitude"];
      const rawLng = r["GPS Longitude"] ?? r["Longitude"] ?? r["Lng"] ?? r["Long"] ?? r["gpsLongitude"];
      let latNum: number | undefined = undefined;
      let lngNum: number | undefined = undefined;
      if (rawLat !== undefined && rawLat !== null && rawLat !== "" && !isNaN(Number(rawLat))) {
        const parsedLat = Number(rawLat);
        if (parsedLat >= -90 && parsedLat <= 90) latNum = parsedLat;
      }
      if (rawLng !== undefined && rawLng !== null && rawLng !== "" && !isNaN(Number(rawLng))) {
        const parsedLng = Number(rawLng);
        if (parsedLng >= -180 && parsedLng <= 180) lngNum = parsedLng;
      }
      const gps =
        latNum !== undefined || lngNum !== undefined
          ? { latitude: latNum, longitude: lngNum }
          : undefined;

      // 13. Verification: Optional Activation Date
      const rawActDate = r["Activation Date"] ?? r["Date of Activation"] ?? r["activationDate"];
      let activationDate: Date | undefined;
      if (rawActDate) {
        if (rawActDate instanceof Date && !isNaN(rawActDate.getTime())) {
          activationDate = rawActDate;
        } else if (typeof rawActDate === "string" || typeof rawActDate === "number") {
          const parsed = new Date(rawActDate);
          if (!isNaN(parsed.getTime())) activationDate = parsed;
        }
      }

      // Execute createDevice in isolated row try/catch
      await createDevice({
        deviceType,
        brand,
        model,
        deviceName,
        ipAddress,
        macAddress,
        totalPorts,
        server: serverId,
        uplinkSwitch: switchId,
        apNumber: ["access-point"].includes(deviceType) ? apNumber : undefined,
        customerName: ["access-point", "router"].includes(deviceType) ? customerName : undefined,
        customerMobile: ["access-point", "router"].includes(deviceType) ? customerMobile : undefined,
        gpsLink: ["access-point", "router"].includes(deviceType) ? gpsLink : undefined,
        gps,
        activationDate,
        status,
        description,
        onlineLink,
      });

      createdCount++;
    } catch (err) {
      // Individual row failure never stops the remaining batch
      const errMsg = err instanceof Error ? err.message : "Unknown error creating device";
      errors.push(`Row ${rowNum}: ${errMsg}`);
    }
  }

  // If any devices were created, log activity and revalidate paths
  if (createdCount > 0) {
    await logActivityAndNotify({
      actor,
      action: "CREATE_DEVICE",
      module: "devices",
      resourceId: "BULK_IMPORT",
      resourceName: `${createdCount} Devices`,
      details: `Bulk imported ${createdCount} devices from Excel file (${errors.length} skipped/failed)`,
      link: "/devices",
    });

    revalidatePath("/");
    revalidatePath("/devices");
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
