"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { GlobalSearchModal } from "@/components/shared/GlobalSearchModal";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { PendingDevicesLink } from "@/components/layout/PendingDevicesLink";
import { UserButton } from "@clerk/nextjs";
import { Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex justify-between items-center px-4 sm:px-6 py-3 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#0a0e1a]/80 backdrop-blur-md transition-colors">
        {/* Left: Sidebar toggle + Logo */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" />
          <Link href="/" className="flex items-center">
            <Image
              src="/assets/images/logo.png"
              alt="GESN Device Management"
              width={160}
              height={64}
              className="h-7 sm:h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center/Right: Search, device approvals, notifications, theme, and profile */}
        <div className="flex items-center gap-2">
          {/* Quick Search Button */}
          <Button
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium gap-2 transition-all"
          >
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 font-normal">
              Quick Search...
            </span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-semibold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </Button>

          {/* Pending device approvals */}
          <PendingDevicesLink />

          {/* Super Admin / Engineer Notifications Bell */}
          <NotificationDropdown />

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User Profile */}
          <div className="pl-1 border-l border-slate-200 dark:border-slate-800 flex items-center">
            <UserButton afterSwitchSessionUrl="/" />
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
