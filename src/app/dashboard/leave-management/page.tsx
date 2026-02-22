"use client";

import { useState } from "react";
import LeaveCredits from "@/components/LeaveCredits";
import LeaveRequests from "@/components/LeaveRequests";
import { usePermissions } from "@/hooks/usePermissions";

export default function LeaveManagementPage() {
  const [creditsRefreshKey, setCreditsRefreshKey] = useState(0);
  const { canAccess } = usePermissions();

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
