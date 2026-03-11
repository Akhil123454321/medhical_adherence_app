import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import ChwNav from "@/components/chw/ChwNav";

export default async function ChwLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload || payload.role !== "chw") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ChwNav userName={`${payload.firstName} ${payload.lastName}`} />
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
