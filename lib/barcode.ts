/**
 * Smart Barcode & QR Code Parser for Networking Equipment
 */

export interface ParsedBarcodeResult {
  raw: string;
  macAddress?: string;
  serialNumber?: string;
  model?: string;
  ipAddress?: string;
  brand?: string;
}

/**
 * Normalizes a potential MAC address string into XX:XX:XX:XX:XX:XX format.
 * Returns null if not a valid 12-hex-character MAC.
 */
export function extractAndFormatMAC(text: string): string | null {
  if (!text) return null;

  // Clean common prefixes/suffixes (e.g., "MAC:", "MAC Address:", "MAC-", etc.)
  const cleaned = text.replace(/^(mac|mac address|mac_addr|mac:)\s*[:=-]?\s*/i, "").trim();

  // Find 12 contiguous hex chars or hex chars separated by : or - or .
  // e.g. "AA:BB:CC:DD:EE:FF", "AA-BB-CC-DD-EE-FF", "AABB.CCDD.EEFF", "AABBCCDDEEFF"
  const macMatch = cleaned.match(/(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}|(?:[0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}|[0-9A-Fa-f]{12}/);

  if (macMatch) {
    const rawHex = macMatch[0].replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
    if (rawHex.length === 12) {
      return (rawHex.match(/.{1,2}/g) || []).join(":");
    }
  }

  return null;
}

/**
 * Intelligent parser for device barcodes, labels, and QR codes.
 */
export function parseScannedBarcode(raw: string): ParsedBarcodeResult {
  const trimmed = raw.trim();
  const result: ParsedBarcodeResult = { raw: trimmed };

  // 1. Direct MAC check
  const directMac = extractAndFormatMAC(trimmed);
  if (directMac) {
    result.macAddress = directMac;
  }

  // 2. Check for IPv4 Address
  const ipMatch = trimmed.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
  if (ipMatch) {
    result.ipAddress = ipMatch[0];
  }

  // 3. Multi-field key-value formats (e.g., "MAC:XX;SN:YY;MODEL:ZZ" or "MAC=...&SN=..." or JSON)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const json = JSON.parse(trimmed);
      if (json.mac || json.macAddress) result.macAddress = extractAndFormatMAC(json.mac || json.macAddress) || result.macAddress;
      if (json.sn || json.serialNumber || json.serial) result.serialNumber = String(json.sn || json.serialNumber || json.serial).trim();
      if (json.model || json.modelName) result.model = String(json.model || json.modelName).trim();
      if (json.ip || json.ipAddress) result.ipAddress = String(json.ip || json.ipAddress).trim();
      if (json.brand) result.brand = String(json.brand).trim();
    } catch {
      // Not JSON, continue with regex parsing
    }
  }

  // Check key-value delimiter lines (; or , or & or newline)
  const lines = trimmed.split(/[\r\n;&,]+/);
  for (const line of lines) {
    const snMatch = line.match(/(?:s\/?n|serial|sn)\s*[:=-]\s*([A-Za-z0-9_-]+)/i);
    if (snMatch && !result.serialNumber) {
      result.serialNumber = snMatch[1].trim();
    }

    const macMatch = line.match(/(?:mac|mac_addr|mac\s*address)\s*[:=-]\s*([A-Fa-f0-9:.-]+)/i);
    if (macMatch && !result.macAddress) {
      const parsedMac = extractAndFormatMAC(macMatch[1]);
      if (parsedMac) result.macAddress = parsedMac;
    }

    const modelMatch = line.match(/(?:model|model_name|mod|pn|p\/n)\s*[:=-]\s*([^,;]+)/i);
    if (modelMatch && !result.model) {
      result.model = modelMatch[1].trim();
    }
  }

  // If no specific MAC or serial was matched, and it's a typical serial/alphanumeric code
  if (!result.macAddress && !result.serialNumber && /^[A-Za-z0-9_-]{5,32}$/.test(trimmed)) {
    result.serialNumber = trimmed;
  }

  return result;
}

/**
 * Plays a quick, crisp synthetic scan beep via Web Audio API.
 * Guaranteed zero-latency, offline, without external audio assets.
 */
export function playScanBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Pleasant positive double-tone (980Hz -> 1320Hz)
    osc.frequency.setValueAtTime(980, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // AudioContext might be blocked until user gesture, safe to ignore
  }
}

/**
 * Triggers haptic vibration if supported by device/browser.
 */
export function triggerScanVibration(pattern: number | number[] = 80): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Haptics unavailable, safe to ignore
  }
}
