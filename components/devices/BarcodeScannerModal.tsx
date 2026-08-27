"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { parseScannedBarcode, playScanBeep, triggerScanVibration, type ParsedBarcodeResult } from "@/lib/barcode";
import { toast } from "react-hot-toast";

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
  description = "Point your camera at the barcode, MAC address, or QR code on the back of the device.",
  targetFieldLabel,
}: BarcodeScannerModalProps) {
  const uniqueId = useId().replace(/:/g, "-");
  const readerElementId = `barcode-reader-${uniqueId}`;

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true); // Mirrored by default per user requirement
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const isStoppingRef = useRef(false);

  // Stop scanner safely
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      isStoppingRef.current = true;
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        isStoppingRef.current = false;
        setIsScanning(false);
      }
    }
  };

  // Start scanner
  const startScanner = async (cameraId?: string) => {
    setErrorMessage(null);
    setLastScannedValue(null);

    // Stop current instance if running
    await stopScanner();

    const element = document.getElementById(readerElementId);
    if (!element) return;

    try {
      const html5QrCode = new Html5Qrcode(readerElementId, {
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

      // Available cameras check
      const deviceList = await Html5Qrcode.getCameras();
      if (deviceList && deviceList.length > 0) {
        setCameras(deviceList);
      }

      // Choose camera config: prefer back camera on phones/tablets or selected ID
      const cameraConfig = cameraId
        ? cameraId
        : deviceList && deviceList.length > 0
        ? { facingMode: "environment" }
        : { facingMode: "user" };

      const config = {
        fps: 20, // High FPS for instant zero-click detection
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Wide rectangular aspect ratio ideal for 1D barcodes and 2D QR codes on equipment stickers
          const width = Math.floor(minEdge * 0.85);
          const height = Math.floor(minEdge * 0.55);
          return { width: Math.max(width, 240), height: Math.max(height, 160) };
        },
        aspectRatio: 1.333333,
        showTorchButtonIfSupported: true,
      };

      await html5QrCode.start(
        cameraConfig,
        config,
        (decodedText) => {
          // Success callback - triggered immediately when barcode is detected
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame failure callback (ignore noisy frame parse misses)
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && "torch" in capabilities) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.error("Camera start error:", err);
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
  };

  const handleSuccessfulScan = (decodedText: string) => {
    if (!decodedText || isStoppingRef.current) return;

    if (soundEnabled) {
      playScanBeep();
    }
    triggerScanVibration(100);

    const parsed = parseScannedBarcode(decodedText);
    setLastScannedValue(parsed.macAddress || parsed.serialNumber || decodedText);

    // Call external handler
    onScan(parsed);

    // Close scanner after slight delay so user sees positive confirmation
    setTimeout(() => {
      stopScanner().then(() => {
        onOpenChange(false);
      });
    }, 450);
  };

  // Toggle mirror display via CSS
  const toggleMirror = () => {
    setIsMirrored((prev) => !prev);
  };

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        // @ts-expect-error torch is part of MediaTrackConstraintSet on supported browsers
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.error("Torch error:", err);
      toast.error("Could not toggle flashlight on this device");
    }
  };

  // Switch camera
  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    setSelectedCameraId(nextCam.id);
    startScanner(nextCam.id);
  };

  // Manage open state and cleanup
  useEffect(() => {
    if (open) {
      // Delay slightly to let the dialog DOM mount
      const timer = setTimeout(() => {
        startScanner(selectedCameraId || undefined);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[480px] p-0 overflow-hidden bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl">
        <DialogHeader className="p-3 sm:p-4 pb-2 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-semibold text-white truncate">
                  {title}
                </DialogTitle>
                {targetFieldLabel && (
                  <span className="inline-block text-[10px] sm:text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 truncate max-w-full">
                    {targetFieldLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Video Viewport Container */}
        <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {/* html5-qrcode reader element with dynamic mirror CSS */}
          <div
            id={readerElementId}
            className={`w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover ${
              isMirrored ? "[&>video]:scale-x-[-1]" : ""
            }`}
          />

          {/* Scanner Overlay UI / Aiming Reticle */}
          {isScanning && !errorMessage && !lastScannedValue && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 sm:p-6">
              {/* Outer darkened vignette */}
              <div className="relative w-full max-w-[320px] h-[170px] sm:h-[190px] rounded-xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                {/* Corner guide brackets */}
                <div className="absolute top-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

                {/* Laser animation beam */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[bounce_2s_infinite]" />

                <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-emerald-300/90 bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20 backdrop-blur-sm text-center mx-2">
                  Align Barcode / QR Inside Frame
                </span>
              </div>
            </div>
          )}

          {/* Scanned Confirmation Overlay */}
          {lastScannedValue && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-2 sm:mb-3">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-bounce" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white mb-1">Scanned Successfully!</h4>
              <div className="px-3 py-1 rounded-lg bg-slate-900/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs sm:text-sm font-semibold max-w-[95%] truncate">
                {lastScannedValue}
              </div>
            </div>
          )}

          {/* Error / Permission Blocked Message */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center text-center z-10">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 mb-2 sm:mb-3" />
              <p className="text-xs sm:text-sm font-medium text-slate-200 mb-3 sm:mb-4 max-w-[320px]">
                {errorMessage}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                onClick={() => startScanner(selectedCameraId || undefined)}
              >
                Retry Camera
              </Button>
            </div>
          )}
        </div>

        {/* Responsive Scanner Control Bar */}
        <div className="p-2 sm:p-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {/* Mirror View Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMirror}
              title={isMirrored ? "Mirroring ON (Click to un-mirror)" : "Mirroring OFF (Click to mirror)"}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium border-slate-700 transition-colors ${
                isMirrored
                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/40"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <FlipHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
              <span>{isMirrored ? "Mirrored" : "Normal"}</span>
            </Button>

            {/* Torch / Flashlight Toggle */}
            {hasTorch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleTorch}
                title={torchOn ? "Turn Flash Off" : "Turn Flash On"}
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

            {/* Switch Camera if multiple cameras available */}
            {cameras.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={switchCamera}
                title="Switch between front/back cameras"
                className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <SwitchCamera className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                <span>Flip</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
            {/* Audio Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute scan sound" : "Enable scan sound"}
              className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
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
