"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  BookOpen,
  ShieldCheck,
  ChevronRight,
  Sliders,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function SettingsClient() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              System Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Infrastructure configurations and administration shortcuts
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Catalog Card */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader>
            <div className="p-3 w-fit rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 mb-2">
              <BookOpen className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Device Catalog Management
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Configure device types (Antenna, Router, Switch, Server, AP), manufacturer brands, and hardware model specifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/catalog">
              <Button className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs justify-between">
                <span>Manage Device Catalog</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Administration Access Card */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader>
            <div className="p-3 w-fit rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Administrator Accounts
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Manage authorized administrator email addresses with full access to device lifecycle and catalog operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/admins">
              <Button variant="outline" className="w-full rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold justify-between">
                <span>Manage Admin Accounts</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* System Information Card */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm md:col-span-2">
          <CardHeader>
            <div className="p-3 w-fit rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-2">
              <Sliders className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Platform & Database Architecture
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Core platform specifications, system modules, and development details
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Application</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                  GESN Device Management
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> v0.1.0 Enterprise
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Data Architecture</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                  MongoDB Indexed Cluster
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sequential SL & Compound Indexes
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Authentication</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                  Clerk RBAC Protected
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Admin Verification Guard
                </span>
              </div>

              <a
                href="https://www.artistycode.studio/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-all group space-y-1 block"
              >
                <span className="text-slate-400 block font-medium flex items-center justify-between">
                  <span>Developed By</span>
                  <ExternalLink className="w-3 h-3 text-sky-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                </span>
                <span className="font-bold text-sky-600 dark:text-sky-400 text-sm block group-hover:underline">
                  ArtistyCode Studio
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                  artistycode.studio
                </span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
