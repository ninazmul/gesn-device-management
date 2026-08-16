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

  const knownSlugs = new Set<string>();
  const byType: Array<{ type: string; label: string; count: number }> = [];

  for (const core of PRIMARY_DEVICE_TYPES) {
    knownSlugs.add(core.slug);
    byType.push({
      type: core.slug,
      label: core.name,
      count: typeCountsMap[core.slug] || 0,
    });
  }

  for (const t of allTypes) {
    if (!knownSlugs.has(t.slug)) {
      knownSlugs.add(t.slug);
      byType.push({
        type: t.slug,
        label: t.name,
        count: typeCountsMap[t.slug] || 0,
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
  };

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
    customerStats: {
      totalCustomers,
      activeCustomers: custStatusMap["Active"] || 0,
      suspendedCustomers: custStatusMap["Suspended"] || 0,
    },
    billingStats: {
      currentMonth,
      monthlyBilled: billSummary.monthlyBilled || 0,
      collected: billSummary.collected || 0,
      pending: billSummary.pending || 0,
      overdue: billSummary.overdue || 0,
    },
  };
}
