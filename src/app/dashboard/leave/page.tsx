"use client";

import { useState } from "react";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import LeaveRequests from "@/components/LeaveRequests";
import { usePermissions } from "@/hooks/usePermissions";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

export default function LeavePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { canAccess, isLoading: permissionsLoading } = usePermissions();

  if (!permissionsLoading && !canAccess("leave")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to file leave requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">File Leave</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <LeaveRequestForm onSuccess={() => setRefreshKey((k) => k + 1)} />
        </div>
        <div className="lg:col-span-2">
          <LeaveRequests refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
