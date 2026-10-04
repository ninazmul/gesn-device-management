"use client";

import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  LayoutDashboard,
  Server,
  Radio,
  Wifi,
  Router as RouterIcon,
  Network,
  BookOpen,
  Settings,
  ShieldCheck,
  Boxes,
  Archive,
  Users,
  Receipt,
  History,
  ClockAlert,
} from "lucide-react";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/components/providers/PermissionContext";
import { AppModule } from "@/types";
import { getPendingDevicesCount } from "@/lib/actions/device.actions";

interface SidebarItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  module: AppModule;
  /** If true, only super_admin can see this item (strongest gate) */
  superAdminOnly?: boolean;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
        module: "dashboard",
      },
    ],
  },
  {
    label: "Customers & Billing",
    items: [
      {
        title: "Customers",
        url: "/customers",
        icon: Users,
        module: "customers",
      },
      {
        title: "Billing",
        url: "/billing",
        icon: Receipt,
        module: "billing",
      },
    ],
  },
  {
    label: "Devices",
    items: [
      {
        title: "All Devices",
        url: "/devices",
        icon: Boxes,
        module: "devices",
      },
      {
        title: "Pending Devices",
        url: "/devices/pending",
        icon: ClockAlert,
        module: "devices",
      },
      {
        title: "Frozen & Lost Devices",
        url: "/devices/inactive",
        icon: Archive,
        module: "devices",
      },
      {
        title: "Servers",
        url: "/devices/server",
        icon: Server,
        module: "devices",
      },
      {
        title: "Switches",
        url: "/devices/switch",
        icon: Network,
        module: "devices",
      },
      {
        title: "Antennas",
        url: "/devices/antenna",
        icon: Radio,
        module: "devices",
      },
      {
        title: "Access Points",
        url: "/devices/access-point",
        icon: Wifi,
        module: "devices",
      },
      {
        title: "Routers",
        url: "/devices/router",
        icon: RouterIcon,
        module: "devices",
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        title: "Device Catalog",
        url: "/catalog",
        icon: BookOpen,
        module: "catalog",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Manage Admins",
        url: "/admins",
        icon: ShieldCheck,
        module: "admins",
        superAdminOnly: true,
      },
      {
        title: "Activity Logs",
        url: "/activity-logs",
        icon: History,
        module: "activity_logs",
        superAdminOnly: true,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        module: "settings",
        superAdminOnly: true,
      },
    ],
  },
];

const AppSidebar = () => {
  const currentPath = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { canRead, isSuperAdmin, isEngineer } = usePermissions();
  const isCollapsed = state === "collapsed";
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Fetch pending devices count for the sidebar badge
  useEffect(() => {
    let isMounted = true;
    const updateCount = () => {
      getPendingDevicesCount()
        .then((c) => {
          if (isMounted) setPendingCount(c);
        })
        .catch(() => {});
    };

    updateCount();
    const handleVisChange = () => {
      if (document.visibilityState === "visible") updateCount();
    };
    document.addEventListener("visibilitychange", handleVisChange);
    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisChange);
    };
  }, [currentPath]);

  // Automatically close mobile sidebar menu on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  // Filter sections and items based on module + granular permissions + super-admin-only gates
  const visibleSections = sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Strongest gate first: strictly super-admin-only items
        if (item.superAdminOnly && !isSuperAdmin) return false;
        if (item.url === "/devices/server" && !isSuperAdmin && !isEngineer) {
          return false;
        }
        if (item.module !== "dashboard" && !canRead(item.module)) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Sidebar
      className="font-sans border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0a0e1a]"
      collapsible="icon"
    >
      {/* Brand Header */}
      <SidebarHeader className="p-0">
        <div className="px-4 py-3.5 mb-1 flex items-center border-b border-slate-100 dark:border-slate-800 group-data-[collapsible=icon]:hidden">
          <Link href="/" className="flex items-center">
            <Image
              src="/assets/images/logo.png"
              alt="GESN Device Management"
              width={160}
              height={64}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center py-3 mb-1 border-b border-slate-100 dark:border-slate-800">
          <Link href="/" className="flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 shadow-sm text-white">
              <Network className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {visibleSections.map((section) => (
          <SidebarGroup
            key={section.label}
            className="py-1 group-data-[collapsible=icon]:py-0.5"
          >
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-600 px-4 mb-1 group-data-[collapsible=icon]:hidden">
              {section.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2.5 group-data-[collapsible=icon]:px-1">
                {section.items.map((item) => {
                  const isActive =
                    item.url === "/"
                      ? currentPath === item.url
                      : currentPath === item.url ||
                        currentPath.startsWith(`${item.url}/`);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        size="default"
                        className={`relative rounded-xl font-medium text-[13px] transition-all duration-150 py-2 ${
                          isActive
                            ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200/60 dark:border-sky-800/50 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <Link
                          href={item.url}
                          onClick={() => {
                            if (isMobile) {
                              setOpenMobile(false);
                            }
                          }}
                        >
                          <span className="flex items-center gap-2.5 w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                            <item.icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive
                                  ? "text-sky-600 dark:text-sky-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            />
                            <span
                              className={`group-data-[collapsible=icon]:hidden truncate`}
                            >
                              {item.title}
                            </span>
                            {item.url === "/devices/pending" &&
                              pendingCount > 0 && (
                                <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 group-data-[collapsible=icon]:hidden">
                                  {pendingCount}
                                </span>
                              )}
                          </span>

                          {isActive && !isCollapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sky-500 dark:bg-sky-400 rounded-r-full" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
