"use client";

import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { ShieldExclamationIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import apiClient from "@/lib/axios";
import Image from "next/image";

interface UserSignature {
  id: string;
  fullName: string;
  position: string;
  signature_url: string | null;
  signature_created_at: string | null;
}

export default function AllSignaturesPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const [users, setUsers] = useState<UserSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const canView = hasPermission("signatures", "view_all");

  useEffect(() => {
    if (permissionsLoading || !canView) return;

    const fetchAll = async () => {
      try {
        const res = await apiClient.get("/signatures/all");
        if (res.data.success) {
          setUsers(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching all signatures:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [permissionsLoading, canView]);

  if (!permissionsLoading && !canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view all signatures.</p>
      </div>
    );
  }

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">All User Signatures</h1>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading || permissionsLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {search ? "No users match your search." : "No users found."}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.signature_url ? (
                        <div className="relative h-12 w-32 bg-gray-50 rounded border border-gray-200">
                          <Image
                            src={u.signature_url}
                            alt={`${u.fullName}'s signature`}
                            fill
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No signature</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.signature_created_at
                        ? new Date(u.signature_created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
