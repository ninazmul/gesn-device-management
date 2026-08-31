"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseExcelFile, downloadTemplate } from "@/lib/excel";
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2, X, Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateHeaders: string[];
  sampleRow: Record<string, string | number>;
  templateFilename: string;
  onImport: (rows: Record<string, unknown>[]) => Promise<{
    success: boolean;
    createdCount: number;
    skippedCount?: number;
    totalRows: number;
    errors?: string[];
  }>;
  onSuccess: () => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  title,
  description,
  templateHeaders,
  sampleRow,
  templateFilename,
  onImport,
  onSuccess,
}: BulkImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorsCopied, setErrorsCopied] = useState(false);
  const [importResult, setImportResult] = useState<{
    createdCount: number;
    skippedCount: number;
    totalRows: number;
    errors?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    setImportResult(null);

    try {
      const rows = await parseExcelFile(file);
      setParsedRows(rows);
      if (rows.length === 0) {
        toast.error("The selected file contains no readable data rows.");
      } else {
        toast.success(`Loaded ${rows.length} rows from ${file.name}`);
      }
    } catch {
      toast.error("Failed to parse file. Please upload a valid .xlsx or .csv file.");
      setSelectedFile(null);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(templateHeaders, sampleRow, templateFilename);
    toast.success("Excel template downloaded!");
  };

  const handleStartImport = async () => {
    if (parsedRows.length === 0) return;
    setIsUploading(true);

    // Persistent loading toast — visible even if the modal is closed
    const loadingToastId = toast.loading(
      `Importing ${parsedRows.length} row${parsedRows.length > 1 ? "s" : ""}… Please wait.`,
      { duration: Infinity }
    );

    try {
      const res = await onImport(parsedRows);
      const skippedCount = res.skippedCount ?? 0;
      setImportResult({
        createdCount: res.createdCount,
        skippedCount,
        totalRows: res.totalRows,
        errors: res.errors,
      });

      toast.dismiss(loadingToastId);

      if (res.createdCount > 0) {
        const skippedNote = skippedCount > 0 ? ` (${skippedCount} duplicate${skippedCount > 1 ? "s" : ""} skipped)` : "";
        toast.success(`Imported ${res.createdCount} record${res.createdCount > 1 ? "s" : ""}!${skippedNote}`, { duration: 5000 });
        onSuccess();
        window.dispatchEvent(new CustomEvent("bulk-import-complete"));
      } else if (skippedCount > 0 && (!res.errors || res.errors.length === 0)) {
        toast.success(`All ${skippedCount} rows already exist — nothing new to import.`, { duration: 5000 });
      } else if (skippedCount > 0) {
        toast(`${skippedCount} duplicate row${skippedCount > 1 ? "s" : ""} skipped. Review issues below.`, { icon: "⚠️", duration: 5000 });
      } else {
        toast.error("No records could be imported. Please review the issues below.", { duration: 5000 });
      }
    } catch (err) {
      toast.dismiss(loadingToastId);
      toast.error(err instanceof Error ? err.message : "Import failed", { duration: 5000 });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyErrors = async () => {
    if (!importResult?.errors?.length) return;
    const text = importResult.errors.join("\n");
    await navigator.clipboard.writeText(text);
    setErrorsCopied(true);
    setTimeout(() => setErrorsCopied(false), 2000);
  };

  const handleClose = () => {
    if (isUploading) return; // block close while processing
    setSelectedFile(null);
    setParsedRows([]);
    setImportResult(null);
    setErrorsCopied(false);
    onOpenChange(false);
  };

  // Widen dialog when showing results (especially with many errors)
  const hasResult = !!importResult;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`${hasResult ? "max-w-2xl" : "max-w-lg"} rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl transition-all duration-200`}
      >
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template Download Banner — hide while processing or showing results */}
          {!isUploading && !importResult && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Need the formatted format?</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Download our pre-styled sample spreadsheet.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-8 rounded-xl text-xs font-semibold border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Template
              </Button>
            </div>
          )}

          {/* In-dialog processing overlay */}
          {isUploading && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 rounded-3xl bg-sky-50/60 dark:bg-sky-950/20 border-2 border-dashed border-sky-200 dark:border-sky-800">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-sky-600 dark:text-sky-400 animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Processing {parsedRows.length} rows…
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Checking for duplicates and importing new records.
                </p>
                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-1">
                  You can safely close this dialog — a notification will appear when done.
                </p>
              </div>
            </div>
          )}

          {/* Upload Dropzone — only when no file selected and not uploading */}
          {!selectedFile && !isUploading && !importResult && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Click or drag Excel file here
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Supports .xlsx, .xls, and .csv</p>
              </div>
            </div>
          )}

          {/* File selected — preview bar */}
          {selectedFile && !isUploading && !importResult && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; {parsedRows.length} rows detected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setParsedRows([]);
                    setImportResult(null);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isParsing && (
                <div className="flex items-center gap-2 text-xs text-sky-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Parsing spreadsheet columns...
                </div>
              )}
            </div>
          )}

          {/* ── Import Result Panel ── */}
          {importResult && (
            <div className="space-y-3 text-xs">
              {/* Summary stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Total Rows</p>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">{importResult.totalRows}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mb-0.5">Imported</p>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{importResult.createdCount}</p>
                </div>
                <div className={`p-3 rounded-2xl text-center ${importResult.errors && importResult.errors.length > 0 ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40" : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"}`}>
                  <p className={`text-[11px] mb-0.5 ${importResult.errors && importResult.errors.length > 0 ? "text-rose-500 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>Issues</p>
                  <p className={`text-lg font-black ${importResult.errors && importResult.errors.length > 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}`}>{importResult.errors?.length ?? 0}</p>
                </div>
              </div>

              {/* Skipped banner */}
              {importResult.skippedCount > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>
                    {importResult.skippedCount} row{importResult.skippedCount > 1 ? "s" : ""} already exist{importResult.skippedCount === 1 ? "s" : ""} with identical data — skipped.
                  </span>
                </div>
              )}

              {/* Success banner */}
              {importResult.createdCount > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Successfully imported {importResult.createdCount} new record{importResult.createdCount > 1 ? "s" : ""} into the database.
                  </span>
                </div>
              )}

              {/* Nothing happened */}
              {importResult.createdCount === 0 && importResult.skippedCount === 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No records were imported. Please fix the issues below and retry.</span>
                </div>
              )}

              {/* Error list — full-height scrollable with copy button */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-rose-200/60 dark:border-rose-800/40">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{importResult.errors.length} issue{importResult.errors.length > 1 ? "s" : ""} encountered</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyErrors}
                      className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 transition-colors"
                    >
                      {errorsCopied ? (
                        <><Check className="w-3 h-3" /> Copied!</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy all</>
                      )}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-3 space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-rose-700 dark:text-rose-300 py-0.5">
                        <span className="shrink-0 font-bold text-rose-400 dark:text-rose-500 w-5 text-right">{idx + 1}.</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {isUploading && "Processing — please wait…"}
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                {importResult ? "Close" : "Cancel"}
              </Button>
              {selectedFile && !importResult && (
                <Button
                  type="button"
                  onClick={handleStartImport}
                  disabled={isUploading || isParsing || parsedRows.length === 0}
                  className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-md shadow-sky-600/10 min-w-[130px]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                      Start Import ({parsedRows.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
