"use client";

import { useEffect, useRef } from "react";
import { parseScannedBarcode, playScanBeep, triggerScanVibration, type ParsedBarcodeResult } from "@/lib/barcode";

interface UseBarcodeGunOptions {
  onScan: (result: ParsedBarcodeResult) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Hook to detect and capture inputs from handheld physical USB/Bluetooth barcode scanner guns.
 */
export function useBarcodeGun({
  onScan,
  enabled = true,
  minChars = 4,
  maxIntervalMs = 60,
}: UseBarcodeGunOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // If user is actively typing in a standard input/textarea (not a scanner field), we still check timing
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      const currentTime = Date.now();
      const interval = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Enter or Tab typically signifies end of barcode stream from scanner
      if (e.key === "Enter" || e.key === "Tab") {
        if (bufferRef.current.length >= minChars) {
          const scannedText = bufferRef.current;
          bufferRef.current = "";

          // Prevent default if it was captured as a rapid scanner burst
          e.preventDefault();
          e.stopPropagation();

          const parsed = parseScannedBarcode(scannedText);
          playScanBeep();
          triggerScanVibration();
          onScanRef.current(parsed);
          return;
        }
        bufferRef.current = "";
        return;
      }

      // If key is a printable single character
      if (e.key.length === 1) {
        if (interval > maxIntervalMs) {
          // If too slow, reset buffer and start fresh
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs]);
}
