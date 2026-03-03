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
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      userName = `${payload.firstName} ${payload.lastName}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientLayout userName={userName}>{children}</ClientLayout>
    </div>
  );
}
