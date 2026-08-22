"use server";

import { connectToDatabase } from "@/lib/database";
import DeviceType from "@/lib/database/models/deviceType.model";
import Brand from "@/lib/database/models/brand.model";
import DeviceModel from "@/lib/database/models/model.model";
import Device from "@/lib/database/models/device.model";
import { PRIMARY_DEVICE_TYPES } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { requirePermission, logActivityAndNotify } from "@/lib/auth-guard";
import type { IDeviceType, IBrand, IModel } from "@/types";

// ==========================================
// SEED DEFAULT CATALOG
// ==========================================
export async function seedDefaultCatalog() {
  await connectToDatabase();

  // 1. Seed Core Device Types if not present
  for (const item of PRIMARY_DEVICE_TYPES) {
    const existing = await DeviceType.findOne({ slug: item.slug });
    if (!existing) {
      await DeviceType.create({
        name: item.name,
        slug: item.slug,
        isProtected: item.isProtected,
        isActive: true,
      });
    }
  }

  // 2. Seed Common Brands & Models if brand collection is empty
  const brandCount = await Brand.countDocuments();
  if (brandCount === 0) {
    const seedBrands = [
      { name: "Ubiquiti", deviceTypes: ["antenna", "access-point", "router", "switch"] },
      { name: "MikroTik", deviceTypes: ["antenna", "router", "switch"] },
      { name: "Cisco", deviceTypes: ["router", "switch", "access-point", "server"] },
      { name: "TP-Link", deviceTypes: ["antenna", "access-point", "router", "switch"] },
      { name: "Dell", deviceTypes: ["server", "switch"] },
      { name: "HP", deviceTypes: ["server", "switch"] },
      { name: "Huawei", deviceTypes: ["router", "switch", "access-point"] },
    ];

    for (const b of seedBrands) {
      await Brand.create(b);
    }

    const seedModels = [
      // Antenna
      { name: "Rocket Prism 5AC", deviceType: "antenna", brand: "Ubiquiti" },
      { name: "LiteBeam 5AC", deviceType: "antenna", brand: "Ubiquiti" },
      { name: "PowerBeam 5AC", deviceType: "antenna", brand: "Ubiquiti" },
      { name: "LHG 5", deviceType: "antenna", brand: "MikroTik" },
      { name: "DynaDish 5", deviceType: "antenna", brand: "MikroTik" },
      { name: "CPE510", deviceType: "antenna", brand: "TP-Link" },
      { name: "CPE610", deviceType: "antenna", brand: "TP-Link" },

      // Access Point
      { name: "UniFi U6 Pro", deviceType: "access-point", brand: "Ubiquiti" },
      { name: "UniFi U6 Lite", deviceType: "access-point", brand: "Ubiquiti" },
      { name: "cAP ac", deviceType: "access-point", brand: "MikroTik" },
      { name: "hAP ac³", deviceType: "access-point", brand: "MikroTik" },
      { name: "Aironet 2800", deviceType: "access-point", brand: "Cisco" },
      { name: "Catalyst 9115AX", deviceType: "access-point", brand: "Cisco" },
      { name: "EAP610", deviceType: "access-point", brand: "TP-Link" },
      { name: "EAP225-Outdoor", deviceType: "access-point", brand: "TP-Link" },

      // Router
      { name: "CCR1009-7G-1C-1S+", deviceType: "router", brand: "MikroTik" },
      { name: "CCR1036-8G-2S+", deviceType: "router", brand: "MikroTik" },
      { name: "RB4011iGS+RM", deviceType: "router", brand: "MikroTik" },
      { name: "EdgeRouter 4", deviceType: "router", brand: "Ubiquiti" },
      { name: "EdgeRouter Infinity", deviceType: "router", brand: "Ubiquiti" },
      { name: "ISR 4331", deviceType: "router", brand: "Cisco" },
      { name: "ISR 4451", deviceType: "router", brand: "Cisco" },
      { name: "ER7206 Omada", deviceType: "router", brand: "TP-Link" },

      // Switch
      { name: "Catalyst 2960-X", deviceType: "switch", brand: "Cisco" },
      { name: "Catalyst 3850", deviceType: "switch", brand: "Cisco" },
      { name: "Catalyst 9200L", deviceType: "switch", brand: "Cisco" },
      { name: "EdgeSwitch 24 Lite", deviceType: "switch", brand: "Ubiquiti" },
      { name: "UniFi Switch Pro 24 PoE", deviceType: "switch", brand: "Ubiquiti" },
      { name: "CRS326-24G-2S+RM", deviceType: "switch", brand: "MikroTik" },
      { name: "CRS328-24P-4S+RM", deviceType: "switch", brand: "MikroTik" },
      { name: "TL-SG3428", deviceType: "switch", brand: "TP-Link" },
      { name: "PowerConnect 5524", deviceType: "switch", brand: "Dell" },

      // Server
      { name: "PowerEdge R740", deviceType: "server", brand: "Dell" },
      { name: "PowerEdge R640", deviceType: "server", brand: "Dell" },
      { name: "PowerEdge R440", deviceType: "server", brand: "Dell" },
      { name: "ProLiant DL380 Gen10", deviceType: "server", brand: "HP" },
      { name: "ProLiant DL360 Gen10", deviceType: "server", brand: "HP" },
      { name: "UCS C220 M5", deviceType: "server", brand: "Cisco" },
    ];

    for (const m of seedModels) {
      await DeviceModel.create(m);
    }
  }

  return { success: true };
}

// ==========================================
// DEVICE TYPES
// ==========================================
export async function getDeviceTypes(onlyActive = false) {
  await requirePermission("catalog", "read");
  await connectToDatabase();
  const query = onlyActive ? { isActive: true } : {};
  const types = await DeviceType.find(query).sort({ isProtected: -1, name: 1 }).lean();
  return JSON.parse(JSON.stringify(types));
}

export async function createDeviceType(data: { name: string; description?: string }) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const name = data.name.trim();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const existing = await DeviceType.findOne({ slug });
  if (existing) {
    throw new Error(`Device type with name "${name}" already exists.`);
  }

  const deviceType = await DeviceType.create({
    name,
    slug,
    description: data.description?.trim() || "",
    isProtected: false,
    isActive: true,
  });

  await logActivityAndNotify({
    actor,
    action: "CREATE_DEVICE_TYPE",
    module: "catalog",
    resourceId: slug,
    resourceName: name,
    details: `Added new device type: ${name} (slug: ${slug})`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(deviceType));
}

export async function updateDeviceType(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const deviceType = (await DeviceType.findByIdAndUpdate(id, data, { new: true }).lean()) as unknown as IDeviceType | null;
  if (!deviceType) throw new Error("Device type not found");

  await logActivityAndNotify({
    actor,
    action: "UPDATE_DEVICE_TYPE",
    module: "catalog",
    resourceId: deviceType.slug,
    resourceName: deviceType.name,
    details: `Updated device type: ${deviceType.name}`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(deviceType));
}

export async function deleteDeviceType(id: string) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const typeDoc = await DeviceType.findById(id);
  if (!typeDoc) throw new Error("Device type not found");
  if (typeDoc.isProtected) throw new Error("Cannot delete a protected core device type");

  // Check if devices use this type
  const deviceCount = await Device.countDocuments({ deviceType: typeDoc.slug });
  if (deviceCount > 0) {
    throw new Error(`Cannot delete "${typeDoc.name}" because ${deviceCount} devices are currently assigned to it.`);
  }

  await DeviceType.findByIdAndDelete(id);

  await logActivityAndNotify({
    actor,
    action: "DELETE_DEVICE_TYPE",
    module: "catalog",
    resourceId: typeDoc.slug,
    resourceName: typeDoc.name,
    details: `Deleted device type: ${typeDoc.name}`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return { success: true };
}

// ==========================================
// BRANDS
// ==========================================
export async function getBrands(deviceType?: string, onlyActive = false) {
  await requirePermission("catalog", "read");
  await connectToDatabase();
  const query: Record<string, unknown> = {};
  if (onlyActive) query.isActive = true;
  if (deviceType) query.deviceTypes = deviceType.toLowerCase().trim();

  const brands = await Brand.find(query).sort({ name: 1 }).lean();
  return JSON.parse(JSON.stringify(brands));
}

export async function createBrand(data: { name: string; deviceTypes: string[] }) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const name = data.name.trim();

  const existing = await Brand.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) {
    // Add unique device types to existing brand
    const combinedTypes = Array.from(new Set([...existing.deviceTypes, ...data.deviceTypes]));
    existing.deviceTypes = combinedTypes;
    await existing.save();
    revalidatePath("/catalog");
    return JSON.parse(JSON.stringify(existing));
  }

  const brand = await Brand.create({
    name,
    deviceTypes: data.deviceTypes.map((t) => t.toLowerCase().trim()),
    isActive: true,
  });

  await logActivityAndNotify({
    actor,
    action: "CREATE_BRAND",
    module: "catalog",
    resourceId: String(brand._id),
    resourceName: name,
    details: `Added new brand: ${name} (${data.deviceTypes.join(", ")})`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(brand));
}

export async function updateBrand(id: string, data: { name?: string; deviceTypes?: string[]; isActive?: boolean }) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const brand = (await Brand.findByIdAndUpdate(id, data, { new: true }).lean()) as unknown as IBrand | null;
  if (!brand) throw new Error("Brand not found");

  await logActivityAndNotify({
    actor,
    action: "UPDATE_BRAND",
    module: "catalog",
    resourceId: String(brand._id),
    resourceName: brand.name,
    details: `Updated brand: ${brand.name}`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(brand));
}

export async function deleteBrand(id: string) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const brand = await Brand.findById(id);
  if (!brand) throw new Error("Brand not found");

  const deviceCount = await Device.countDocuments({ brand: brand.name });
  if (deviceCount > 0) {
    throw new Error(`Cannot delete brand "${brand.name}" because ${deviceCount} devices are currently registered under it.`);
  }

  // Also remove models belonging to this brand
  await DeviceModel.deleteMany({ brand: brand.name });
  await Brand.findByIdAndDelete(id);

  await logActivityAndNotify({
    actor,
    action: "DELETE_BRAND",
    module: "catalog",
    resourceId: String(brand._id),
    resourceName: brand.name,
    details: `Deleted brand: ${brand.name}`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return { success: true };
}

// ==========================================
// MODELS
// ==========================================
export async function getModels(params?: { deviceType?: string; brand?: string; onlyActive?: boolean }) {
  await requirePermission("catalog", "read");
  await connectToDatabase();
  const query: Record<string, unknown> = {};
  if (params?.onlyActive) query.isActive = true;
  if (params?.deviceType) query.deviceType = params.deviceType.toLowerCase().trim();
  if (params?.brand) query.brand = params.brand.trim();

  const models = await DeviceModel.find(query).sort({ name: 1 }).lean();
  return JSON.parse(JSON.stringify(models));
}

export async function createModel(data: {
  name: string;
  deviceType: string;
  brand: string;
  specifications?: string;
}) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const name = data.name.trim();
  const brand = data.brand.trim();
  const deviceType = data.deviceType.toLowerCase().trim();

  const existing = await DeviceModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
    brand,
    deviceType,
  });

  if (existing) {
    throw new Error(`Model "${name}" already exists for ${brand} (${deviceType}).`);
  }

  const model = await DeviceModel.create({
    name,
    brand,
    deviceType,
    specifications: data.specifications?.trim() || "",
    isActive: true,
  });

  // Ensure brand has this device type
  await Brand.findOneAndUpdate(
    { name: brand },
    { $addToSet: { deviceTypes: deviceType } }
  );

  await logActivityAndNotify({
    actor,
    action: "CREATE_MODEL",
    module: "catalog",
    resourceId: String(model._id),
    resourceName: `${brand} ${name}`,
    details: `Added new model: ${name} (${brand} - ${deviceType})`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(model));
}

export async function updateModel(
  id: string,
  data: { name?: string; specifications?: string; isActive?: boolean }
) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const model = (await DeviceModel.findByIdAndUpdate(id, data, { new: true }).lean()) as unknown as IModel | null;
  if (!model) throw new Error("Model not found");

  await logActivityAndNotify({
    actor,
    action: "UPDATE_MODEL",
    module: "catalog",
    resourceId: String(model._id),
    resourceName: `${model.brand} ${model.name}`,
    details: `Updated model specifications for: ${model.brand} ${model.name}`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(model));
}

export async function deleteModel(id: string) {
  const actor = await requirePermission("catalog", "write");
  await connectToDatabase();
  const model = await DeviceModel.findById(id);
  if (!model) throw new Error("Model not found");

  const deviceCount = await Device.countDocuments({
    brand: model.brand,
    model: model.name,
  });

  if (deviceCount > 0) {
    throw new Error(
      `Cannot delete model "${model.name}" because ${deviceCount} active devices are currently using it.`
    );
  }

  await DeviceModel.findByIdAndDelete(id);

  await logActivityAndNotify({
    actor,
    action: "DELETE_MODEL",
    module: "catalog",
    resourceId: String(model._id),
    resourceName: `${model.brand} ${model.name}`,
    details: `Deleted model: ${model.brand} ${model.name}`,
    link: "/catalog",
  });

  revalidatePath("/catalog");
  return { success: true };
}
