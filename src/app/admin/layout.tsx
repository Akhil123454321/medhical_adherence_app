import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  let userName = "Admin";
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      userName = `${payload.firstName} ${payload.lastName}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <Topbar userName={userName} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
