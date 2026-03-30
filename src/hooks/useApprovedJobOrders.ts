import { useState, useEffect, useRef } from "react";
import apiClient from "@/lib/axios";
import { ApprovedJobOrder } from "@/components/JobOrderAutocomplete";

export function useApprovedJobOrders(search: string = "", debounceMs: number = 300) {
  const [approvedJOs, setApprovedJOs] = useState<ApprovedJobOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Cancel previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const response = await apiClient.get("/forms/job-order-request/approved", {
          params: { search, limit: 20 },
          signal: controller.signal,
        });
        if (response.data.success) {
          setApprovedJOs(response.data.data);
        }
      } catch (error: any) {
        if (error?.name !== "CanceledError") {
          console.error("Failed to fetch approved job orders", error);
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  return { approvedJOs, loading };
}
