"use client";

import MySignatures from "@/components/MySignatures";
import { usePermissions } from "@/hooks/usePermissions";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

export default function MySignaturesPage() {
  const { canAccess, isLoading: permissionsLoading } = usePermissions();

  if (!permissionsLoading && !canAccess("signatures")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view signatures.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Signatures</h1>
      <MySignatures />
    </div>
  );
}
