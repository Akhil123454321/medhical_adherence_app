import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import PatientNav from "@/components/patient/PatientNav";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload || payload.role !== "patient") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PatientNav userName={`${payload.firstName} ${payload.lastName}`} />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
