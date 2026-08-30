export type DeviceStatus =
  | "Available"
  | "Active"
  | "Offline"
  | "Maintenance"
  | "Inactive"
  | "Retired";

export type CustomerStatus = "Active" | "Inactive" | "Suspended";

export type BillingStatus =
  | "Pending"
  | "Paid"
  | "Partial"
  | "Overdue"
  | "Cancelled";

export interface IDeviceType {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isProtected?: boolean;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IBrand {
  _id: string;
  name: string;
  deviceTypes: string[]; // device type slugs e.g. ["antenna", "router"]
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IModel {
  _id: string;
  name: string;
  deviceType: string; // slug e.g. "antenna"
  brand: string; // brand name or ID
  specifications?: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IDevice {
  _id: string;
  sl: string; // e.g. "000001"
  deviceType: string; // slug e.g. "antenna", "server", "switch"
  brand: string;
  model: string;
  deviceName: string;
  totalPorts?: number;
  uplinkSwitch?: IDevice | string | null;
  server?: IDevice | string | null;
  activePortsCount?: number;
  availablePorts?: number;
  connectedDevices?: IDevice[];
  description?: string;
  onlineLink?: string;
  macAddress?: string;
  ipAddress?: string;
  activationDate?: string | Date;
  // Access Point / Router specific fields
  apNumber?: string;
  customerName?: string;
  customerMobile?: string;
  gpsLink?: string;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  status: DeviceStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ISwitchOption {
  _id: string;
  sl: string;
  deviceName: string;
  brand: string;
  model: string;
  ipAddress?: string;
  status: DeviceStatus;
  totalPorts: number;
  activePortsCount: number;
  availablePorts: number;
}

export interface IServerOption {
  _id: string;
  sl: string;
  deviceName: string;
  brand: string;
  model: string;
  ipAddress?: string;
  status: DeviceStatus;
}

export interface ICustomer {
  _id: string;
  customerId: string; // e.g. "CUS-000001"
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  monthlyBill: number;
  billingStartDate: string | Date;
  billingDay: number; // 1 - 31
  status: CustomerStatus;
  assignedDevices?: IDevice[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IBilling {
  _id: string;
  billingId: string; // e.g. "BILL-000001"
  customer: ICustomer;
  billingMonth: string; // e.g. "2026-08"
  billingAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string | Date;
  paymentDate?: string | Date;
  paymentNote?: string;
  paymentReference?: string;
  status: BillingStatus;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type AdminRole =
  | "super_admin"
  | "admin"
  | "editor"
  | "moderator"
  | "viewer"
  | "custom";

export type PermissionLevel = "none" | "read" | "write";

export type AppModule =
  | "dashboard"
  | "devices"
  | "customers"
  | "billing"
  | "catalog"
  | "admins"
  | "activity_logs"
  | "settings";

export type ModulePermissions = Record<AppModule, PermissionLevel>;

export interface IAdminUser {
  _id: string;
  email: string;
  name?: string;
  role: AdminRole;
  permissions?: Partial<ModulePermissions>;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export type Admin = IAdminUser;

export interface IActivityLog {
  _id: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string; // "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "GENERATE_BILLS" | etc.
  module: AppModule | "system";
  resourceId?: string;
  resourceName?: string;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date | string;
}

export interface INotification {
  _id: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  module: AppModule | "system";
  title: string;
  message: string;
  link?: string;
  readBy: string[]; // super admin emails who marked read
  createdAt: Date | string;
}

export interface GetActivityLogsParams {
  module?: string;
  action?: string;
  actorEmail?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  availableDevices: number;
  offlineDevices: number;
  maintenanceDevices: number;
  inactiveDevices: number;
  retiredDevices: number;
  byType: Array<{
    type: string;
    label: string;
    count: number;
    active: number;
    offline: number;
    maintenance: number;
    available: number;
    inactive: number;
  }>;
  recentDevices: IDevice[];
  // Server & Core Infrastructure Summary
  serverStats: {
    totalServers: number;
    activeServers: number;
    locations: number;
    routersCount: number;
  };
  // Customer & Billing Summary
  customerStats: {
    totalCustomers: number;
    activeCustomers: number;
    suspendedCustomers: number;
    paidThisMonth: number;
    dueCustomers: number;
  };
  billingStats: {
    currentMonth: string;
    monthlyBilled: number;
    collected: number;
    pending: number;
    overdue: number;
    paidCount?: number;
    dueCount?: number;
  };
}

export interface GetDevicesParams {
  deviceType?: string;
  brand?: string;
  model?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface GetCustomersParams {
  status?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface GetBillingsParams {
  billingMonth?: string;
  status?: string;
  customerId?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}
