"use client";

import { useAuth } from "@/hooks/useAuth";
import PendingServiceReports from "@/components/PendingServiceReports";

export default function PendingServiceReportsPage() {
  useAuth();

  return <PendingServiceReports />;
}
