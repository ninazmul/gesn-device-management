import SettingsClient from "./components/SettingsClient";
import { redirect } from "next/navigation";
import { getCurrentAdminProfile } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/sign-in");
  if (admin.role !== "super_admin") redirect("/access-denied");

  return <SettingsClient />;
}
