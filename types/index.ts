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
  deviceType: string; // slug e.g. "antenna", "server"
  brand: string;
  model: string;
  deviceName: string;
  description?: string;
  onlineLink?: string;
  macAddress?: string;
  ipAddress?: string;
  activationDate?: string | Date;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  status: DeviceStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
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

export interface Admin {
  _id: string;
  email: string;
  createdAt: Date;
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
  }>;
  recentDevices: IDevice[];
  // Customer & Billing Summary
  customerStats: {
    totalCustomers: number;
    activeCustomers: number;
    suspendedCustomers: number;
  };
  billingStats: {
    currentMonth: string;
    monthlyBilled: number;
    collected: number;
    pending: number;
    overdue: number;
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
