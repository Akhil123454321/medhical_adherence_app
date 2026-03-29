import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import ClientLayout from "@/components/admin/ClientLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  let userName = "Admin";
  let superAdmin = false;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      userName = `${payload.firstName} ${payload.lastName}`;
      superAdmin = payload.superAdmin ?? false;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientLayout userName={userName} superAdmin={superAdmin}>{children}</ClientLayout>
    </div>
  );
}
