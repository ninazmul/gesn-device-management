"use server";

import { connectToDatabase } from "@/lib/database";
import Device from "@/lib/database/models/device.model";
import DeviceType from "@/lib/database/models/deviceType.model";
import Customer from "@/lib/database/models/customer.model";
import Billing from "@/lib/database/models/billing.model";
import { PRIMARY_DEVICE_TYPES } from "@/lib/constants";
import type { DashboardStats } from "@/types";
import { getCurrentAdminProfile } from "@/lib/auth-guard";
import {
  hasPermissionLevel,
  resolveEffectivePermissions,
} from "@/lib/rbac-utils";
import { syncOverdueBillsIfNeeded } from "./billing.actions";

export async function getDashboardStats(): Promise<DashboardStats> {
  const profile = await getCurrentAdminProfile();
  if (!profile) {
    throw new Error(
      "Unauthorized: Access is restricted to authorized administrators.",
    );
  }

  const permissions = resolveEffectivePermissions(
    profile.role,
    profile.permissions,
  );
  const canReadDevices = hasPermissionLevel(permissions, "devices", "read");
  const canReadCustomers = hasPermissionLevel(permissions, "customers", "read");
  const canReadBilling = hasPermissionLevel(permissions, "billing", "read");
  await connectToDatabase();

  const isSuperAdmin = profile.role === "super_admin";
  const isEngineer = profile.role === "engineer";
  const canViewServer = canReadDevices && (isSuperAdmin || isEngineer);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (canReadBilling) await syncOverdueBillsIfNeeded();

  // Run aggregations across Devices, Customers, and Billings in parallel
  const [
    deviceFacetResult,
    allTypes,
    customerFacetResult,
    billingFacetResult,
    awaitingBills,
  ] = await Promise.all([
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
              $match: {
                status: { $nin: ["Pending", "Rejected"] },
              },
            },
            {
              $group: {
                _id: "$deviceType",
                count: { $sum: 1 },
              },
            },
          ],
          typeStatusCounts: [
            {
              $match: {
                status: { $nin: ["Pending", "Rejected"] },
              },
            },
            {
              $group: {
                _id: { type: "$deviceType", status: "$status" },
                count: { $sum: 1 },
              },
            },
          ],
          serverLocations: [
            {
              $match: {
                deviceType: "server",
                status: { $nin: ["Pending", "Rejected"] },
              },
            },
            {
              $group: {
                _id: {
                  $cond: [
                    {
                      $gt: [
                        { $strLenCP: { $ifNull: ["$description", ""] } },
                        0,
                      ],
                    },
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
              $match: {
                status: { $nin: ["Pending", "Rejected"] },
              },
            },
            {
              $count: "total",
            },
          ],
          pendingCount: [
            {
              $match: {
                status: "Pending",
              },
            },
            {
              $count: "total",
            },
          ],
          recent: [
            {
              $match: {
                status: { $nin: ["Pending", "Rejected"] },
              },
            },
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
        $facet: {
          currentMonth: [
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
                paidCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] },
                },
              },
            },
          ],
          allOutstanding: [
            {
              $match: {
                status: { $in: ["Pending", "Partial", "Overdue"] },
                dueAmount: { $gt: 0 },
              },
            },
            {
              $group: {
                _id: null,
                totalOutstanding: { $sum: "$dueAmount" },
                pendingCount: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["Pending", "Partial"]] }, 1, 0],
                  },
                },
                overdueCount: {
                  $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, 1, 0] },
                },
                totalDueCustomers: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
    Billing.find({
      status: { $in: ["Overdue", "Pending", "Partial"] },
      dueAmount: { $gt: 0 },
    })
      .sort({ status: 1, dueDate: 1 })
      .limit(6)
      .populate({
        path: "customer",
        select: "customerId name phone serviceType server",
        populate: {
          path: "server",
          select: "sl deviceName",
          model: "Device",
        },
        model: "Customer",
      })
      .lean(),
  ]);

  // Devices
  const devFacet = deviceFacetResult[0] || {};
  const statusCountsMap: Record<string, number> = {};
  (devFacet.statusCounts || []).forEach(
    (item: { _id: string; count: number }) => {
      if (item._id) statusCountsMap[item._id] = item.count;
    },
  );

  const typeCountsMap: Record<string, number> = {};
  (devFacet.typeCounts || []).forEach(
    (item: { _id: string; count: number }) => {
      if (item._id) typeCountsMap[item._id.toLowerCase()] = item.count;
    },
  );

  const totalDevices = devFacet.totalCount?.[0]?.total || 0;

  // Build per-type status lookup: { "antenna": { "Active": 5, "Offline": 1, ... }, ... }
  const typeStatusMap: Record<string, Record<string, number>> = {};
  (devFacet.typeStatusCounts || []).forEach(
    (item: { _id: { type: string; status: string }; count: number }) => {
      if (!item._id?.type) return;
      const t = item._id.type.toLowerCase();
      if (!typeStatusMap[t]) typeStatusMap[t] = {};
      typeStatusMap[t][item._id.status] = item.count;
    },
  );

  const totalServers = typeCountsMap["server"] || 0;
  const activeServers = typeStatusMap["server"]?.["Active"] || 0;
  const serverLocationsCount =
    devFacet.serverLocations?.[0]?.total || totalServers;
  const routersCount = typeCountsMap["router"] || 0;

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
    if (core.slug === "server" && !canViewServer) continue;
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
    if (t.slug === "server" && !canViewServer) continue;
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
  (custFacet.statusCounts || []).forEach(
    (item: { _id: string; count: number }) => {
      if (item._id) custStatusMap[item._id] = item.count;
    },
  );
  const totalCustomers = custFacet.totalCount?.[0]?.total || 0;

  // Billings
  const billFacet = billingFacetResult[0] || {};
  const currentMonthData = billFacet.currentMonth?.[0] || {
    monthlyBilled: 0,
    collected: 0,
    paidCount: 0,
  };
  const allOutstandingData = billFacet.allOutstanding?.[0] || {
    totalOutstanding: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalDueCustomers: 0,
  };

  const paidThisMonth = currentMonthData.paidCount || 0;
  const pendingCount = allOutstandingData.pendingCount || 0;
  const overdueCount = allOutstandingData.overdueCount || 0;
  const totalOutstandingAmount = allOutstandingData.totalOutstanding || 0;
  const dueCustomers = allOutstandingData.totalDueCustomers || 0;

  // Format awaiting collection customers
  const formattedAwaitingCustomers = (awaitingBills || []).map((b) => {
    const cust = b.customer || {};
    const srv = cust.server || {};
    return {
      _id: String(cust._id || b._id),
      customerId: cust.customerId || "—",
      name: cust.name || "Unknown Customer",
      phone: cust.phone || "",
      serviceType: cust.serviceType || "Service C",
      serverName: srv.deviceName ? `${srv.deviceName} (${srv.sl})` : undefined,
      billingId: b.billingId,
      billingMonth: b.billingMonth,
      billingAmount: b.billingAmount || 0,
      paidAmount: b.paidAmount || 0,
      dueAmount: b.dueAmount || 0,
      dueDate: b.dueDate,
      status: b.status,
    };
  });

  return {
    totalDevices: canReadDevices ? totalDevices : 0,
    activeDevices: canReadDevices ? statusCountsMap["Active"] || 0 : 0,
    availableDevices: canReadDevices ? statusCountsMap["Available"] || 0 : 0,
    offlineDevices: canReadDevices ? statusCountsMap["Offline"] || 0 : 0,
    maintenanceDevices: canReadDevices
      ? statusCountsMap["Maintenance"] || 0
      : 0,
    inactiveDevices: canReadDevices ? statusCountsMap["Inactive"] || 0 : 0,
    retiredDevices: canReadDevices ? statusCountsMap["Retired"] || 0 : 0,
    pendingDevices: canReadDevices
      ? devFacet.pendingCount?.[0]?.total || statusCountsMap["Pending"] || 0
      : 0,
    byType: canReadDevices ? byType : [],
    recentDevices: canReadDevices
      ? JSON.parse(
          JSON.stringify(
            (devFacet.recent || []).filter(
              (d: { deviceType?: string }) =>
                canViewServer || d.deviceType !== "server",
            ),
          ),
        )
      : [],
    serverStats: {
      totalServers: canViewServer ? totalServers : 0,
      activeServers: canViewServer ? activeServers : 0,
      locations: canViewServer ? serverLocationsCount : 0,
      routersCount: canReadDevices ? routersCount : 0,
    },
    customerStats: {
      totalCustomers: canReadCustomers ? totalCustomers : 0,
      activeCustomers: canReadCustomers ? custStatusMap["Active"] || 0 : 0,
      suspendedCustomers: canReadCustomers
        ? custStatusMap["Suspended"] || 0
        : 0,
      paidThisMonth: canReadBilling ? paidThisMonth : 0,
      pendingCount: canReadBilling ? pendingCount : 0,
      overdueCount: canReadBilling ? overdueCount : 0,
      totalOutstandingAmount: canReadBilling ? totalOutstandingAmount : 0,
      dueCustomers: canReadBilling ? dueCustomers : 0,
    },
    awaitingCollectionCustomers: canReadBilling
      ? JSON.parse(JSON.stringify(formattedAwaitingCustomers))
      : [],
    billingStats: {
      currentMonth,
      monthlyBilled: canReadBilling ? currentMonthData.monthlyBilled || 0 : 0,
      collected: canReadBilling ? currentMonthData.collected || 0 : 0,
      pending: canReadBilling ? pendingCount : 0,
      overdue: canReadBilling ? overdueCount : 0,
      paidCount: canReadBilling ? paidThisMonth : 0,
      dueCount: canReadBilling ? dueCustomers : 0,
    },
  };
}
