"use server";

import { connectToDatabase } from "@/lib/database";
import Device from "@/lib/database/models/device.model";
import DeviceType from "@/lib/database/models/deviceType.model";
import Customer from "@/lib/database/models/customer.model";
import Billing from "@/lib/database/models/billing.model";
import { PRIMARY_DEVICE_TYPES } from "@/lib/constants";
import type { DashboardStats } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  await connectToDatabase();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Run aggregations across Devices, Customers, and Billings in parallel
  const [deviceFacetResult, allTypes, customerFacetResult, billingFacetResult] =
    await Promise.all([
      Device.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ],
            typeCounts: [
              {
                $group: {
                  _id: "$deviceType",
                  count: { $sum: 1 },
                },
              },
            ],
            typeStatusCounts: [
              {
                $group: {
                  _id: { type: "$deviceType", status: "$status" },
                  count: { $sum: 1 },
                },
              },
            ],
            mikrotikCount: [
              {
                $match: {
                  $or: [
                    { brand: { $regex: "mikrotik", $options: "i" } },
                    { model: { $regex: "mikrotik", $options: "i" } },
                    { deviceName: { $regex: "mikrotik", $options: "i" } },
                  ],
                },
              },
              { $count: "total" },
            ],
            serverLocations: [
              {
                $match: {
                  deviceType: "server",
                },
              },
              {
                $group: {
                  _id: {
                    $cond: [
                      { $gt: [{ $strLenCP: { $ifNull: ["$description", ""] } }, 0] },
                      "$description",
                      "$_id",
                    ],
                  },
                },
              },
              { $count: "total" },
            ],
            totalCount: [
              {
                $count: "total",
              },
            ],
            recent: [
              { $sort: { createdAt: -1 } },
              { $limit: 8 },
            ],
          },
        },
      ]),
      DeviceType.find({ isActive: true }).select("name slug").lean(),
      Customer.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ],
            totalCount: [
              {
                $count: "total",
              },
            ],
          },
        },
      ]),
      Billing.aggregate([
        {
          $match: {
            billingMonth: currentMonth,
          },
        },
        {
          $group: {
            _id: null,
            monthlyBilled: { $sum: "$billingAmount" },
            collected: { $sum: "$paidAmount" },
            pending: {
              $sum: {
                $cond: [{ $in: ["$status", ["Pending", "Partial"]] }, "$dueAmount", 0],
              },
            },
            overdue: {
              $sum: {
                $cond: [{ $eq: ["$status", "Overdue"] }, "$dueAmount", 0],
              },
            },
            paidCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "Paid"] }, 1, 0],
              },
            },
            dueCount: {
              $sum: {
                $cond: [{ $in: ["$status", ["Pending", "Partial", "Overdue"]] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

  // Devices
  const devFacet = deviceFacetResult[0] || {};
  const statusCountsMap: Record<string, number> = {};
  (devFacet.statusCounts || []).forEach((item: { _id: string; count: number }) => {
    if (item._id) statusCountsMap[item._id] = item.count;
  });

  const typeCountsMap: Record<string, number> = {};
  (devFacet.typeCounts || []).forEach((item: { _id: string; count: number }) => {
    if (item._id) typeCountsMap[item._id.toLowerCase()] = item.count;
  });

  const totalDevices = devFacet.totalCount?.[0]?.total || 0;
  const totalServers = typeCountsMap["server"] || 0;
  const serverLocationsCount = devFacet.serverLocations?.[0]?.total || totalServers;
  const mikrotikRoutersCount =
    devFacet.mikrotikCount?.[0]?.total ?? (typeCountsMap["router"] || 0);

  // Build per-type status lookup: { "antenna": { "Active": 5, "Offline": 1, ... }, ... }
  const typeStatusMap: Record<string, Record<string, number>> = {};
  (devFacet.typeStatusCounts || []).forEach(
    (item: { _id: { type: string; status: string }; count: number }) => {
      if (!item._id?.type) return;
      const t = item._id.type.toLowerCase();
      if (!typeStatusMap[t]) typeStatusMap[t] = {};
      typeStatusMap[t][item._id.status] = item.count;
    }
  );

  const knownSlugs = new Set<string>();
  const byType: Array<{
    type: string;
    label: string;
    count: number;
    active: number;
    offline: number;
    maintenance: number;
    available: number;
    inactive: number;
  }> = [];

  for (const core of PRIMARY_DEVICE_TYPES) {
    knownSlugs.add(core.slug);
    const sm = typeStatusMap[core.slug] || {};
    byType.push({
      type: core.slug,
      label: core.name,
      count: typeCountsMap[core.slug] || 0,
      active: sm["Active"] || 0,
      offline: sm["Offline"] || 0,
      maintenance: sm["Maintenance"] || 0,
      available: sm["Available"] || 0,
      inactive: (sm["Inactive"] || 0) + (sm["Retired"] || 0),
    });
  }

  for (const t of allTypes) {
    if (!knownSlugs.has(t.slug)) {
      knownSlugs.add(t.slug);
      const sm = typeStatusMap[t.slug] || {};
      byType.push({
        type: t.slug,
        label: t.name,
        count: typeCountsMap[t.slug] || 0,
        active: sm["Active"] || 0,
        offline: sm["Offline"] || 0,
        maintenance: sm["Maintenance"] || 0,
        available: sm["Available"] || 0,
        inactive: (sm["Inactive"] || 0) + (sm["Retired"] || 0),
      });
    }
  }

  // Customers
  const custFacet = customerFacetResult[0] || {};
  const custStatusMap: Record<string, number> = {};
  (custFacet.statusCounts || []).forEach((item: { _id: string; count: number }) => {
    if (item._id) custStatusMap[item._id] = item.count;
  });
  const totalCustomers = custFacet.totalCount?.[0]?.total || 0;

  // Billings
  const billSummary = billingFacetResult[0] || {
    monthlyBilled: 0,
    collected: 0,
    pending: 0,
    overdue: 0,
    paidCount: 0,
    dueCount: 0,
  };

  const paidThisMonth = billSummary.paidCount ?? 0;
  const dueCustomers = billSummary.dueCount ?? 0;

  return {
    totalDevices,
    activeDevices: statusCountsMap["Active"] || 0,
    availableDevices: statusCountsMap["Available"] || 0,
    offlineDevices: statusCountsMap["Offline"] || 0,
    maintenanceDevices: statusCountsMap["Maintenance"] || 0,
    inactiveDevices: statusCountsMap["Inactive"] || 0,
    retiredDevices: statusCountsMap["Retired"] || 0,
    byType,
    recentDevices: JSON.parse(JSON.stringify(devFacet.recent || [])),
    serverStats: {
      totalServers,
      locations: serverLocationsCount,
      mikrotikRouters: mikrotikRoutersCount,
    },
    customerStats: {
      totalCustomers,
      activeCustomers: custStatusMap["Active"] || 0,
      suspendedCustomers: custStatusMap["Suspended"] || 0,
      paidThisMonth,
      dueCustomers,
    },
    billingStats: {
      currentMonth,
      monthlyBilled: billSummary.monthlyBilled || 0,
      collected: billSummary.collected || 0,
      pending: billSummary.pending || 0,
      overdue: billSummary.overdue || 0,
      paidCount: billSummary.paidCount || 0,
      dueCount: billSummary.dueCount || 0,
    },
  };
}
