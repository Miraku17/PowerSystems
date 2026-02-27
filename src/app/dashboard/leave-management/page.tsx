"use client";

import { useState } from "react";
import LeaveCredits from "@/components/LeaveCredits";
import LeaveRequests from "@/components/LeaveRequests";
import { usePermissions } from "@/hooks/usePermissions";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

export default function LeaveManagementPage() {
  const [creditsRefreshKey, setCreditsRefreshKey] = useState(0);
  const { canAccess, isLoading: permissionsLoading } = usePermissions();

  if (!permissionsLoading && !canAccess("leave_approval")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view leave management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>

      <LeaveRequests
        showAll
        onAction={() => setCreditsRefreshKey((k) => k + 1)}
      />

      {canAccess("leave_credits") && <LeaveCredits key={creditsRefreshKey} />}
    </div>
  );
}
