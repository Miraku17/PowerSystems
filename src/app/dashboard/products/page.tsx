"use client";

import ProductFiles from "@/components/ProductFiles";
import { usePermissions } from "@/hooks/usePermissions";
import { CogIcon } from "@heroicons/react/24/outline";

export default function ProductsPage() {
  const { canRead, isLoading: permissionsLoading } = usePermissions();

  if (permissionsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!canRead("products")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CogIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view products.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductFiles />
    </div>
  );
}
