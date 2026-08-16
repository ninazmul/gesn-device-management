import { getAllAdmins } from "@/lib/actions/admin.actions";
import AdminsClient from "./components/AdminsClient";

export default async function AdminsPage() {
  const data = await getAllAdmins();
  return <AdminsClient initialAdmins={data.admins} />;
}
