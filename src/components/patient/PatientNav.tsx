"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pill, LogOut, User, KeyRound } from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";

interface PatientNavProps {
  userName: string;
}

export default function PatientNav({ userName }: PatientNavProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="border-b border-gray-200 bg-white px-4">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Pill className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">MedAdhere</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{userName}</span>
          </div>
          <NotificationBell />
          <Link
            href="/account/change-password"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Change password"
          >
            <KeyRound className="h-4 w-4" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
