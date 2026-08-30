"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Camera,
  FlipHorizontal,
  Zap,
  ZapOff,
  SwitchCamera,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  parseScannedBarcode,
  playScanBeep,
  triggerScanVibration,
  type ParsedBarcodeResult,
} from "@/lib/barcode";
import { toast } from "react-hot-toast";

// ── BarcodeDetector Web API types ─────────────────────────────────────────────
interface NativeDetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: ReadonlyArray<{ x: number; y: number }>;
}

// Palette for multi-barcode overlay boxes
const OVERLAY_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#06b6d4", // cyan
];

const NATIVE_FORMATS = [
  "qr_code", "code_128", "code_39", "ean_13", "ean_8",
  "upc_a", "upc_e", "codabar", "data_matrix", "itf", "aztec", "pdf417",
];

// Canvas rounded-rect polyfill (works everywhere)
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: ParsedBarcodeResult) => void;
  title?: string;
  description?: string;
  targetFieldLabel?: string;
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = "Live Barcode Scanner",
  description = "Point your camera at a barcode or QR code. If multiple are detected, tap the one you want.",
  targetFieldLabel,
}: BarcodeScannerModalProps) {

  // ── Feature detection ──────────────────────────────────────────────────────
  // BarcodeDetector: Chrome 83+, Edge 83+, Android Chrome. NOT on iOS/Firefox.
  const supportsNative =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  // Legacy element ID for html5-qrcode fallback
  const uniqueId = useId().replace(/:/g, "-");
  const legacyElementId = `barcode-reader-${uniqueId}`;

  // ── Shared state ───────────────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  // Native-mode only
  const [detectedCodes, setDetectedCodes] = useState<NativeDetectedBarcode[]>([]);
  const [videoAspect, setVideoAspect] = useState("4/3");

  // ── Refs ───────────────────────────────────────────────────────────────────
  const isStoppingRef = useRef(false);
  const isMirroredRef = useRef(isMirrored);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { isMirroredRef.current = isMirrored; }, [isMirrored]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Native-mode refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{
    detect(src: HTMLVideoElement): Promise<NativeDetectedBarcode[]>;
  } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const singleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSingleRef = useRef<string | null>(null);

  // Legacy-mode ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Stable ref to success handler (used inside rAF callback)
  const handleSuccessfulScanRef = useRef<(rawValue: string) => void>(() => {});

  // ── Init BarcodeDetector ───────────────────────────────────────────────────
  useEffect(() => {
    if (!supportsNative) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = (window as any).BarcodeDetector;
    try {
      detectorRef.current = new BD({ formats: NATIVE_FORMATS });
    } catch {
      detectorRef.current = new BD();
    }
  }, [supportsNative]);

  // ── Stop scanner (both modes) ──────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    isStoppingRef.current = true;

    if (supportsNative) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (singleTimerRef.current) {
        clearTimeout(singleTimerRef.current);
        singleTimerRef.current = null;
      }
      lastSingleRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
      setDetectedCodes([]);
    } else {
      if (html5QrCodeRef.current?.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
    }

    setIsScanning(false);
    setTimeout(() => { isStoppingRef.current = false; }, 100);
  }, [supportsNative]);

  const stopScannerRef = useRef(stopScanner);
  useEffect(() => { stopScannerRef.current = stopScanner; }, [stopScanner]);

  // ── Shared success handler ─────────────────────────────────────────────────
  const handleSuccessfulScan = useCallback((rawValue: string) => {
    if (!rawValue || isStoppingRef.current) return;

    if (soundEnabledRef.current) playScanBeep();
    triggerScanVibration(100);

    setFlashKey((k) => k + 1);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 600);

    const parsed = parseScannedBarcode(rawValue);
    setLastScannedValue(parsed.macAddress || parsed.serialNumber || rawValue);
    onScan(parsed);

    if (singleTimerRef.current) {
      clearTimeout(singleTimerRef.current);
      singleTimerRef.current = null;
    }

    setTimeout(async () => {
      await stopScannerRef.current();
      onOpenChange(false);
    }, 700);
  }, [onScan, onOpenChange]);

  useEffect(() => { handleSuccessfulScanRef.current = handleSuccessfulScan; }, [handleSuccessfulScan]);

  // ── Canvas overlay drawing ─────────────────────────────────────────────────
  const drawOverlay = useCallback((codes: NativeDetectedBarcode[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, vw, vh);

    codes.forEach((code, i) => {
      const { y, width, height } = code.boundingBox;
      let { x } = code.boundingBox;
      // Mirror x so overlay aligns with the CSS-flipped video element
      if (isMirroredRef.current) {
        x = vw - x - width;
      }

      const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
      const pad = 8;
      const rx = x - pad;
      const ry = y - pad;
      const rw = width + pad * 2;
      const rh = height + pad * 2;

      // Semi-transparent fill
      ctx.fillStyle = `${color}30`;
      drawRoundRect(ctx, rx, ry, rw, rh, 10);
      ctx.fill();

      // Glowing border
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      drawRoundRect(ctx, rx, ry, rw, rh, 10);
      ctx.stroke();
      ctx.restore();

      // Corner accent circles
      ctx.fillStyle = color;
      ([ [rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh] ] as [number, number][])
        .forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
        });

      // ── Format badge ──────────────────────────────────────────────────────
      const numLabel = `${i + 1}`;
      const fmtLabel = `  ${code.format.replace(/_/g, "-").toUpperCase()}`;
      const fontSize = Math.max(13, vw * 0.022);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      const numW = ctx.measureText(numLabel).width;
      const fmtW = ctx.measureText(fmtLabel).width;
      const badgeW = numW + fmtW + 20;
      const badgeH = fontSize + 14;
      const badgeX = Math.max(0, rx);
      const badgeY = Math.max(0, ry - badgeH - 6);

      ctx.fillStyle = color;
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(numLabel, badgeX + 10, badgeY + badgeH - 7);
      ctx.fillStyle = "#ffffffcc";
      ctx.fillText(fmtLabel, badgeX + 10 + numW, badgeY + badgeH - 7);

      // ── Value preview (below the box) ─────────────────────────────────────
      const valFontSize = Math.max(11, vw * 0.018);
      ctx.font = `${valFontSize}px monospace`;
      const rawDisplay =
        code.rawValue.length > 24 ? code.rawValue.slice(0, 23) + "\u2026" : code.rawValue;
      const valW = ctx.measureText(rawDisplay).width + 16;
      const valH = valFontSize + 10;
      const valX = rx;
      const valY = ry + rh + 5;

      ctx.fillStyle = "rgba(0,0,0,0.60)";
      drawRoundRect(ctx, valX, valY, valW, valH, 5);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(rawDisplay, valX + 8, valY + valFontSize + 2);
    });

    // ── "Tap to select" hint banner (multiple codes) ──────────────────────
    if (codes.length > 1) {
      const hintText = `${codes.length} barcodes detected \u2014 tap the one you want`;
      const hf = Math.max(13, vw * 0.022);
      ctx.font = `bold ${hf}px system-ui, sans-serif`;
      const hw = ctx.measureText(hintText).width + 28;
      const hh = hf + 16;
      const hx = (vw - hw) / 2;
      const hy = vh - hh - 18;

      ctx.fillStyle = "rgba(0,0,0,0.72)";
      drawRoundRect(ctx, hx, hy, hw, hh, hh / 2);
      ctx.fill();

      ctx.fillStyle = "#fbbf24";
      ctx.fillText(hintText, hx + 14, hy + hf + 4);
    }
  }, []);

  // ── Native detection loop (rAF-based) ──────────────────────────────────────
  const runDetectLoop = useCallback(() => {
    if (isStoppingRef.current) return;

    const loop = () => {
      if (isStoppingRef.current) return;
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector) return;

      if (video.readyState >= 2) {
        detector
          .detect(video)
          .then((codes) => {
            if (isStoppingRef.current) return;
            setDetectedCodes(codes);
            drawOverlay(codes);

            if (codes.length === 1) {
              const val = codes[0].rawValue;
              if (lastSingleRef.current !== val) {
                lastSingleRef.current = val;
                if (singleTimerRef.current) clearTimeout(singleTimerRef.current);
                // Auto-select single barcode after 700ms stable detection
                singleTimerRef.current = setTimeout(() => {
                  if (lastSingleRef.current === val && !isStoppingRef.current) {
                    handleSuccessfulScanRef.current(val);
                  }
                }, 700);
              }
            } else {
              if (singleTimerRef.current) {
                clearTimeout(singleTimerRef.current);
                singleTimerRef.current = null;
              }
              if (codes.length === 0) lastSingleRef.current = null;
            }
          })
          .catch(() => { /* ignore per-frame errors */ })
          .finally(() => {
            if (!isStoppingRef.current) {
              animFrameRef.current = requestAnimationFrame(loop);
            }
          });
      } else {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    loop();
  }, [drawOverlay]);

  // ── Start scanner ──────────────────────────────────────────────────────────
  const startScanner = useCallback(
    async (cameraId?: string) => {
      if (isStoppingRef.current) return;
      setErrorMessage(null);
      setLastScannedValue(null);
      setDetectedCodes([]);

      if (supportsNative) {
        // ── Native path: getUserMedia + BarcodeDetector ─────────────────────
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }

        try {
          const constraints: MediaStreamConstraints = {
            video: cameraId
              ? { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              const v = videoRef.current;
              if (v) setVideoAspect(`${v.videoWidth}/${v.videoHeight}`);
            };
            await videoRef.current.play();
          }

          setIsScanning(true);

          // Enumerate cameras for switching
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vCams = devices.filter((d) => d.kind === "videoinput");
          setCameras(vCams.map((d, idx) => ({
            id: d.deviceId,
            label: d.label || `Camera ${idx + 1}`,
          })));

          // Check torch support
          const track = stream.getVideoTracks()[0];
          if (track) {
            const caps = track.getCapabilities?.();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setHasTorch(!!((caps as any)?.torch));
          }

          runDetectLoop();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
            setErrorMessage("Camera permission was denied. Please allow camera access in your browser settings.");
          } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
            setErrorMessage("No camera found on your device.");
          } else {
            setErrorMessage(`Unable to access camera: ${msg}`);
          }
          setIsScanning(false);
        }
      } else {
        // ── Legacy path: html5-qrcode ───────────────────────────────────────
        await stopScannerRef.current();

        const element = document.getElementById(legacyElementId);
        if (!element) return;

        try {
          const html5QrCode = new Html5Qrcode(legacyElementId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.ITF,
            ],
            verbose: false,
          });
          html5QrCodeRef.current = html5QrCode;

          const deviceList = await Html5Qrcode.getCameras();
          if (deviceList?.length > 0) {
            setCameras(deviceList.map((c) => ({ id: c.id, label: c.label })));
          }

          const cameraConfig = cameraId
            ? cameraId
            : deviceList?.length > 0
            ? { facingMode: "environment" }
            : { facingMode: "user" };

          await html5QrCode.start(
            cameraConfig,
            {
              fps: 20,
              qrbox: (w: number, h: number) => {
                const minEdge = Math.min(w, h);
                return {
                  width: Math.max(Math.floor(minEdge * 0.85), 240),
                  height: Math.max(Math.floor(minEdge * 0.55), 160),
                };
              },
              aspectRatio: 1.333333,
            },
            (decodedText) => { handleSuccessfulScanRef.current(decodedText); },
            () => {}
          );

          setIsScanning(true);

          try {
            const caps = html5QrCode.getRunningTrackCapabilities();
            setHasTorch(!!(caps && "torch" in caps));
          } catch { setHasTorch(false); }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
            setErrorMessage("Camera permission was denied. Please allow camera access in your browser settings.");
          } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
            setErrorMessage("No camera found on your device.");
          } else {
            setErrorMessage(`Unable to access camera: ${msg}`);
          }
          setIsScanning(false);
        }
      }
    },
    [supportsNative, legacyElementId, runDetectLoop]
  );

  // ── Torch toggle ───────────────────────────────────────────────────────────
  const toggleTorch = async () => {
    if (!hasTorch) return;
    const next = !torchOn;
    try {
      if (supportsNative && streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ torch: next } as any] });
      } else if (!supportsNative && html5QrCodeRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: next } as any] });
      }
      setTorchOn(next);
    } catch {
      toast.error("Could not toggle flashlight on this device");
    }
  };

  // ── Camera switch ──────────────────────────────────────────────────────────
  const switchCamera = () => {
    if (cameras.length < 2) return;
    const idx = cameras.findIndex((c) => c.id === selectedCameraId);
    const next = cameras[(idx + 1) % cameras.length];
    setSelectedCameraId(next.id);
    startScanner(next.id);
  };

  // ── Canvas tap/click: hit-test which barcode was tapped ───────────────────
  const handleCanvasInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || detectedCodes.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = video.videoWidth / rect.width;
      const scaleY = video.videoHeight / rect.height;
      let hitX = (clientX - rect.left) * scaleX;
      const hitY = (clientY - rect.top) * scaleY;

      // Un-mirror click X to match barcode coordinate space
      if (isMirroredRef.current) {
        hitX = video.videoWidth - hitX;
      }

      const EXTRA = 20; // generous tap target padding
      const hit = detectedCodes.find((code) => {
        const { x, y, width, height } = code.boundingBox;
        return (
          hitX >= x - EXTRA &&
          hitX <= x + width + EXTRA &&
          hitY >= y - EXTRA &&
          hitY <= y + height + EXTRA
        );
      });

      if (hit) { handleSuccessfulScanRef.current(hit.rawValue); }
    },
    [detectedCodes]
  );

  // ── Open/close lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => startScanner(selectedCameraId || undefined), 150);
      return () => clearTimeout(t);
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Shared overlay sub-components ─────────────────────────────────────────
  const ScanReticle = () => (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-[320px] h-[170px] sm:h-[190px] rounded-xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
        <div className="scan-corner absolute top-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
        <div className="scan-corner absolute top-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" style={{ animationDelay: "0.45s" }} />
        <div className="scan-corner absolute bottom-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" style={{ animationDelay: "0.9s" }} />
        <div className="scan-corner absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" style={{ animationDelay: "1.35s" }} />
        <div className="scan-laser-line" />
        <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-emerald-300/90 bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20 backdrop-blur-sm text-center mx-2 z-10">
          Align Barcode / QR Inside Frame
        </span>
      </div>
    </div>
  );

  const SuccessOverlay = () => (
    <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20 animate-in fade-in zoom-in-95">
      <div className="scan-ripple" />
      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-2 sm:mb-3">
        <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-in zoom-in-50" />
      </div>
      <h4 className="text-base sm:text-lg font-bold text-white mb-1 animate-in slide-in-from-bottom-2">Scanned Successfully!</h4>
      <div className="px-3 py-1 rounded-lg bg-slate-900/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs sm:text-sm font-semibold max-w-[95%] truncate animate-in slide-in-from-bottom-2">
        {lastScannedValue}
      </div>
      <p className="text-[10px] text-emerald-400/70 mt-2 animate-in fade-in">Filling form fields\u2026</p>
    </div>
  );

  const ErrorOverlay = () => (
    <div className="absolute inset-0 bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center text-center z-10">
      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 mb-2 sm:mb-3" />
      <p className="text-xs sm:text-sm font-medium text-slate-200 mb-3 sm:mb-4 max-w-[320px]">{errorMessage}</p>
      <Button
        variant="outline" size="sm"
        className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
        onClick={() => startScanner(selectedCameraId || undefined)}
      >
        Retry Camera
      </Button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[480px] p-0 overflow-hidden bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl">

        {/* Header */}
        <DialogHeader className="p-3 sm:p-4 pb-2 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-semibold text-white truncate">{title}</DialogTitle>
              {targetFieldLabel && (
                <span className="inline-block text-[10px] sm:text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 truncate max-w-full">
                  {targetFieldLabel}
                </span>
              )}
            </div>
          </div>
          <DialogDescription className="text-[11px] sm:text-xs mt-1">
            {supportsNative && detectedCodes.length > 1 ? (
              <span className="text-amber-300 font-semibold animate-pulse">
                {detectedCodes.length} barcodes detected \u2014 tap the one you want
              </span>
            ) : (
              <span className="text-slate-400">{description}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Video Viewport */}
        {supportsNative ? (
          /* Native multi-barcode mode */
          <div
            className="relative w-full bg-black overflow-hidden"
            style={{ aspectRatio: videoAspect }}
          >
            <video
              ref={videoRef}
              className={`w-full h-full object-fill bg-black${isMirrored ? " [transform:scaleX(-1)]" : ""}`}
              autoPlay
              playsInline
              muted
            />

            {/* Multi-barcode overlay canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ cursor: detectedCodes.length > 0 ? "pointer" : "default" }}
              onClick={(e) => handleCanvasInteraction(e.clientX, e.clientY)}
              onTouchEnd={(e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                handleCanvasInteraction(touch.clientX, touch.clientY);
              }}
            />

            {isScanning && !errorMessage && !lastScannedValue && detectedCodes.length === 0 && <ScanReticle />}
            {showFlash && <div key={flashKey} className="scan-flash-overlay rounded-none" />}
            {lastScannedValue && <SuccessOverlay />}
            {errorMessage && <ErrorOverlay />}
          </div>
        ) : (
          /* Legacy html5-qrcode mode (iOS / Firefox) */
          <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
            <div
              id={legacyElementId}
              className={`w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover ${isMirrored ? "[&>video]:scale-x-[-1]" : ""}`}
            />

            {isScanning && !errorMessage && !lastScannedValue && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 whitespace-nowrap">
                  Legacy mode \u2014 upgrade to Chrome for multi-barcode support
                </span>
              </div>
            )}

            {isScanning && !errorMessage && !lastScannedValue && <ScanReticle />}
            {showFlash && <div key={flashKey} className="scan-flash-overlay rounded-none" />}
            {lastScannedValue && <SuccessOverlay />}
            {errorMessage && <ErrorOverlay />}
          </div>
        )}

        {/* Control Bar */}
        <div className="p-2 sm:p-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => setIsMirrored((p) => !p)}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium border-slate-700 transition-colors ${
                isMirrored
                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/40"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <FlipHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
              <span>{isMirrored ? "Mirrored" : "Normal"}</span>
            </Button>

            {hasTorch && (
              <Button
                type="button" variant="outline" size="sm"
                onClick={toggleTorch}
                className={`h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium border-slate-700 ${
                  torchOn
                    ? "bg-amber-500/30 text-amber-300 border-amber-500/50 hover:bg-amber-500/40"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {torchOn ? <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-amber-400" /> : <ZapOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />}
                <span>Flash</span>
              </Button>
            )}

            {cameras.length > 1 && (
              <Button
                type="button" variant="outline" size="sm"
                onClick={switchCamera}
                className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <SwitchCamera className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                <span>Flip</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
            <Button
              type="button" variant="ghost" size="icon"
              onClick={() => setSoundEnabled((s) => !s)}
              className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              {soundEnabled
                ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
            </Button>

            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 sm:h-8 px-2 sm:px-3 text-[11px] sm:text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
