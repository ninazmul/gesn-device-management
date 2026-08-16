"use server";

import { connectToDatabase } from "@/lib/database";
import DeviceType from "@/lib/database/models/deviceType.model";
import Brand from "@/lib/database/models/brand.model";
import DeviceModel from "@/lib/database/models/model.model";
import Device from "@/lib/database/models/device.model";
import { PRIMARY_DEVICE_TYPES } from "@/lib/constants";
import { revalidatePath } from "next/cache";

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
      { name: "Catalyst 9115AX", deviceType: "access-point", brand: "Cisco" },
      { name: "EAP650", deviceType: "access-point", brand: "TP-Link" },

      // Router
      { name: "RB750Gr3 (hEX)", deviceType: "router", brand: "MikroTik" },
      { name: "RB4011iGS+RM", deviceType: "router", brand: "MikroTik" },
      { name: "CCR2004-16G-2S+", deviceType: "router", brand: "MikroTik" },
      { name: "EdgeRouter 4", deviceType: "router", brand: "Ubiquiti" },
      { name: "ISR 4321", deviceType: "router", brand: "Cisco" },
      { name: "ISR 4331", deviceType: "router", brand: "Cisco" },
      { name: "ER7206", deviceType: "router", brand: "TP-Link" },

      // Switch
      { name: "CRS326-24G-2S+RM", deviceType: "switch", brand: "MikroTik" },
      { name: "CRS328-24P-4S+RM", deviceType: "switch", brand: "MikroTik" },
      { name: "UniFi Switch Pro 24 PoE", deviceType: "switch", brand: "Ubiquiti" },
      { name: "Catalyst 2960-X", deviceType: "switch", brand: "Cisco" },
      { name: "Catalyst 9200L", deviceType: "switch", brand: "Cisco" },
      { name: "TL-SG3428MP", deviceType: "switch", brand: "TP-Link" },

      // Server
      { name: "PowerEdge R640", deviceType: "server", brand: "Dell" },
      { name: "PowerEdge R740", deviceType: "server", brand: "Dell" },
      { name: "ProLiant DL380 Gen10", deviceType: "server", brand: "HP" },
      { name: "UCS C220 M5", deviceType: "server", brand: "Cisco" },
    ];

    for (const m of seedModels) {
      await DeviceModel.create(m);
    }
  }

  revalidatePath("/catalog");
  return { success: true };
}

// ==========================================
// DEVICE TYPES
// ==========================================
export async function getDeviceTypes(onlyActive = false) {
  await connectToDatabase();
  const query = onlyActive ? { isActive: true } : {};
  const types = await DeviceType.find(query).sort({ isProtected: -1, name: 1 }).lean();
  return JSON.parse(JSON.stringify(types));
}

export async function createDeviceType(data: { name: string; slug?: string; description?: string }) {
  await connectToDatabase();
  const slug = data.slug
    ? data.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
    : data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

  const existing = await DeviceType.findOne({ slug });
  if (existing) {
    throw new Error(`Device type with identifier "${slug}" already exists.`);
  }

  const deviceType = await DeviceType.create({
    name: data.name.trim(),
    slug,
    description: data.description?.trim() || "",
    isProtected: false,
    isActive: true,
  });

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(deviceType));
}

export async function updateDeviceType(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  await connectToDatabase();
  const deviceType = await DeviceType.findByIdAndUpdate(id, data, { new: true }).lean();
  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(deviceType));
}

export async function deleteDeviceType(id: string) {
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
  revalidatePath("/catalog");
  return { success: true };
}

// ==========================================
// BRANDS
// ==========================================
export async function getBrands(deviceType?: string, onlyActive = false) {
  await connectToDatabase();
  const query: Record<string, unknown> = {};
  if (onlyActive) query.isActive = true;
  if (deviceType) query.deviceTypes = deviceType.toLowerCase().trim();

  const brands = await Brand.find(query).sort({ name: 1 }).lean();
  return JSON.parse(JSON.stringify(brands));
}

export async function createBrand(data: { name: string; deviceTypes: string[] }) {
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

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(brand));
}

export async function updateBrand(id: string, data: { name?: string; deviceTypes?: string[]; isActive?: boolean }) {
  await connectToDatabase();
  const brand = await Brand.findByIdAndUpdate(id, data, { new: true }).lean();
  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(brand));
}

export async function deleteBrand(id: string) {
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

  revalidatePath("/catalog");
  return { success: true };
}

// ==========================================
// MODELS
// ==========================================
export async function getModels(params?: { deviceType?: string; brand?: string; onlyActive?: boolean }) {
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

  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(model));
}

export async function updateModel(
  id: string,
  data: { name?: string; specifications?: string; isActive?: boolean }
) {
  await connectToDatabase();
  const model = await DeviceModel.findByIdAndUpdate(id, data, { new: true }).lean();
  revalidatePath("/catalog");
  return JSON.parse(JSON.stringify(model));
}

export async function deleteModel(id: string) {
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
  revalidatePath("/catalog");
  return { success: true };
}
