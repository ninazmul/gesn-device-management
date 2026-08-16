/**
 * Shared Excel (xlsx) utilities for bulk import/export across all modules.
 * Uses SheetJS (xlsx) — works in both browser and Node.js contexts.
 */
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Robust Field Parsing & Type Coercion Helpers
// ---------------------------------------------------------------------------

/**
 * Flexible field reader that finds values regardless of key casing, leading/trailing spaces,
 * or minor header variations (e.g., "Customer Code" vs "CustomerCode" vs "customercode").
 */
export function getFlexibleField(raw: Record<string, unknown>, ...possibleKeys: string[]): unknown {
  if (!raw) return undefined;
  
  // 1. Direct lookup
  for (const k of possibleKeys) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") return raw[k];
  }

  // 2. Normalized lookup (lowercase, stripped punctuation/spaces)
  const rawKeys = Object.keys(raw);
  for (const k of possibleKeys) {
    const targetKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const rk of rawKeys) {
      if (rk.toLowerCase().replace(/[^a-z0-9]/g, "") === targetKey) {
        const val = raw[rk];
        if (val !== undefined && val !== null && val !== "") return val;
      }
    }
  }

  return undefined;
}

/**
 * Safely parses any value to a number.
 * Handles numbers, numeric strings, currency formatting ("৳ 1,500.00"), and empty values.
 */
export function safeParseNumber(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  if (typeof val === "string") {
    // Strip common currency symbols, commas, whitespace
    const cleaned = val.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Safely parses any value to a Date object.
 * Handles JS Date objects, ISO/formatted date strings ("YYYY-MM-DD", "DD/MM/YYYY"),
 * and Excel serial date numbers (e.g. 45200).
 */
export function safeParseDate(val: unknown, fallback: Date = new Date()): Date {
  if (val === null || val === undefined || val === "") return fallback;
  if (val instanceof Date) return isNaN(val.getTime()) ? fallback : val;

  // Handle Excel serial date numbers (e.g., 45200)
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? fallback : date;
  }

  if (typeof val === "string") {
    const str = val.trim();
    if (!str) return fallback;

    // Check if string is a numeric serial date
    if (!isNaN(Number(str))) {
      return safeParseDate(Number(str), fallback);
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return fallback;
}

/**
 * Safely parses any value to a trimmed string.
 * Gracefully converts numbers, booleans, etc. to string.
 */
export function safeParseString(val: unknown, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  return str.length > 0 ? str : fallback;
}

// ---------------------------------------------------------------------------
// Template Download
// ---------------------------------------------------------------------------

/**
 * Creates and triggers download of a blank .xlsx template with given headers.
 * Also adds a sample row so users understand the expected format.
 */
export function downloadTemplate(
  headers: string[],
  sampleRow: Record<string, string | number>,
  filename: string
): void {
  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });

  // Style the header row width hints (col widths)
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// Export to Excel
// ---------------------------------------------------------------------------

/**
 * Exports an array of objects to a formatted .xlsx file and triggers download.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  headers: string[],
  sheetName: string,
  filename: string
): void {
  if (data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// Multi-sheet Export (for Reports)
// ---------------------------------------------------------------------------

export interface ExcelSheet {
  name: string;
  data: Record<string, unknown>[];
  headers: string[];
}

/**
 * Creates a multi-sheet workbook — used for the full financial report.
 */
export function exportMultiSheetExcel(sheets: ExcelSheet[], filename: string): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(
      sheet.data.length > 0 ? sheet.data : [{}],
      { header: sheet.headers }
    );
    ws["!cols"] = sheet.headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// Parse Uploaded File
// ---------------------------------------------------------------------------

/**
 * Reads an uploaded .xlsx / .xls / .csv file and returns an array of
 * raw row objects (keys are the header names from row 1).
 */
export async function parseExcelFile(
  file: File
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          firstSheet,
          { defval: "" }
        );
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
