import { getAllAdmins } from "@/lib/actions/admin.actions";
import AdminsClient from "./components/AdminsClient";
import { redirect } from "next/navigation";
import { getCurrentAdminProfile } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/sign-in");
  if (admin.role !== "super_admin") redirect("/access-denied");

  const data = await getAllAdmins();
  return <AdminsClient initialAdmins={data.admins} />;
}
