import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const handleError = (error: unknown) => {
  console.error(error);
  throw new Error(typeof error === "string" ? error : JSON.stringify(error));
};

/**
 * Format a date value as DD-MM-YYYY.
 * Returns "—" if the date is missing or invalid.
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format sequence number to standard SL e.g. "001", "002"
 */
export function formatSL(seq: number, length: number = 3): string {
  return String(seq).padStart(length, "0");
}

/**
 * Format serial / SL number for polished UI display (e.g. "000002" -> "002")
 */
export function formatDisplaySL(sl: string | number | undefined | null): string {
  if (sl === undefined || sl === null || sl === "") return "";
  const s = String(sl).trim();
  const num = parseInt(s, 10);
  if (!isNaN(num)) {
    return String(num).padStart(Math.max(3, String(num).length), "0");
  }
  return s;
}

/**
 * Validates MAC Address format (XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)
 */
export function isValidMAC(mac: string): boolean {
  if (!mac) return true; // Optional field in some contexts
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac.trim());
}

/**
 * Normalizes various MAC formats (dashed, dotted, unseparated 12-char hex)
 * into standard uppercase colon-separated format (AA:BB:CC:DD:EE:FF).
 * Returns null if the format is invalid.
 */
export function normalizeMAC(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  // If already standard colon format
  if (/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(trimmed)) {
    return trimmed;
  }
  // If dashed format AA-BB-CC-DD-EE-FF
  if (/^([0-9A-F]{2}-){5}[0-9A-F]{2}$/.test(trimmed)) {
    return trimmed.replace(/-/g, ":");
  }
  // If raw 12 hex characters (e.g. AABBCCDDEEFF or aabb.ccdd.eeff)
  const cleaned = trimmed.replace(/[^0-9A-F]/g, "");
  if (cleaned.length === 12) {
    return (cleaned.match(/.{1,2}/g) || []).join(":");
  }
  return null;
}

/**
 * Validates IPv4 Address format
 */
export function isValidIPv4(ip: string): boolean {
  if (!ip) return true; // Optional field in some contexts
  const ipRegex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip.trim());
}
