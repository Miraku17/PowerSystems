"use client";

import Users from "@/components/Users";
import { UserIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { usePermissions } from "@/hooks/usePermissions";

export default function UserCreationPage() {
  const { canRead, isLoading: permissionsLoading } = usePermissions();

  if (!permissionsLoading && !canRead("user_creation")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
            <UserIcon className="h-7 w-7 text-[#2B4C7E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A2F4F] tracking-tight">
              User Management
            </h1>
            <p className="text-sm text-[#607D8B] mt-0.5">
              Manage system users, roles, and access permissions
            </p>
          </div>
        </div>
      </div>

      <Users />
    </div>
  );
}
