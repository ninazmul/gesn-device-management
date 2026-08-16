"use client";

import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { GlobalSearchModal } from "@/components/shared/GlobalSearchModal";
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
        {/* Left: Sidebar toggle + Title */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              GESN Device Management
            </span>
          </div>
        </div>

        {/* Center/Right: Quick Search + Theme Toggle + User Button */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Button */}
          <Button
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-normal gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Quick Search...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-semibold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </Button>

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
