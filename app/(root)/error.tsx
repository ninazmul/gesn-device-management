"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError boundary]", error);
  }, [error]);

  const router = useRouter();

  const isPermissionError =
    error.message?.includes("Forbidden") ||
    error.message?.includes("Unauthorized") ||
    error.message?.includes("permission");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-[#060913] px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50">
            <ShieldAlert className="h-10 w-10 text-rose-500 dark:text-rose-400" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isPermissionError ? "Access Denied" : "Something went wrong"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {isPermissionError
              ? "You don't have permission to view this page. Contact your administrator to get access."
              : "An unexpected error occurred. Please try again or go back to the home page."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-sm"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
          {!isPermissionError && (
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
