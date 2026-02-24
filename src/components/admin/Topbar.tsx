"use client";

import { Bell, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopbarProps {
  userName?: string;
}

export default function Topbar({ userName = "Admin" }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h2 className="text-sm font-medium text-gray-500">
        Medication Adherence Tracker
      </h2>
      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{userName}</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
