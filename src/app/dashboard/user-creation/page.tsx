"use client";

import Users from "@/components/Users";
import { UserIcon } from "@heroicons/react/24/outline";

export default function UserCreationPage() {
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
