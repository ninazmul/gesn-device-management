"use client";

import { useEffect } from "react";
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
  Users,
  Receipt,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarSections = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
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
      },
      {
        title: "Billing",
        url: "/billing",
        icon: Receipt,
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
      },
      {
        title: "Servers",
        url: "/devices/server",
        icon: Server,
      },
      {
        title: "Switches",
        url: "/devices/switch",
        icon: Network,
      },
      {
        title: "Antennas",
        url: "/devices/antenna",
        icon: Radio,
      },
      {
        title: "Access Points",
        url: "/devices/access-point",
        icon: Wifi,
      },
      {
        title: "Routers",
        url: "/devices/router",
        icon: RouterIcon,
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
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ],
  },
];

const AppSidebar = () => {
  const currentPath = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Automatically close mobile sidebar menu on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  return (
    <Sidebar
      className="font-sans border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0a0e1a]"
      collapsible="icon"
    >
      {/* Brand Header */}
      <SidebarHeader className="p-0">
        <div className="px-4 py-4 mb-1 flex items-center border-b border-slate-100 dark:border-slate-800 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3 w-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-md shadow-sky-900/15 shrink-0">
              <Network className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col transition-all duration-200">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                GESN
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
                Device Mgmt
              </span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {sidebarSections.map((section) => (
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
