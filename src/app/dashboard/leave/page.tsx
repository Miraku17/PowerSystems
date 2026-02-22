"use client";

import { useState } from "react";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import LeaveRequests from "@/components/LeaveRequests";

export default function LeavePage() {
  const [refreshKey, setRefreshKey] = useState(0);

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
