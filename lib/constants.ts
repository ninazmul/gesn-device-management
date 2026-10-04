export const PRIMARY_DEVICE_TYPES = [
  { slug: "server", name: "Server", isProtected: true, icon: "Server" },
  { slug: "switch", name: "Switch", isProtected: true, icon: "Network" },
  { slug: "antenna", name: "Antenna", isProtected: true, icon: "Radio" },
  {
    slug: "access-point",
    name: "Access Point",
    isProtected: true,
    icon: "Wifi",
  },
  { slug: "router", name: "Router", isProtected: true, icon: "Router" },
] as const;

export const STORAGE_DEVICE_CATEGORIES = [
  { slug: "antenna", name: "Antenna" },
  { slug: "router", name: "Router" },
  { slug: "access-point", name: "Access Point" },
  { slug: "switch", name: "Switch" },
  { slug: "server", name: "Server" },
] as const;

export type StorageDeviceCategory =
  (typeof STORAGE_DEVICE_CATEGORIES)[number]["slug"];

export function getStorageDeviceCategoryName(deviceType: string): string {
  return (
    STORAGE_DEVICE_CATEGORIES.find((category) => category.slug === deviceType)
      ?.name || deviceType
  );
}

export const DEVICE_STATUSES = [
  "Pending",
  "Online",
  "Storage",
  "Frozen",
  "Lost",
  "Maintenance",
] as const;

export const DEVICE_REJECTION_REASONS = [
  "Incorrect MAC Address",
  "Duplicate Device",
  "Incorrect AP Number",
  "Wrong Server",
  "Incorrect Customer Details",
  "Incorrect Location",
  "Incorrect Brand / Model",
  "Missing Required Information",
  "Device Not Verified",
] as const;

export const CUSTOMER_STATUSES = ["Active", "Inactive", "Suspended"] as const;

export const CUSTOMER_SERVICE_TYPES = ["CCTV", "TV", "Service C"] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Card",
  "STC Pay / Mobile",
  "Other",
] as const;

export const BILLING_STATUSES = [
  "Pending",
  "Paid",
  "Partial",
  "Overdue",
  "Cancelled",
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "sl_asc", label: "SL (Ascending)" },
  { value: "sl_desc", label: "SL (Descending)" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "status", label: "By Status" },
] as const;

export const CUSTOMER_SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "id_asc", label: "ID (Ascending)" },
  { value: "id_desc", label: "ID (Descending)" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "bill_desc", label: "Highest Bill" },
  { value: "bill_asc", label: "Lowest Bill" },
] as const;

export const BILLING_SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "due_date_asc", label: "Due Date (Earliest)" },
  { value: "due_date_desc", label: "Due Date (Latest)" },
  { value: "amount_desc", label: "Amount (High to Low)" },
  { value: "amount_asc", label: "Amount (Low to High)" },
] as const;

export const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    border: string;
    darkBg: string;
  }
> = {
  Pending: {
    label: "Pending",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500 animate-pulse",
    border: "border-amber-200 dark:border-amber-800/50",
    darkBg: "dark:bg-amber-950/40",
  },
  Online: {
    label: "Online",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-200 dark:border-emerald-800/50",
    darkBg: "dark:bg-emerald-950/40",
  },
  Storage: {
    label: "Storage",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-200 dark:border-blue-800/50",
    darkBg: "dark:bg-blue-950/40",
  },
  Maintenance: {
    label: "Maintenance",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500 animate-pulse",
    border: "border-amber-200 dark:border-amber-800/50",
    darkBg: "dark:bg-amber-950/40",
  },
  Frozen: {
    label: "Frozen",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    text: "text-slate-700 dark:text-slate-400",
    dot: "bg-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    darkBg: "dark:bg-slate-900/60",
  },
  Lost: {
    label: "Lost",
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
    border: "border-rose-200 dark:border-rose-800/50",
    darkBg: "dark:bg-rose-950/40",
  },
};

export const CUSTOMER_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    border: string;
    darkBg: string;
  }
> = {
  Active: {
    label: "Active",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-200 dark:border-emerald-800/50",
    darkBg: "dark:bg-emerald-950/40",
  },
  Inactive: {
    label: "Inactive",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    text: "text-slate-700 dark:text-slate-400",
    dot: "bg-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    darkBg: "dark:bg-slate-900/60",
  },
  Suspended: {
    label: "Suspended",
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
    border: "border-rose-200 dark:border-rose-800/50",
    darkBg: "dark:bg-rose-950/40",
  },
};

export const CUSTOMER_SERVICE_TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; darkBg: string }
> = {
  CCTV: {
    label: "CCTV",
    bg: "bg-purple-50 text-purple-700 border-purple-200",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800/50",
    darkBg: "dark:bg-purple-950/40",
  },
  TV: {
    label: "TV",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800/50",
    darkBg: "dark:bg-blue-950/40",
  },
  "Service C": {
    label: "Service C",
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800/50",
    darkBg: "dark:bg-indigo-950/40",
  },
};

export const BILLING_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    border: string;
    darkBg: string;
  }
> = {
  Paid: {
    label: "Paid",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-200 dark:border-emerald-800/50",
    darkBg: "dark:bg-emerald-950/40",
  },
  Partial: {
    label: "Partial",
    bg: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
    border: "border-sky-200 dark:border-sky-800/50",
    darkBg: "dark:bg-sky-950/40",
  },
  Pending: {
    label: "Pending",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-800/50",
    darkBg: "dark:bg-amber-950/40",
  },
  Overdue: {
    label: "Overdue",
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500 animate-pulse",
    border: "border-rose-200 dark:border-rose-800/50",
    darkBg: "dark:bg-rose-950/40",
  },
  Cancelled: {
    label: "Cancelled",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    text: "text-slate-700 dark:text-slate-400",
    dot: "bg-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    darkBg: "dark:bg-slate-900/60",
  },
};
