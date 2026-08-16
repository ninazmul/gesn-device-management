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
 * Format sequence number to standard 6-digit SL e.g. "000124"
 */
export function formatSL(seq: number, length: number = 6): string {
  return String(seq).padStart(length, "0");
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
 * Validates IPv4 Address format
 */
export function isValidIPv4(ip: string): boolean {
  if (!ip) return true; // Optional field in some contexts
  const ipRegex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip.trim());
}
