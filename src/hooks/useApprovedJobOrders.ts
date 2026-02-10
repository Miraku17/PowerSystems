import { useState, useEffect } from "react";
import apiClient from "@/lib/axios";
import { ApprovedJobOrder } from "@/components/JobOrderAutocomplete";

export function useApprovedJobOrders() {
  const [approvedJOs, setApprovedJOs] = useState<ApprovedJobOrder[]>([]);

  useEffect(() => {
    const fetchApprovedJOs = async () => {
      try {
        const response = await apiClient.get("/forms/job-order-request/approved");
        if (response.data.success) {
          setApprovedJOs(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch approved job orders", error);
      }
    };

    fetchApprovedJOs();
  }, []);

  return approvedJOs;
}
