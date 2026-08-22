import { SidebarProvider } from "@/components/ui/sidebar";
import AdminSidebar from "./components/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { cookies } from "next/headers";
import { Toaster } from "react-hot-toast";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentAdminProfile } from "@/lib/auth-guard";
import { PermissionProvider } from "@/components/providers/PermissionContext";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  const adminProfile = await getCurrentAdminProfile();
  if (!adminProfile) redirect("/access-denied");

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <PermissionProvider admin={adminProfile}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminSidebar />
        <Toaster position="top-right" />
        <main className="flex-1 min-h-dvh mx-auto overflow-y-auto bg-slate-50/60 dark:bg-[#060913] transition-colors">
          <Header />
          <div className="w-full">{children}</div>
        </main>
      </SidebarProvider>
    </PermissionProvider>
  );
}
