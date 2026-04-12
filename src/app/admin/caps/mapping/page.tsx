"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { Cap, User } from "@/lib/types";

export default function CapMappingPage() {
const [caps, setCaps] = useState<Cap[]>([]);
const [users, setUsers] = useState<User[]>([]);
const [hardwareIds, setHardwareIds] = useState<Record<number, string>>({});
const [saving, setSaving] = useState<number | null>(null);
const [saved, setSaved] = useState<number | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    Promise.all([
    fetch("/api/caps").then(r => r.json()),
    fetch("/api/users").then(r => r.json()),
    ]).then(([capsData, usersData]: [Cap[], User[]]) => {
    setCaps(capsData);
    setUsers(usersData);
    const ids: Record<number, string> = {};
    capsData.forEach(c => { ids[c.id] = c.hardwareId || ""; });
    setHardwareIds(ids);
    setLoading(false);
    });
}, []);

function getUserName(userId: string | null): string {
    if (!userId) return "—";
    const u = users.find(u => u.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : userId;
}

async function saveCap(capId: number) {
    setSaving(capId);
    await fetch(`/api/caps/${capId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hardwareId: hardwareIds[capId] || null }),
    });
    setSaving(null);
    setSaved(capId);
    setTimeout(() => setSaved(null), 2000);
}

const assignedCaps = caps.filter(c => c.status === "assigned");

return (
    <div className="space-y-6">
    <div>
        <h1 className="text-2xl font-bold text-gray-900">MAC Address Mapping</h1>
        <p className="mt-1 text-sm text-gray-500">
        Assign hardware MAC addresses to vial numbers so cap log data is linked correctly in exports.
        </p>
    </div>

    <Card>
        {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
        ) : (
        <table className="w-full text-left text-sm">
            <thead>
            <tr className="border-b border-gray-200">
                <th className="px-3 py-3 font-medium text-gray-500">Vial #</th>
                <th className="px-3 py-3 font-medium text-gray-500">Assigned To</th>
                <th className="px-3 py-3 font-medium text-gray-500">MAC Address</th>
                <th className="px-3 py-3 font-medium text-gray-500"></th>
            </tr>
            </thead>
            <tbody>
            {assignedCaps.map(cap => (
                <tr key={cap.id} className="border-b border-gray-100">
                <td className="px-3 py-2.5 font-medium text-gray-900">#{cap.id}</td>
                <td className="px-3 py-2.5 text-gray-500">{getUserName(cap.assignedTo)}</td>
                <td className="px-3 py-2.5">
                    <Input
                    placeholder="e.g. F83164B2F180"
                    value={hardwareIds[cap.id] ?? ""}
                    onChange={e =>
                        setHardwareIds(prev => ({
                        ...prev,
                        [cap.id]: e.target.value.toUpperCase(),
                        }))
                    }
                    className="w-52 font-mono"
                    />
                </td>
                <td className="px-3 py-2.5">
                    <button
                    onClick={() => saveCap(cap.id)}
                    disabled={saving === cap.id}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                    {saving === cap.id ? "Saving…" : saved === cap.id ? "Saved ✓" : "Save"}
                    </button>
                </td>
                </tr>
            ))}
            {assignedCaps.length === 0 && (
                <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-400">
                    No assigned caps found.
                </td>
                </tr>
            )}
            </tbody>
        </table>
        )}
    </Card>
    </div>
);
}