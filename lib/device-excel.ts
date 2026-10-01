import type { IDevice } from "@/types";

export const DEVICE_EXPORT_HEADERS = [
  "SL",
  "Device Name",
  "Device Type",
  "MAC Address",
  "IP Address",
  "Status",
  "Server",
  "Server SL",
  "Uplink Switch",
  "Uplink Switch SL",
  "Total Ports",
  "AP Number",
  "Customer Name",
  "Customer Mobile",
  "GPS Link",
  "Activation Date",
  "Online Link",
  "Description",
  "Rejection Reason",
  "Submitted By Email",
  "Submitted By Name",
  "Submitted By Role",
  "Submitted By User ID",
  "Submitted At",
  "Approved By Email",
  "Approved By Name",
  "Approved By Role",
  "Approved By User ID",
  "Approved At",
  "Rejected By Email",
  "Rejected By Name",
  "Rejected By Role",
  "Rejected By User ID",
  "Rejected By Reason",
  "Rejected At",
  "Created At",
  "Updated At",
];

export const DEVICE_IMPORT_HEADERS = [
  "Device Name",
  "Device Type",
  "MAC Address",
  "IP Address",
  "Status",
  "Server",
  "Uplink Switch",
  "Total Ports",
  "AP Number",
  "Customer Name",
  "Customer Mobile",
  "GPS Link",
  "Activation Date",
  "Online Link",
  "Description",
  "Rejection Reason",
];

function formatDate(value?: string | Date) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function referenceValues(value: IDevice | string | null | undefined) {
  if (value && typeof value === "object") {
    return {
      name: value.deviceName || "",
      sl: value.sl || "",
    };
  }
  return { name: value || "", sl: "" };
}

export function mapDeviceToExportRow(device: IDevice): Record<string, unknown> {
  const server = referenceValues(device.server);
  const uplinkSwitch = referenceValues(device.uplinkSwitch);

  return {
    SL: device.sl,
    "Device Name": device.deviceName,
    "Device Type": device.deviceType,
    "MAC Address": device.macAddress || "",
    "IP Address": device.ipAddress || "",
    Status: device.status,
    Server: server.name,
    "Server SL": server.sl,
    "Uplink Switch": uplinkSwitch.name,
    "Uplink Switch SL": uplinkSwitch.sl,
    "Total Ports": device.totalPorts ?? "",
    "AP Number": device.apNumber || "",
    "Customer Name": device.customerName || "",
    "Customer Mobile": device.customerMobile || "",
    "GPS Link": device.gpsLink || "",
    "Activation Date": formatDate(device.activationDate),
    "Online Link": device.onlineLink || "",
    Description: device.description || "",
    "Rejection Reason": device.rejectionReason || "",
    "Submitted By Email": device.submittedBy?.email || "",
    "Submitted By Name": device.submittedBy?.name || "",
    "Submitted By Role": device.submittedBy?.role || "",
    "Submitted By User ID": device.submittedBy?.userId || "",
    "Submitted At": formatDate(device.submittedBy?.date),
    "Approved By Email": device.approvedBy?.email || "",
    "Approved By Name": device.approvedBy?.name || "",
    "Approved By Role": device.approvedBy?.role || "",
    "Approved By User ID": device.approvedBy?.userId || "",
    "Approved At": formatDate(device.approvedBy?.date),
    "Rejected By Email": device.rejectedBy?.email || "",
    "Rejected By Name": device.rejectedBy?.name || "",
    "Rejected By Role": device.rejectedBy?.role || "",
    "Rejected By User ID": device.rejectedBy?.userId || "",
    "Rejected By Reason": device.rejectedBy?.reason || "",
    "Rejected At": formatDate(device.rejectedBy?.date),
    "Created At": formatDate(device.createdAt),
    "Updated At": formatDate(device.updatedAt),
  };
}

export function createDeviceImportSample(
  deviceType: string,
  deviceTypeName: string,
): Record<string, string | number> {
  const today = new Date().toISOString().split("T")[0];
  const isServer = deviceType === "server";
  const isAccessPoint = deviceType === "access-point";
  const hasCustomer = isAccessPoint || deviceType === "router";
  return {
    "Device Name": `${deviceTypeName} Node 1`,
    "Device Type": deviceType,
    "MAC Address": "48:8F:5A:11:22:33",
    "IP Address": "192.168.1.10",
    Status: "Active",
    Server: "",
    "Uplink Switch": "",
    "Total Ports": deviceType === "switch" ? 24 : "",
    "AP Number": isAccessPoint ? "AP-001" : "",
    "Customer Name": hasCustomer ? "Example Customer" : "",
    "Customer Mobile": hasCustomer ? "01700000000" : "",
    "GPS Link": "https://maps.google.com/?q=23.8103,90.4125",
    "Activation Date": today,
    "Online Link": isServer ? "https://192.168.1.10" : "",
    Description: `${deviceTypeName} installed at main site`,
    "Rejection Reason": "",
  };
}
