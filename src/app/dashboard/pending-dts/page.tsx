"use client";

import { useAuth } from "@/hooks/useAuth";
import PendingDailyTimeSheets from "@/components/PendingDailyTimeSheets";

export default function PendingDTSPage() {
  useAuth();
  return <PendingDailyTimeSheets />;
}
