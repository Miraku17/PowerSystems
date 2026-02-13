"use client";

import { useAuth } from "@/hooks/useAuth";
import PendingJORequests from "@/components/PendingJORequests";

export default function PendingJORequestsPage() {
  useAuth();

  return <PendingJORequests />;
}
