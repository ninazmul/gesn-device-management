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
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
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
  const [importResult, setImportResult] = useState<{
    createdCount: number;
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
    try {
      const res = await onImport(parsedRows);
      setImportResult({
        createdCount: res.createdCount,
        totalRows: res.totalRows,
        errors: res.errors,
      });

      if (res.createdCount > 0) {
        toast.success(`Successfully imported ${res.createdCount} records!`);
        onSuccess();
      } else {
        toast.error("No records could be imported. Please review the errors below.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
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
          {/* Template Download Banner */}
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

          {/* Upload Dropzone */}
          {!selectedFile ? (
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
          ) : (
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
                {!isUploading && (
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
                )}
              </div>

              {isParsing && (
                <div className="flex items-center gap-2 text-xs text-sky-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Parsing spreadsheet columns...
                </div>
              )}
            </div>
          )}

          {/* Import Result & Errors */}
          {importResult && (
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Successfully imported {importResult.createdCount} out of {importResult.totalRows} records!
                </span>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{importResult.errors.length} issue(s) encountered:</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-rose-600 dark:text-rose-400 pl-5 list-disc">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx}>&bull; {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
            >
              {importResult ? "Close" : "Cancel"}
            </Button>
            {selectedFile && !importResult && (
              <Button
                type="button"
                onClick={handleStartImport}
                disabled={isUploading || isParsing || parsedRows.length === 0}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-md shadow-sky-600/10"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Importing {parsedRows.length} rows...
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
      </DialogContent>
    </Dialog>
  );
}
