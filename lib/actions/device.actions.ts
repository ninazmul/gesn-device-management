"use server";

import { connectToDatabase } from "@/lib/database";
import Device from "@/lib/database/models/device.model";
import DeviceModel from "@/lib/database/models/model.model";
import DeviceType from "@/lib/database/models/deviceType.model";
import Counter from "@/lib/database/models/counter.model";
import Notification from "@/lib/database/models/notification.model";
import ActivityLog from "@/lib/database/models/activityLog.model";
import { formatSL, isValidIPv4, normalizeMAC } from "@/lib/utils";
import {
  DEVICE_REJECTION_REASONS,
  DEVICE_STATUSES,
  PRIMARY_DEVICE_TYPES,
  STORAGE_DEVICE_CATEGORIES,
  getStorageDeviceCategoryName,
} from "@/lib/constants";
import {
  getFlexibleField,
  safeParseDate,
  safeParseNumber,
  safeParseString,
} from "@/lib/excel";
import { revalidatePath } from "next/cache";
import type { FilterQuery } from "mongoose";
import type {
  DeviceStatus,
  GetDevicesParams,
  IDevice,
  ISwitchOption,
  IServerOption,
} from "@/types";
import {
  getCurrentAdminProfile,
  requirePermission,
  logActivityAndNotify,
} from "@/lib/auth-guard";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore when executed outside Next.js request context (e.g. scripts/tests)
  }
}

function canSelectConnectedServer(
  actor: Awaited<ReturnType<typeof getCurrentAdminProfile>>,
) {
  if (!actor) return false;
  return (
    actor.role === "super_admin" ||
    actor.role === "engineer" ||
    Boolean(actor.granularPermissions?.server_view) ||
    (actor.permissions?.devices === "write" &&
      Boolean(actor.granularPermissions?.device_add))
  );
}

const SELECTABLE_SERVER_STATUSES = [
  "Pending",
  "Frozen",
  "Lost",
] as const;

async function validateConnectedServer(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentAdminProfile>>>,
  serverId: string,
) {
  if (!canSelectConnectedServer(actor)) {
    throw new Error(
      "Forbidden: You do not have permission to select a Connected Server.",
    );
  }

  const serverExists = await Device.exists({
    _id: serverId,
    deviceType: "server",
    status: { $nin: SELECTABLE_SERVER_STATUSES },
  });
  if (!serverExists) {
    throw new Error(
      "The selected Connected Server is unavailable or you do not have access to it.",
    );
  }
}

// Helper to generate next sequential SL (e.g. "000001")
async function getNextSL(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    "device_sl",
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
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
    status: { $nin: SELECTABLE_SERVER_STATUSES },
  })
    .select("sl deviceName ipAddress status totalPorts")
    .sort({ deviceName: 1 })
    .lean();

  if (switches.length === 0) return [];

  const switchIds = switches.map((s) => s._id);

  // Aggregate count of devices connected to each switch
  const connections = await Device.aggregate([
    {
      $match: {
        uplinkSwitch: { $in: switchIds },
        status: { $nin: SELECTABLE_SERVER_STATUSES },
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
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();

  if (!canSelectConnectedServer(actor)) return [];

  const servers = await Device.find({
    deviceType: "server",
    status: { $nin: SELECTABLE_SERVER_STATUSES },
  })
    .select("sl deviceName ipAddress status")
    .sort({ deviceName: 1 })
    .lean();

  return JSON.parse(JSON.stringify(servers));
}

// ==========================================
// GET DEVICES (PAGINATED & SERVER FILTERED)
// ==========================================
export async function getDevices(params?: GetDevicesParams) {
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canViewServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_view);

  const {
    deviceType,
    status,
    statuses,
    server,
    search = "",
    sortBy: requestedSortBy,
    page = 1,
    limit = 25,
  } = params || {};
  const isAccessPointQuery =
    deviceType?.toLowerCase().trim() === "access-point";
  const sortBy = requestedSortBy || (isAccessPointQuery ? "sl_desc" : "sl_asc");

  const skip = (Math.max(1, page) - 1) * limit;
  const query: FilterQuery<typeof Device> = {};

  if (deviceType && deviceType !== "all") {
    const requestedType = deviceType.toLowerCase().trim();
    if (requestedType === "server" && !canViewServer) {
      return {
        devices: [] as unknown as IDevice[],
        total: 0,
        totalPages: 0,
        currentPage: 1,
        limit,
      };
    }
    query.deviceType = requestedType;
  } else if (!canViewServer) {
    // When viewing general inventory, hide server hardware for unauthorized users
    query.deviceType = { $ne: "server" };
  }

  if (statuses?.length) {
    query.status =
      status && status !== "all" && statuses.includes(status as DeviceStatus)
        ? status
        : { $in: statuses };
  } else if (status && status !== "all") {
    query.status = status;
  } else if (!params?.submittedBy) {
    // Pending devices are isolated to the approval queue.
    query.status = { $ne: "Pending" };
  }

  if (server && server !== "all") {
    query.server = server;
  }

  if (params?.submittedBy && params.submittedBy !== "all") {
    query["submittedBy.email"] = params.submittedBy.toLowerCase().trim();
  }

  if (search && search.trim()) {
    const term = search.trim();
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedTerm, "i");
    const apNumberRegex = /^\d+$/.test(term)
      ? new RegExp(`(?:^|\\D)${escapedTerm}$`, "i")
      : regex;

    // Find servers whose name matches the search term so we can match devices by server
    const matchingServerIds = await Device.find({
      deviceType: "server",
      deviceName: regex,
    })
      .select("_id")
      .lean()
      .then((docs) => docs.map((d) => d._id));

    query.$or = [
      ...(isAccessPointQuery ? [{ apNumber: apNumberRegex }] : []),
      { sl: regex },
      { deviceName: regex },
      { ipAddress: regex },
      { macAddress: regex },
      { description: regex },
      ...(matchingServerIds.length > 0
        ? [{ server: { $in: matchingServerIds } }]
        : []),
    ];
  }

  // Sorting
  let sortObj: Record<string, 1 | -1> = { sl: 1 };
  let numericApNumberSort = false;
  switch (sortBy) {
    case "oldest":
      sortObj = { createdAt: 1 };
      break;
    case "sl_asc":
      if (isAccessPointQuery) {
        sortObj = { apNumber: 1, sl: 1 };
        numericApNumberSort = true;
      } else {
        sortObj = { sl: 1 };
      }
      break;
    case "sl_desc":
      if (isAccessPointQuery) {
        sortObj = { apNumber: -1, sl: -1 };
        numericApNumberSort = true;
      } else {
        sortObj = { sl: -1 };
      }
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
    case "ap_asc":
      if (isAccessPointQuery) {
        sortObj = { apNumber: 1, sl: 1 };
        numericApNumberSort = true;
      }
      break;
    case "ap_desc":
      if (isAccessPointQuery) {
        sortObj = { apNumber: -1, sl: -1 };
        numericApNumberSort = true;
      }
      break;
    case "newest":
      sortObj = { createdAt: -1 };
      break;
    default:
      sortObj = { sl: 1 };
      break;
  }

  const deviceQuery = Device.find(query)
    .populate("uplinkSwitch", "sl deviceName totalPorts ipAddress status")
    .populate("server", "sl deviceName ipAddress status")
    .sort(sortObj)
    .skip(skip)
    .limit(limit);
  if (numericApNumberSort) {
    deviceQuery.collation({ locale: "en", numericOrdering: true });
  }

  const [rawDevices, total] = await Promise.all([
    deviceQuery.lean(),
    Device.countDocuments(query),
  ]);

  const devices = rawDevices as unknown as IDevice[];

  // For switches in the returned list, calculate connected devices count
  const switchIds = devices
    .filter((d) => d.deviceType === "switch")
    .map((d) => d._id);
  const switchCountMap = new Map<string, number>();
  if (switchIds.length > 0) {
    const counts = await Device.aggregate([
      {
        $match: {
          uplinkSwitch: { $in: switchIds },
          status: { $nin: ["Frozen", "Lost"] },
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
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();
  const device = (await Device.findById(id)
    .populate("uplinkSwitch", "sl deviceName totalPorts ipAddress status")
    .populate("server", "sl deviceName ipAddress status")
    .lean()) as unknown as IDevice | null;
  if (!device) return null;

  // If the device is a switch, fetch connected downlink devices and compute metrics
  if (device.deviceType === "switch") {
    const connectedDevices = (await Device.find({ uplinkSwitch: id })
      .select("sl deviceName deviceType ipAddress macAddress status")
      .sort({ sl: 1 })
      .lean()) as unknown as IDevice[];

    const totalPorts = device.totalPorts || 0;
    const activePortsCount = connectedDevices.filter(
      (d) => d.status !== "Frozen" && d.status !== "Lost",
    ).length;
    const availablePorts = Math.max(0, totalPorts - activePortsCount);

    return JSON.parse(
      JSON.stringify({
        ...device,
        connectedDevices,
        activePortsCount,
        availablePorts,
      }),
    );
  }

  // If the device is a server, verify server_view permission
  if (device.deviceType === "server") {
    const isSuperAdmin = actor.role === "super_admin";
    const isEngineer = actor.role === "engineer";
    const canViewServer =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.server_view);
    if (!canViewServer) {
      throw new Error(
        "Forbidden: You do not have permission to view server hardware.",
      );
    }

    const connectedDevices = (await Device.find({ server: id })
      .select("sl deviceName deviceType ipAddress macAddress status")
      .sort({ sl: 1 })
      .lean()) as unknown as IDevice[];

    return JSON.parse(
      JSON.stringify({
        ...device,
        connectedDevices,
      }),
    );
  }

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// CREATE DEVICE
// ==========================================
export async function createDevice(data: {
  deviceType: string;
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
  status?: DeviceStatus;
  rejectionReason?: string;
}) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canAdd = isSuperAdmin || Boolean(actor.granularPermissions?.device_add);
  if (!canAdd) {
    throw new Error("Forbidden: You do not have permission to add devices.");
  }

  if (!data.deviceType || !data.deviceType.trim()) {
    throw new Error("Device Type is required");
  }

  const type = data.deviceType.toLowerCase().trim();

  // If registering a server, check server_manage permission
  if (type === "server") {
    const canManageServer =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.server_manage);
    if (!canManageServer) {
      throw new Error(
        "Forbidden: You do not have permission to register server hardware.",
      );
    }
  }

  // 1. MAC Address is required for ALL device forms
  const rawMac = data.macAddress?.trim() || "";
  if (!rawMac) {
    throw new Error("MAC Address is required");
  }

  const normalizedMAC = normalizeMAC(rawMac);
  if (!normalizedMAC) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  // 2. Register devices only when their MAC is already present in Storage.
  const existingDevice = await Device.findOne({
    macAddress: normalizedMAC,
    status: "Storage",
  });
  if (!existingDevice) {
    const conflictingDevice = await Device.findOne({
      macAddress: normalizedMAC,
    });
    if (!conflictingDevice) {
      throw new Error(
        `No device with MAC address ${normalizedMAC} is available in Storage. Add it to Storage first.`,
      );
    }
    throw new Error(
      `Device with MAC address ${normalizedMAC} is not available in Storage (current status: ${conflictingDevice.status}, SL: #${conflictingDevice.sl}). Only devices currently in Storage can be added.`,
    );
  }

  // 3. Strict type-specific required fields validation
  if (type === "access-point") {
    if (!data.apNumber?.trim())
      throw new Error("AP Number is required for Access Point");
    if (!data.server)
      throw new Error("Connected Server is required for Access Point");
    if (!data.customerName?.trim())
      throw new Error("Customer Name is required for Access Point");
    if (!data.customerMobile?.trim())
      throw new Error("Mobile Number is required for Access Point");
    if (!data.gpsLink?.trim())
      throw new Error("GPS Link is required for Access Point");
    if (!data.description?.trim())
      throw new Error("Description is required for Access Point");
  } else if (type === "router") {
    if (!data.server)
      throw new Error("Connected Server is required for Router");
    if (!data.customerName?.trim())
      throw new Error("Customer Name is required for Router");
    if (!data.customerMobile?.trim())
      throw new Error("Mobile Number is required for Router");
    if (!data.gpsLink?.trim())
      throw new Error("GPS Link is required for Router");
    if (!data.description?.trim())
      throw new Error("Description is required for Router");
  } else if (type === "switch") {
    if (!data.server)
      throw new Error("Connected Server is required for Switch");
    if (!data.gpsLink?.trim())
      throw new Error("GPS Link / Location is required for Switch");
    if (!data.description?.trim())
      throw new Error("Description is required for Switch");
  } else if (type === "antenna") {
    if (!data.server)
      throw new Error("Connected Server is required for Antenna");
    if (!data.gpsLink?.trim())
      throw new Error("Location / GPS Link is required for Antenna");
    if (!data.description?.trim())
      throw new Error("Description is required for Antenna");
  }

  if (data.server && type !== "server") {
    await validateConnectedServer(actor, data.server);
  }

  // IP Address is optional
  const rawIp = data.ipAddress?.trim() || "";
  if (rawIp && !isValidIPv4(rawIp)) {
    throw new Error("Invalid IPv4 Address format. Example: 192.168.1.100");
  }

  const deviceName =
    data.deviceName?.trim() ||
    `${data.deviceType.toUpperCase()} ${normalizedMAC.slice(-5)}`;
  // Devices registered from Storage must be approved before becoming Online.
  const finalStatus: DeviceStatus = "Pending";

  existingDevice.set({
    deviceType: type,
    deviceName,
    totalPorts:
      data.totalPorts !== undefined && Number.isFinite(Number(data.totalPorts))
        ? Number(data.totalPorts)
        : undefined,
    uplinkSwitch: data.uplinkSwitch ? data.uplinkSwitch : null,
    server: type !== "server" && data.server ? data.server : null,
    description: data.description?.trim() || "",
    onlineLink: data.onlineLink?.trim() || "",
    macAddress: normalizedMAC,
    ipAddress: rawIp,
    activationDate: data.activationDate
      ? new Date(data.activationDate)
      : undefined,
    apNumber: data.apNumber?.trim() || "",
    customerName: data.customerName?.trim() || "",
    customerMobile: data.customerMobile?.trim() || "",
    gpsLink: data.gpsLink?.trim() || "",
    status: finalStatus,
    rejectionReason: "",
    submittedBy: {
      email: actor.email,
      name: actor.name || actor.email.split("@")[0],
      role: actor.role,
      userId: actor._id,
      date: new Date(),
    },
  });
  existingDevice.approvedBy = undefined;
  existingDevice.rejectedBy = undefined;
  const device = await existingDevice.save();
  const sl = device.sl;

  const logDetails = `Registered ${data.deviceType} device from Storage: ${deviceName} (SL: ${sl}, MAC: ${normalizedMAC}) - Pending Super Admin / Engineer approval.`;

  await logActivityAndNotify({
    actor,
    action: "CREATE_DEVICE",
    module: "devices",
    resourceId: sl,
    resourceName: `${deviceName} (${sl})`,
    details: logDetails,
    link: `/devices/${type}`,
  });

  // When submitted as Pending, ensure both Super Admin and Engineer receive notification with direct link to pending approvals
  if (finalStatus === "Pending") {
    await Notification.create({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "DEVICE_SUBMISSION",
      module: "devices",
      title: `New Device Submission: ${type.toUpperCase()}`,
      message: `New ${type} device (${deviceName}, MAC: ${normalizedMAC}) submitted by ${actor.name || actor.email} (${actor.role}) at ${new Date().toLocaleTimeString()} — Status: Pending Approval.`,
      link: `/devices/pending`,
      readBy: [],
    });
  }

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath("/devices/storage");
  safeRevalidatePath("/devices/pending");
  safeRevalidatePath(`/devices/${type}`);
  if (data.uplinkSwitch) {
    safeRevalidatePath(`/devices/switch/${data.uplinkSwitch}`);
  }
  if (data.server) {
    safeRevalidatePath(`/devices/server/${data.server}`);
  }

  return JSON.parse(JSON.stringify(device)) as IDevice;
}

export async function createDeviceWithResult(
  data: Parameters<typeof createDevice>[0],
): Promise<
  { success: true; device: IDevice } | { success: false; error: string }
> {
  try {
    return { success: true, device: await createDevice(data) };
  } catch (error) {
    console.error("Manual device creation failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create device.",
    };
  }
}

// ==========================================
// UPDATE DEVICE
// ==========================================
export async function updateDevice(
  id: string,
  data: {
    deviceType?: string;
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
    status?: DeviceStatus;
  },
) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const device = await Device.findById(id);
  if (!device) {
    throw new Error("Device not found");
  }

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canResubmitRejected =
    device.status === "Frozen" &&
    Boolean(device.rejectedBy?.reason || device.rejectionReason) &&
    actor.role === "editor";
  const canEdit =
    isSuperAdmin ||
    Boolean(actor.granularPermissions?.device_edit) ||
    canResubmitRejected;
  if (!canEdit) {
    throw new Error("Forbidden: You do not have permission to edit devices.");
  }

  const updatePayload: Record<string, unknown> = {};

  const requestedType =
    data.deviceType?.toLowerCase().trim() || device.deviceType;
  const canManageServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_manage);
  if (
    (requestedType === "server" || device.deviceType === "server") &&
    !canManageServer
  ) {
    throw new Error(
      "Forbidden: You do not have permission to manage server hardware.",
    );
  }

  if (data.deviceType)
    updatePayload.deviceType = data.deviceType.toLowerCase().trim();
  if (data.deviceName !== undefined)
    updatePayload.deviceName = data.deviceName.trim();
  if (data.totalPorts !== undefined) {
    updatePayload.totalPorts = !isNaN(Number(data.totalPorts))
      ? Number(data.totalPorts)
      : undefined;
  }
  if (data.uplinkSwitch !== undefined) {
    updatePayload.uplinkSwitch = data.uplinkSwitch || null;
  }
  if (data.server !== undefined) {
    updatePayload.server = data.server || null;
  }
  if (data.description !== undefined)
    updatePayload.description = data.description.trim();
  if (data.onlineLink !== undefined)
    updatePayload.onlineLink = data.onlineLink.trim();

  if (data.macAddress !== undefined) {
    const rawMac = data.macAddress.trim();
    if (rawMac) {
      const normalized = normalizeMAC(rawMac);
      if (!normalized) {
        throw new Error(
          "Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF",
        );
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
    updatePayload.activationDate = data.activationDate
      ? new Date(data.activationDate)
      : undefined;
  }

  if (data.apNumber !== undefined)
    updatePayload.apNumber = data.apNumber.trim();
  if (data.customerName !== undefined)
    updatePayload.customerName = data.customerName.trim();
  if (data.customerMobile !== undefined)
    updatePayload.customerMobile = data.customerMobile.trim();
  if (data.gpsLink !== undefined) updatePayload.gpsLink = data.gpsLink.trim();

  const isResubmission =
    device.status === "Frozen" &&
    Boolean(device.rejectedBy?.reason || device.rejectionReason);
  if (isResubmission) {
    updatePayload.status = "Pending";
    updatePayload.rejectionReason = "";
    updatePayload.submittedBy = {
      email: actor.email,
      name: actor.name || actor.email.split("@")[0],
      role: actor.role,
      userId: actor._id,
      date: new Date(),
    };
  } else if (data.status) {
    const canApprove =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.device_approve);
    if (
      data.status === "Online" &&
      !canApprove &&
      device.status !== data.status
    ) {
      throw new Error(
        "Forbidden: You do not have permission to set devices Online.",
      );
    }
    if (
      ["Frozen", "Lost"].includes(data.status) &&
      !isSuperAdmin &&
      !actor.granularPermissions?.device_archive
    ) {
      throw new Error(
        "Forbidden: You do not have permission to freeze or archive devices.",
      );
    }
    updatePayload.status = data.status;
    if (data.status === "Online" && device.status !== "Online") {
      updatePayload.approvedBy = {
        email: actor.email,
        name: actor.name || actor.email.split("@")[0],
        role: actor.role,
        userId: actor._id,
        date: new Date(),
      };
      updatePayload.rejectionReason = "";
    }
  }

  const updatedDevice = await Device.findOneAndUpdate(
    isResubmission ? { _id: id, status: "Frozen" } : { _id: id },
    updatePayload,
    { new: true, runValidators: true },
  );

  if (!updatedDevice) {
    throw new Error(
      isResubmission
        ? "Device could not be resubmitted. Its status may have changed; refresh and try again."
        : "Device could not be updated",
    );
  }

  const deviceLink = `/devices/${updatedDevice.deviceType.toLowerCase().trim()}/${updatedDevice._id}`;
  const resourceName = `${updatedDevice.deviceName} (${updatedDevice.sl})`;
  if (isResubmission) {
    await ActivityLog.create({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "RESUBMIT_DEVICE",
      module: "devices",
      resourceId: updatedDevice.sl,
      resourceName,
      details: `Corrected and resubmitted device #${updatedDevice.sl} (${updatedDevice.deviceName}) for approval.`,
      metadata: { deviceId: String(updatedDevice._id), status: "Pending" },
    });
    await Notification.create({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "DEVICE_SUBMISSION",
      module: "devices",
      title: `Device Resubmitted: ${updatedDevice.deviceName}`,
      message: `Device #${updatedDevice.sl} (${updatedDevice.deviceName}, ${updatedDevice.deviceType.toUpperCase()}) was corrected and resubmitted by ${actor.name || actor.email} (${actor.role}) for approval.`,
      link: "/devices/pending",
      readBy: [actor.email.toLowerCase()],
    });
  } else {
    const action =
      updatePayload.status === "Online"
        ? "DEVICE_APPROVAL"
        : updatePayload.status === "Pending"
          ? "DEVICE_SUBMISSION"
          : "UPDATE_DEVICE";
    await logActivityAndNotify({
      actor,
      action,
      module: "devices",
      resourceId: updatedDevice.sl,
      resourceName,
      details: `Updated device details for SL: ${updatedDevice.sl}`,
      link: deviceLink,
    });
  }

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath("/devices/pending");
  safeRevalidatePath(
    `/devices/${updatedDevice.deviceType.toLowerCase().trim()}`,
  );
  if (updatedDevice.uplinkSwitch) {
    safeRevalidatePath(`/devices/switch/${updatedDevice.uplinkSwitch}`);
  }
  if (updatedDevice.server) {
    safeRevalidatePath(`/devices/server/${updatedDevice.server}`);
  }

  return JSON.parse(JSON.stringify(updatedDevice)) as IDevice;
}

// ==========================================
// APPROVE DEVICE (SUPER ADMIN OR ENGINEER)
// ==========================================
export async function approveDevice(id: string) {
  await connectToDatabase();
  const actor = await getCurrentAdminProfile();
  if (!actor) {
    throw new Error(
      "Unauthorized: Access is restricted to authorized administrators.",
    );
  }

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canApprove =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.device_approve);

  if (!canApprove) {
    throw new Error(
      "Forbidden: You do not have permission to approve devices.",
    );
  }

  const device = await Device.findById(id);
  if (!device) throw new Error("Device not found");

  if (device.deviceType === "server") {
    const canManageServer =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.server_manage);
    if (!canManageServer) {
      throw new Error(
        "Forbidden: You do not have permission to approve server hardware.",
      );
    }
  }

  if (device.status === "Online") {
    throw new Error("Device has already been approved and is Online.");
  }
  if (
    device.status === "Frozen" &&
    (device.rejectionReason || device.rejectedBy?.reason)
  ) {
    throw new Error("Frozen rejected devices must be resubmitted before approval.");
  }
  if (device.status !== "Pending") {
    throw new Error(
      `Device cannot be approved because its current status is '${device.status}'. Only Pending devices can be approved.`,
    );
  }

  // Atomic state transition to prevent race conditions during concurrent approval clicks
  const updatedDevice = await Device.findOneAndUpdate(
    { _id: id, status: "Pending" },
    {
      $set: {
        status: "Online",
        approvedBy: {
          email: actor.email,
          name: actor.name || actor.email.split("@")[0],
          role: actor.role,
          userId: actor._id,
          date: new Date(),
        },
        rejectionReason: "",
      },
    },
    { new: true },
  );

  if (!updatedDevice) {
    throw new Error(
      "Device could not be approved. It may have already been processed by another administrator.",
    );
  }

  await ActivityLog.create({
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "APPROVE_DEVICE",
    module: "devices",
    resourceId: updatedDevice.sl,
    resourceName: `${updatedDevice.deviceName} (${updatedDevice.sl})`,
    details: `${actor.name || actor.email} (${actor.role}) approved device #${updatedDevice.sl} (${updatedDevice.deviceName}) - Status is now Online`,
    metadata: {
      deviceId: String(updatedDevice._id),
      sl: updatedDevice.sl,
      action: "APPROVE",
      approverName: actor.name || actor.email,
      approverUserId: actor._id,
      approverRole: actor.role,
      date: new Date().toISOString(),
    },
  });

  // Mark prior submission notifications as read
  await Notification.updateMany(
    {
      action: "DEVICE_SUBMISSION",
      module: "devices",
      $or: [
        { link: { $regex: String(id) } },
        { message: { $regex: String(updatedDevice.sl) } },
      ],
    },
    { $addToSet: { readBy: actor.email.toLowerCase() } },
  );

  // Send approval notification
  await Notification.create({
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "DEVICE_APPROVAL",
    module: "devices",
    title: `Device Approved: ${updatedDevice.deviceName}`,
    message: `Device #${updatedDevice.sl} (${updatedDevice.deviceName}, ${updatedDevice.deviceType.toUpperCase()}) was approved by ${actor.name || actor.email} (${actor.role}). Status is now Online.`,
    link: `/devices/${updatedDevice.deviceType.toLowerCase().trim()}/${updatedDevice._id}`,
    readBy: [actor.email.toLowerCase()],
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath("/devices/pending");
  safeRevalidatePath(
    `/devices/${updatedDevice.deviceType.toLowerCase().trim()}`,
  );
  safeRevalidatePath(
    `/devices/${updatedDevice.deviceType.toLowerCase().trim()}/${updatedDevice._id}`,
  );

  return JSON.parse(JSON.stringify(updatedDevice)) as IDevice;
}

// ==========================================
// REJECT DEVICE (SUPER ADMIN OR ENGINEER)
// ==========================================
export async function rejectDevice(id: string, reason: string) {
  await connectToDatabase();
  const actor = await getCurrentAdminProfile();
  if (!actor) {
    throw new Error(
      "Unauthorized: Access is restricted to authorized administrators.",
    );
  }

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canApprove =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.device_approve);

  if (!canApprove) {
    throw new Error(
      "Forbidden: You do not have permission to reject and freeze devices.",
    );
  }

  const device = await Device.findById(id);
  if (!device) throw new Error("Device not found");

  if (device.deviceType === "server") {
    const canManageServer =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.server_manage);
    if (!canManageServer) {
      throw new Error(
        "Forbidden: You do not have permission to reject server hardware.",
      );
    }
  }

  const cleanReason = reason.trim();
  if (
    !cleanReason ||
    !DEVICE_REJECTION_REASONS.includes(
      cleanReason as (typeof DEVICE_REJECTION_REASONS)[number],
    )
  ) {
    throw new Error("Please select a valid rejection reason.");
  }

  if (device.status === "Online") {
    throw new Error("Device has already been approved and cannot be rejected.");
  }
  if (device.status === "Frozen" && device.rejectedBy?.reason) {
    throw new Error("Device has already been rejected and frozen.");
  }
  if (device.status !== "Pending") {
    throw new Error(
      `Device cannot be rejected because its current status is '${device.status}'. Only Pending devices can be rejected.`,
    );
  }

  // Atomic state transition to prevent race conditions during concurrent rejection clicks
  const updatedDevice = await Device.findOneAndUpdate(
    { _id: id, status: "Pending" },
    {
      $set: {
        status: "Frozen",
        rejectedBy: {
          email: actor.email,
          name: actor.name || actor.email.split("@")[0],
          role: actor.role,
          userId: actor._id,
          date: new Date(),
          reason: cleanReason,
        },
        rejectionReason: cleanReason,
      },
    },
    { new: true },
  );

  if (!updatedDevice) {
    throw new Error(
      "Device could not be rejected and frozen. It may have already been processed by another administrator.",
    );
  }

  await ActivityLog.create({
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "REJECT_DEVICE",
    module: "devices",
    resourceId: updatedDevice.sl,
    resourceName: `${updatedDevice.deviceName} (${updatedDevice.sl})`,
    details: `${actor.name || actor.email} (${actor.role}) rejected and froze device #${updatedDevice.sl} (${updatedDevice.deviceName}). Reason: ${cleanReason}`,
    metadata: {
      deviceId: String(updatedDevice._id),
      sl: updatedDevice.sl,
      action: "REJECT",
      approverName: actor.name || actor.email,
      approverUserId: actor._id,
      approverRole: actor.role,
      rejectionReason: cleanReason,
      date: new Date().toISOString(),
    },
  });

  // Mark prior submission notifications as read
  await Notification.updateMany(
    {
      action: "DEVICE_SUBMISSION",
      module: "devices",
      $or: [
        { link: { $regex: String(id) } },
        { message: { $regex: String(updatedDevice.sl) } },
      ],
    },
    { $addToSet: { readBy: actor.email.toLowerCase() } },
  );

  // Send notification that the rejected device was frozen.
  await Notification.create({
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "DEVICE_REJECTION",
    module: "devices",
    title: `Device Frozen: ${updatedDevice.deviceName}`,
    message: `Device #${updatedDevice.sl} (${updatedDevice.deviceName}, ${updatedDevice.deviceType.toUpperCase()}) was rejected and frozen by ${actor.name || actor.email} (${actor.role}). Reason: ${cleanReason}`,
    link: `/devices/${updatedDevice.deviceType.toLowerCase().trim()}/${updatedDevice._id}`,
    recipientEmails: updatedDevice.submittedBy?.email
      ? [updatedDevice.submittedBy.email.toLowerCase()]
      : [],
    readBy: [actor.email.toLowerCase()],
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath("/devices/pending");
  safeRevalidatePath(
    `/devices/${updatedDevice.deviceType.toLowerCase().trim()}`,
  );
  safeRevalidatePath(
    `/devices/${updatedDevice.deviceType.toLowerCase().trim()}/${updatedDevice._id}`,
  );

  return JSON.parse(JSON.stringify(updatedDevice)) as IDevice;
}

// ==========================================
// GET PENDING DEVICES FOR APPROVAL
// ==========================================
export async function getPendingDevices(params?: {
  deviceType?: string;
  status?: string;
  server?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) {
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canViewServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_view);

  const {
    deviceType,
    status: requestedStatus = "Pending",
    server,
    search = "",
    sortBy = "sl_asc",
    page = 1,
    limit = 25,
  } = params || {};

  const status = ["Pending", "Online", "Frozen"].includes(requestedStatus)
    ? requestedStatus
    : "Pending";

  const skip = (Math.max(1, page) - 1) * limit;
  const query: FilterQuery<typeof Device> = { status };

  if (deviceType && deviceType !== "all") {
    const requestedType = deviceType.toLowerCase().trim();
    if (requestedType === "server" && !canViewServer) {
      return {
        devices: [] as IDevice[],
        total: 0,
        page,
        limit,
        totalPages: 1,
        byType: {},
      };
    }
    query.deviceType = requestedType;
  } else if (!canViewServer) {
    query.deviceType = { $ne: "server" };
  }

  if (server && server !== "all") {
    query.server = server;
  }

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { sl: regex },
      { deviceName: regex },
      { ipAddress: regex },
      { macAddress: regex },
      { customerName: regex },
      { "submittedBy.name": regex },
      { "submittedBy.email": regex },
      { description: regex },
    ];
  }

  let sortObj: Record<string, 1 | -1> = { sl: 1 };
  if (sortBy === "oldest") sortObj = { createdAt: 1 };
  else if (sortBy === "sl_asc") sortObj = { sl: 1 };
  else if (sortBy === "sl_desc") sortObj = { sl: -1 };
  else if (sortBy === "name_asc") sortObj = { deviceName: 1 };

  const [rawDevices, total, typeCountsResult] = await Promise.all([
    Device.find(query)
      .populate("uplinkSwitch", "sl deviceName totalPorts ipAddress status")
      .populate("server", "sl deviceName ipAddress status")
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Device.countDocuments(query),
    Device.aggregate([
      {
        $match: canViewServer
          ? { status }
          : { status, deviceType: { $ne: "server" } },
      },
      { $group: { _id: "$deviceType", count: { $sum: 1 } } },
    ]),
  ]);

  const catalogModels = rawDevices.length
    ? await DeviceModel.find({
        name: {
          $in: rawDevices.map((device) => device.deviceName).filter(Boolean),
        },
        deviceType: {
          $in: [...new Set(rawDevices.map((device) => device.deviceType))],
        },
      })
        .select("name deviceType brand")
        .lean()
    : [];
  const brandByModel = new Map(
    catalogModels.map((model) => [
      `${model.deviceType}:${model.name.toLowerCase()}`,
      model.brand,
    ]),
  );
  const devicesWithBrand = rawDevices.map((device) => ({
    ...device,
    catalogBrand: brandByModel.get(
      `${device.deviceType}:${device.deviceName.toLowerCase()}`,
    ),
  }));

  const byType: Record<string, number> = {};
  typeCountsResult.forEach((item: { _id: string; count: number }) => {
    if (item._id) byType[item._id.toLowerCase()] = item.count;
  });

  return {
    devices: JSON.parse(JSON.stringify(devicesWithBrand)) as IDevice[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    byType,
  };
}

// ==========================================
// GET PENDING DEVICES COUNT (FAST BADGE QUERY)
// ==========================================
export async function getPendingDevicesCount(): Promise<number> {
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canViewServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_view);

  const query: FilterQuery<typeof Device> = { status: "Pending" };
  if (!canViewServer) {
    query.deviceType = { $ne: "server" };
  }
  return Device.countDocuments(query);
}

// ==========================================
// UPDATE DEVICE STATUS
// ==========================================
export async function updateDeviceStatus(
  id: string,
  status: DeviceStatus,
) {
  const actor = await getCurrentAdminProfile();
  if (!actor) {
    throw new Error(
      "Unauthorized: Access is restricted to authorized administrators.",
    );
  }
  await connectToDatabase();

  if (!DEVICE_STATUSES.includes(status)) {
    throw new Error("Invalid device status.");
  }

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canApprove =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.device_approve);
  const canEditStatus =
    isSuperAdmin || Boolean(actor.granularPermissions?.device_edit);
  const canArchiveStatus =
    isSuperAdmin || Boolean(actor.granularPermissions?.device_archive);

  if (status === "Online" && !canApprove) {
    throw new Error(
      "Forbidden: You do not have permission to set devices Online.",
    );
  }
  if (["Frozen", "Lost"].includes(status) && !canArchiveStatus) {
    throw new Error(
      "Forbidden: You do not have permission to freeze or archive devices.",
    );
  }
  if (
    !["Online", "Frozen", "Lost"].includes(status) &&
    !canEditStatus
  ) {
    throw new Error(
      "Forbidden: You do not have permission to change device status.",
    );
  }

  const existing = await Device.findById(id);
  if (!existing) throw new Error("Device not found");

  if (
    status === "Online" &&
    existing.status === "Frozen" &&
    (existing.rejectionReason || existing.rejectedBy?.reason)
  ) {
    throw new Error(
      "Update and resubmit this rejected device before setting it Online.",
    );
  }

  if (existing.deviceType === "server") {
    const canManageServer =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.server_manage);
    if (!canManageServer) {
      throw new Error(
        "Forbidden: You do not have permission to manage server hardware.",
      );
    }
  }

  const updateFields: Record<string, unknown> = { status };
  if (status === "Online") {
    updateFields.approvedBy = {
      email: actor.email,
      name: actor.name || actor.email.split("@")[0],
      role: actor.role,
      userId: actor._id,
      date: new Date(),
    };
    updateFields.rejectionReason = "";
  }

  const device = (await Device.findByIdAndUpdate(id, updateFields, {
    new: true,
  }).lean()) as IDevice | null;
  if (!device) throw new Error("Device not found");

  await logActivityAndNotify({
    actor,
    action:
      status === "Online"
        ? "DEVICE_APPROVAL"
        : "STATUS_CHANGE",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName} (${device.sl})`,
    details: `Changed device status to "${status}" for ${device.deviceName} (SL: ${device.sl})`,
    link: `/devices/${device.deviceType}`,
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath(`/devices/${device.deviceType}`);

  return JSON.parse(JSON.stringify(device));
}

// ==========================================
// TOGGLE DEVICE ACTIVE (SUPER ADMIN OR ENGINEER QUICK TOGGLE)
// ==========================================
export async function toggleDeviceOnline(id: string) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canApprove = isSuperAdmin || isEngineer;

  if (!canApprove) {
    throw new Error(
      "Only Super Admins and Engineers can activate or approve devices.",
    );
  }

  const device = await Device.findById(id);
  if (!device) throw new Error("Device not found");

  if (device.deviceType === "server") {
    const canManageServer =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.server_manage);
    if (!canManageServer) {
      throw new Error(
        "Forbidden: You do not have permission to manage server hardware.",
      );
    }
  }

  const newStatus: DeviceStatus =
    device.status === "Online" ? "Pending" : "Online";
  device.status = newStatus;
  if (newStatus === "Online") {
    device.approvedBy = {
      email: actor.email,
      name: actor.name || actor.email.split("@")[0],
      role: actor.role,
      userId: actor._id,
      date: new Date(),
    };
    device.rejectionReason = "";
  }
  await device.save();

  await logActivityAndNotify({
    actor,
    action: newStatus === "Online" ? "DEVICE_APPROVAL" : "DEVICE_SUBMISSION",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName} (${device.sl})`,
    details: `${actor.email} (${actor.role}) toggled device #${device.sl} (${device.deviceName}) to ${newStatus}`,
    link: `/devices/${device.deviceType}`,
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath(`/devices/${device.deviceType}`);

  return { success: true, newStatus };
}

// ==========================================
// DELETE DEVICE
// ==========================================
async function deleteDeviceRecord(
  id: string,
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentAdminProfile>>>,
  storageOnly = false,
) {
  await connectToDatabase();
  const isSuperAdmin = actor.role === "super_admin";
  const device = await Device.findById(id);
  if (!device) {
    throw new Error("Device not found");
  }
  if (storageOnly && device.status !== "Storage") {
    throw new Error("This device is no longer in Storage.");
  }

  if (device.deviceType === "server") {
    const isEngineer = actor.role === "engineer";
    const canManageServer =
      isSuperAdmin ||
      isEngineer ||
      Boolean(actor.granularPermissions?.server_manage);
    if (!canManageServer) {
      throw new Error(
        "Forbidden: You do not have permission to delete server hardware.",
      );
    }
  }

  // Check if any devices are connected to this device as an uplink switch
  const connectedCount = await Device.countDocuments({ uplinkSwitch: id });
  if (connectedCount > 0) {
    throw new Error(
      `Cannot delete this switch. It is currently acting as an uplink switch for ${connectedCount} connected device(s). Reassign them first.`,
    );
  }

  // Check if any devices are connected to this device as a server
  const serverClientsCount = await Device.countDocuments({ server: id });
  if (serverClientsCount > 0) {
    throw new Error(
      `Cannot delete this server. It is linked to ${serverClientsCount} client device(s). Reassign them first.`,
    );
  }

  const deletedDevice = storageOnly
    ? await Device.findOneAndDelete({ _id: id, status: "Storage" })
    : await Device.findByIdAndDelete(id);
  if (!deletedDevice) {
    throw new Error(
      storageOnly ? "This device is no longer in Storage." : "Device not found",
    );
  }

  await logActivityAndNotify({
    actor,
    action: "DELETE_DEVICE",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName} (${device.sl})`,
    details: `Deleted ${device.deviceType} device: ${device.deviceName} (SL: ${device.sl})${storageOnly ? " from Storage" : ""}`,
    link: "/devices",
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath("/devices/storage");
  safeRevalidatePath(`/devices/${device.deviceType.toLowerCase().trim()}`);

  return { success: true };
}

export async function deleteDevice(id: string) {
  const actor = await requirePermission("devices", "write");
  const isSuperAdmin = actor.role === "super_admin";
  const canDelete =
    isSuperAdmin || Boolean(actor.granularPermissions?.device_delete);
  if (!canDelete) {
    throw new Error("Forbidden: You do not have permission to delete devices.");
  }

  return deleteDeviceRecord(id, actor);
}

export async function deleteStoredDevice(id: string) {
  const actor = await requirePermission("devices", "write");
  if (actor.role !== "super_admin" && actor.role !== "engineer") {
    throw new Error(
      "Forbidden: Only Super Admins and Engineers can delete stored devices.",
    );
  }

  return deleteDeviceRecord(id, actor, true);
}

// ==========================================
// GLOBAL SEARCH (⌘K Fast Lookup)
// ==========================================
export async function searchGlobalDevices(searchTerm: string) {
  if (!searchTerm || searchTerm.trim().length < 2) return [];
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canViewServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_view);

  const term = searchTerm.trim();
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const query: FilterQuery<typeof Device> = {
    $or: [
      { sl: regex },
      { deviceName: regex },
      { ipAddress: regex },
      { macAddress: regex },
    ],
  };

  if (!canViewServer) {
    query.deviceType = { $ne: "server" };
  }

  const results = await Device.find(query)
    .select("sl deviceName deviceType ipAddress macAddress status")
    .limit(10)
    .lean();

  return JSON.parse(JSON.stringify(results));
}

// ==========================================
// CHECK DEVICE BY MAC (Storage Check)
// ==========================================
export async function checkDeviceByMac(macInput: string) {
  await requirePermission("devices", "read");
  await connectToDatabase();

  const trimmed = macInput?.trim() || "";
  if (!trimmed) {
    throw new Error("Please enter a MAC address to check.");
  }

  const normalized = normalizeMAC(trimmed);
  if (!normalized) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  const device = (await Device.findOne({ macAddress: normalized })
    .populate("server", "deviceName sl")
    .populate("uplinkSwitch", "deviceName sl")
    .lean()) as IDevice | null;

  if (!device) {
    return {
      found: false,
      isInStorage: false,
      searchedMac: normalized || trimmed.toUpperCase(),
      message: `No device found with MAC address: ${normalized || trimmed.toUpperCase()}`,
    };
  }

  const isInStorage = device.status === "Storage";

  return {
    found: true,
    isInStorage,
    searchedMac: normalized || trimmed.toUpperCase(),
    device: JSON.parse(JSON.stringify(device)) as IDevice,
    message: isInStorage
      ? "Device is in Storage"
      : `Device is currently ${device.status}`,
  };
}

// ==========================================
// RETURN DEVICE TO STORAGE
// ==========================================
export async function returnDeviceToStorage(params: {
  macAddress: string;
  deviceCategory: string;
}) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  if (
    !isSuperAdmin &&
    !actor.granularPermissions?.device_edit &&
    !actor.granularPermissions?.device_add
  ) {
    throw new Error(
      "Forbidden: You do not have permission to return devices to storage.",
    );
  }

  const normalizedMac = normalizeMAC(params.macAddress || "");
  if (!normalizedMac) {
    throw new Error("Invalid MAC Address format. Example: AA:BB:CC:DD:EE:FF");
  }

  const device = await Device.findOne({ macAddress: normalizedMac });
  if (!device) {
    throw new Error(`Device not found for MAC address ${normalizedMac}.`);
  }

  const selectedCategory = STORAGE_DEVICE_CATEGORIES.find(
    (category) => category.slug === params.deviceCategory,
  );
  if (!selectedCategory) {
    throw new Error("A valid Device Category is required.");
  }
  if (selectedCategory.slug !== device.deviceType) {
    throw new Error(
      `Device category mismatch. This MAC belongs to ${getStorageDeviceCategoryName(device.deviceType)}, not ${selectedCategory.name}.`,
    );
  }

  if (device.status === "Storage") {
    throw new Error(`Device (${device.sl}) is already in Storage.`);
  }

  const previousStatus = device.status;
  device.status = "Storage";
  await device.save();

  await logActivityAndNotify({
    actor,
    action: "STATUS_CHANGE",
    module: "devices",
    resourceId: device.sl,
    resourceName: `${device.deviceName || device.deviceType} (${device.sl})`,
    details: `Returned ${device.deviceType} (${device.sl}, MAC: ${device.macAddress || "N/A"}) to storage (status changed from ${previousStatus} to Storage).`,
    link: `/devices/${device.deviceType.toLowerCase().trim()}/${device._id}`,
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/devices");
  safeRevalidatePath(`/devices/${device.deviceType.toLowerCase().trim()}`);

  return {
    success: true,
    device: JSON.parse(JSON.stringify(device)),
    message: `Device ${device.deviceName || device.sl} has been returned to storage successfully.`,
  };
}

// ==========================================
// GET FILTER OPTIONS
// ==========================================
export async function getDeviceFilterOptions() {
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canViewServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_view);

  if (!canViewServer) {
    return { servers: [] };
  }

  const servers = await Device.find({
    deviceType: "server",
    status: { $nin: ["Frozen", "Lost"] },
  })
    .select("deviceName sl")
    .sort({ deviceName: 1, sl: 1 })
    .lean();

  return {
    servers: servers.map((server) => ({
      _id: String(server._id),
      deviceName: server.deviceName,
      sl: server.sl,
    })),
  };
}

// ==========================================
// GET ALL DEVICES FOR EXCEL EXPORT
// ==========================================
export async function getAllDevicesForExport(params?: {
  deviceType?: string;
  status?: string;
  server?: string;
  search?: string;
}) {
  const actor = await requirePermission("devices", "read");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canViewServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_view);

  const query: FilterQuery<typeof Device> = {};
  if (params?.deviceType && params.deviceType !== "all") {
    const requestedType = params.deviceType.toLowerCase().trim();
    if (requestedType === "server" && !canViewServer) {
      throw new Error(
        "Forbidden: You do not have permission to export server records.",
      );
    }
    query.deviceType = requestedType;
  } else if (!canViewServer) {
    query.deviceType = { $ne: "server" };
  }
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  } else {
    query.status = { $ne: "Pending" };
  }
  if (params?.server && params.server !== "all") {
    query.server = params.server;
  }
  if (params?.search && params.search.trim()) {
    const term = params.search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { sl: regex },
      { deviceName: regex },
      { ipAddress: regex },
      { macAddress: regex },
      { apNumber: regex },
      { customerName: regex },
      { customerMobile: regex },
      { description: regex },
    ];
  }

  const devices = await Device.find(query)
    .populate("server", "sl deviceName")
    .populate("uplinkSwitch", "sl deviceName")
    .sort({ sl: 1 })
    .lean();
  return JSON.parse(JSON.stringify(devices)) as IDevice[];
}

// ==========================================
// BULK IMPORT DEVICES FROM EXCEL
// ==========================================
export async function importDevicesBulk(
  rows: Record<string, unknown>[],
  defaultDeviceType?: string,
) {
  const actor = await requirePermission("devices", "write");
  await connectToDatabase();

  const isSuperAdmin = actor.role === "super_admin";
  const isEngineer = actor.role === "engineer";
  const canManageServer =
    isSuperAdmin ||
    isEngineer ||
    Boolean(actor.granularPermissions?.server_manage);

  if (actor.role !== "super_admin" && !actor.granularPermissions?.device_add) {
    throw new Error("Forbidden: You do not have permission to add devices.");
  }

  if (
    defaultDeviceType?.toLowerCase().trim() === "server" &&
    !canManageServer
  ) {
    throw new Error(
      "Forbidden: You do not have permission to bulk import server hardware.",
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No data rows provided for import.");
  }

  // Pre-fetch servers, switches, and existing devices for fast resolution
  const [servers, switches, existingDevices, activeDeviceTypes] =
    await Promise.all([
      Device.find(
        {
          deviceType: "server",
          status: { $nin: SELECTABLE_SERVER_STATUSES },
        },
        { _id: 1, sl: 1, deviceName: 1 },
      ).lean(),
      Device.find(
        {
          deviceType: "switch",
          status: { $nin: SELECTABLE_SERVER_STATUSES },
        },
        { _id: 1, sl: 1, deviceName: 1 },
      ).lean(),
      Device.find(
        { macAddress: { $ne: "" } },
        {
          macAddress: 1,
          deviceType: 1,
          deviceName: 1,
          ipAddress: 1,
          status: 1,
          totalPorts: 1,
          apNumber: 1,
          customerName: 1,
          customerMobile: 1,
          description: 1,
          onlineLink: 1,
          gpsLink: 1,
        },
      ).lean(),
      DeviceType.find({ isActive: true }).select("slug").lean(),
    ]);
  const validTypes = new Set([
    ...PRIMARY_DEVICE_TYPES.map((type) => type.slug),
    ...activeDeviceTypes.map((type) => type.slug.toLowerCase().trim()),
  ]);

  // Build a MAC → existing device map for O(1) duplicate lookups
  const existingByMac = new Map<string, (typeof existingDevices)[number]>();
  for (const d of existingDevices) {
    if (!d.macAddress) continue;

    const mac = d.macAddress.toUpperCase();
    const current = existingByMac.get(mac);
    if (!current || d.status === "Storage") {
      existingByMac.set(mac, d);
    }
  }

  let createdCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];
  const seenMacsInBatch = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const candidate: unknown = rows[i];
    const rowNum = i + 2; // Row 1 is header in Excel, data starts at Row 2

    try {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate)
      ) {
        errors.push(`Row ${rowNum}: Invalid row data; row skipped.`);
        continue;
      }

      const r = candidate as Record<string, unknown>;
      const readText = (...keys: string[]) =>
        safeParseString(getFlexibleField(r, ...keys));

      // Skip completely blank rows without affecting the rest of the batch.
      const hasAnyValue = Object.values(r).some(
        (value) => safeParseString(value) !== "",
      );
      if (!hasAnyValue) continue;

      // 2. Verification: Device Type (Required)
      const rawType = (
        readText("Device Type", "Type", "deviceType") ||
        defaultType(defaultDeviceType)
      )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (!rawType) {
        errors.push(`Row ${rowNum}: Device Type is required.`);
        continue;
      }
      if (!validTypes.has(rawType)) {
        errors.push(
          `Row ${rowNum}: Invalid Device Type "${rawType}". Must match an active device type in the catalog.`,
        );
        continue;
      }
      const deviceType = rawType;
      if (deviceType === "server" && !canManageServer) {
        errors.push(
          `Row ${rowNum}: Forbidden: You do not have permission to import server hardware.`,
        );
        continue;
      }

      // 3. Verification: MAC Address (Required)
      const rawMac = readText(
        "MAC Address",
        "MAC",
        "macAddress",
        "Mac Address",
        "mac",
      );

      if (!rawMac) {
        errors.push(`Row ${rowNum}: MAC Address is required.`);
        continue;
      }

      const macAddress = normalizeMAC(rawMac);
      if (!macAddress) {
        errors.push(
          `Row ${rowNum}: Invalid MAC Address "${rawMac}". Must be a valid 12-hex MAC address (e.g. AA:BB:CC:DD:EE:FF).`,
        );
        continue;
      }

      // 4a. Verification: Duplicate MAC check within uploaded spreadsheet batch
      if (seenMacsInBatch.has(macAddress)) {
        errors.push(
          `Row ${rowNum}: Duplicate MAC Address "${macAddress}" found within the uploaded spreadsheet.`,
        );
        continue;
      }

      // Allow stored devices to be registered; skip other existing MACs.
      const existingDevice = existingByMac.get(macAddress.toUpperCase());
      if (existingDevice && existingDevice.status !== "Storage") {
        skippedCount++;
        continue;
      }

      // 5. Verification: Optional IPv4 Address
      const rawIp = readText("IP Address", "IP", "ipAddress", "Ip Address");
      let ipAddress = "";
      if (rawIp) {
        if (!isValidIPv4(rawIp)) {
          errors.push(
            `Row ${rowNum}: Invalid IPv4 format "${rawIp}". Example: 192.168.1.100`,
          );
          continue;
        }
        ipAddress = rawIp;
      }

      // 6. Optional text fields (Device Name, Notes, Online Link)
      const rawName = readText("Device Name", "Name", "deviceName");
      const rawBrand = readText("Brand", "brand");
      const rawModel = readText("Model", "model");
      const brandModelHint = [rawBrand, rawModel].filter(Boolean).join(" ");
      const deviceName =
        rawName ||
        (brandModelHint
          ? `${brandModelHint} ${macAddress.slice(-5)}`
          : `${deviceType.toUpperCase()} ${macAddress.slice(-5)}`);
      const rawDesc = readText("Description", "Notes", "description");
      const description = rawDesc || `${deviceType.toUpperCase()} unit`;
      const onlineLink = readText(
        "Online Link",
        "Portal",
        "Management URL",
        "onlineLink",
      );

      // 7. Verification: Optional Switch Ports
      const rawPorts = getFlexibleField(
        r,
        "Total Ports",
        "Ports",
        "totalPorts",
      );
      let totalPorts: number | undefined = undefined;
      if (deviceType === "switch" && safeParseString(rawPorts) !== "") {
        const numPorts = safeParseNumber(rawPorts, Number.NaN);
        if (!Number.isFinite(numPorts) || numPorts <= 0) {
          errors.push(`Row ${rowNum}: Total Ports must be a positive number.`);
          continue;
        }
        totalPorts = Math.floor(numPorts);
      }

      // 8. Verification: Status (Forced to "Pending" for non-super-admins)
      const isSuperAdmin = actor.role === "super_admin";
      const rawStatus = readText("Status", "status");
      let status: DeviceStatus = "Pending";
      if (isSuperAdmin) {
        status =
          DEVICE_STATUSES.find(
            (candidate) => candidate.toLowerCase() === rawStatus.toLowerCase(),
          ) || "Online";
      }

      // 9. Verification: Server lookup
      const rawServer = readText(
        "Server",
        "Connected Server",
        "Server SL",
        "server",
      );
      let serverId: string | null = null;
      if (rawServer && deviceType !== "server") {
        const found = (
          servers as Array<{ _id: unknown; sl?: string; deviceName?: string }>
        ).find(
          (s) =>
            s.sl?.toLowerCase() === rawServer.toLowerCase() ||
            s.deviceName?.toLowerCase() === rawServer.toLowerCase() ||
            String(s._id) === rawServer,
        );
        if (found) {
          serverId = String(found._id);
        } else {
          errors.push(
            `Row ${rowNum}: Server "${rawServer}" not found in database.`,
          );
          continue;
        }
      } else if (!rawServer && deviceType !== "server") {
        // Fallback: If there is at least one server, assign the primary server
        if (servers.length > 0) {
          serverId = String((servers[0] as { _id: unknown })._id);
        } else if (
          ["access-point", "router", "switch", "antenna"].includes(deviceType)
        ) {
          errors.push(
            `Row ${rowNum}: Connected Server is required for ${deviceType}, but no servers are registered yet.`,
          );
          continue;
        }
      }

      // 10. Verification: Optional Uplink Switch lookup
      const rawSwitch = readText(
        "Uplink Switch",
        "Switch",
        "Switch SL",
        "uplinkSwitch",
      );
      let switchId: string | null = null;
      if (
        rawSwitch &&
        ["antenna", "access-point", "router"].includes(deviceType)
      ) {
        const found = (
          switches as Array<{ _id: unknown; sl?: string; deviceName?: string }>
        ).find(
          (sw) =>
            sw.sl?.toLowerCase() === rawSwitch.toLowerCase() ||
            sw.deviceName?.toLowerCase() === rawSwitch.toLowerCase() ||
            String(sw._id) === rawSwitch,
        );
        if (found) {
          switchId = String(found._id);
        }
      }

      // 11. Optional AP & Customer fields & GPS Link
      const apNumber =
        readText("AP Number", "AP", "apNumber") ||
        (deviceType === "access-point"
          ? `AP-${macAddress.slice(-5).replace(/:/g, "")}`
          : "");
      const customerName =
        readText("Customer Name", "Customer", "customerName") ||
        (["access-point", "router"].includes(deviceType)
          ? "Office / Stock"
          : "");
      const customerMobile =
        readText(
          "Customer Mobile",
          "Mobile Number",
          "Mobile",
          "Phone",
          "customerMobile",
        ) || (["access-point", "router"].includes(deviceType) ? "N/A" : "");

      // Handle GPS Link & legacy Latitude/Longitude fallback
      const rawGps = readText(
        "GPS Link",
        "Map Link",
        "GPS",
        "gpsLink",
        "Location",
        "Address",
      );
      const rawLat = readText("GPS Latitude", "Latitude", "Lat", "gpsLatitude");
      const rawLng = readText(
        "GPS Longitude",
        "Longitude",
        "Lng",
        "Long",
        "gpsLongitude",
      );
      let gpsLink = rawGps;
      if (!gpsLink && rawLat && rawLng) {
        gpsLink = `https://maps.google.com/?q=${rawLat},${rawLng}`;
      }
      if (
        !gpsLink &&
        ["access-point", "router", "switch", "antenna"].includes(deviceType)
      ) {
        gpsLink = "Deployment Location";
      }

      // 12. Verification: Optional Activation Date
      const rawActDate = getFlexibleField(
        r,
        "Activation Date",
        "Date of Activation",
        "activationDate",
      );
      let activationDate: Date | undefined;
      if (safeParseString(rawActDate)) {
        const parsed = safeParseDate(rawActDate, new Date(Number.NaN));
        if (Number.isNaN(parsed.getTime())) {
          errors.push(`Row ${rowNum}: Activation Date is not a valid date.`);
          continue;
        }
        activationDate = parsed;
      }

      const rejectionReason = readText("Rejection Reason", "rejectionReason");

      // Execute createDevice in isolated row try/catch
      await createDevice({
        deviceType,
        deviceName,
        ipAddress,
        macAddress,
        totalPorts,
        server: serverId,
        uplinkSwitch: switchId,
        apNumber: ["access-point"].includes(deviceType) ? apNumber : undefined,
        customerName: ["access-point", "router"].includes(deviceType)
          ? customerName
          : undefined,
        customerMobile: ["access-point", "router"].includes(deviceType)
          ? customerMobile
          : undefined,
        gpsLink: gpsLink || undefined,
        activationDate,
        status,
        rejectionReason,
        description,
        onlineLink,
      });

      createdCount++;
      seenMacsInBatch.add(macAddress);
    } catch (err) {
      // Individual row failure never stops the remaining batch
      const errMsg =
        err instanceof Error ? err.message : "Unknown error creating device";
      errors.push(`Row ${rowNum}: ${errMsg}`);
    }
  }

  // If any devices were created, log activity and create a notification for everyone
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

    // Always create a notification (logActivityAndNotify skips super_admin)
    // so the bell badge is updated for every role after bulk import
    const skippedNote =
      skippedCount > 0
        ? ` · ${skippedCount} duplicate${skippedCount > 1 ? "s" : ""} skipped`
        : "";
    const errNote =
      errors.length > 0
        ? ` · ${errors.length} error${errors.length > 1 ? "s" : ""}`
        : "";
    await Notification.create({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "BULK_IMPORT_COMPLETE",
      module: "devices",
      title: `Bulk Import Complete — ${createdCount} device${createdCount > 1 ? "s" : ""} added`,
      message: `${actor.email} imported ${createdCount} device${createdCount > 1 ? "s" : ""}${skippedNote}${errNote} via Excel bulk import.`,
      link: "/devices",
      readBy: [],
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/devices");
  }

  return {
    success: true,
    createdCount,
    skippedCount,
    totalRows: rows.length,
    errors,
  };
}

function defaultType(input?: string): string {
  if (!input || input === "all") return "antenna";
  return input;
}

// ==========================================
// ADD DEVICE TO STORAGE
// ==========================================
export async function addDeviceToStorage(
  macAddress: string,
  deviceCategory: string,
): Promise<{
  success: boolean;
  message: string;
  device?: IDevice;
  existingDevice?: {
    sl: string;
    deviceName: string;
    status: string;
    deviceType: string;
  };
}> {
  try {
    const actor = await requirePermission("devices", "write");
    await connectToDatabase();

    const isSuperAdmin = actor.role === "super_admin";
    const canAdd =
      isSuperAdmin || Boolean(actor.granularPermissions?.device_add);
    if (!canAdd) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to add devices.",
      };
    }

    const raw = macAddress?.trim() || "";
    if (!raw) {
      return { success: false, message: "MAC Address is required." };
    }

    const normalized = normalizeMAC(raw);
    if (!normalized) {
      return {
        success: false,
        message:
          "Invalid MAC Address format. Please use a valid format such as AA:BB:CC:DD:EE:FF.",
      };
    }

    const category = STORAGE_DEVICE_CATEGORIES.find(
      (item) => item.slug === deviceCategory,
    );
    if (!category) {
      return {
        success: false,
        message: "Please select a valid Device Category.",
      };
    }

    // Check for existing device with this MAC
    const existing = await Device.findOne({ macAddress: normalized });
    if (existing) {
      if (existing.status === "Storage") {
        return {
          success: false,
          message: `This device (MAC: ${normalized}) is already in Storage.`,
          existingDevice: {
            sl: existing.sl,
            deviceName: existing.deviceName || existing.deviceType,
            status: existing.status,
            deviceType: existing.deviceType,
          },
        };
      }
      // Device exists in active use or another state
      return {
        success: false,
        message: `A device with MAC address ${normalized} already exists in the system (SL: #${existing.sl}, Status: ${existing.status}). Use the "Return" button to move it to Storage if needed.`,
        existingDevice: {
          sl: existing.sl,
          deviceName: existing.deviceName || existing.deviceType,
          status: existing.status,
          deviceType: existing.deviceType,
        },
      };
    }

    // Create device in Storage.
    const sl = await getNextSL();
    const deviceName = `STORAGE ${normalized.slice(-5)}`;
    const device = await Device.create({
      sl,
      deviceType: category.slug,
      deviceName,
      macAddress: normalized,
      status: "Storage",
      submittedBy: {
        email: actor.email,
        name: actor.name || actor.email.split("@")[0],
        role: actor.role,
        userId: actor._id,
        date: new Date(),
      },
    });

    await logActivityAndNotify({
      actor,
      action: "CREATE_DEVICE",
      module: "devices",
      resourceId: sl,
      resourceName: `Storage Device (${sl})`,
      details: `Added ${category.name} device with MAC: ${normalized} directly to Storage (SL: ${sl}).`,
      link: `/devices`,
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/devices");

    return {
      success: true,
      message: `Device added to Storage successfully! (SL: #${sl}, MAC: ${normalized})`,
      device: JSON.parse(JSON.stringify(device)) as IDevice,
    };
  } catch (error) {
    console.error("addDeviceToStorage error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to add device to storage.",
    };
  }
}
