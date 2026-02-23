import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import apiClient from "@/lib/axios";

export interface FormUser {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  position?: {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
  };
  signature_url?: string | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiClient.get("/users");
      return res.data.data as FormUser[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns a function that resolves a signature for display.
 * Falls back to the user's saved signature_url if the DB record has none.
 */
export function useResolveSignature() {
  const { data: users = [] } = useUsers();
  return useCallback(
    (dbSignature: string | null | undefined, signatoryName: string | null | undefined) => {
      if (dbSignature) return dbSignature;
      if (!signatoryName) return "";
      const user = users.find((u) => u.fullName === signatoryName);
      return user?.signature_url || "";
    },
    [users]
  );
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await apiClient.get("/customers");
      return res.data.data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useEngines() {
  return useQuery({
    queryKey: ["engines"],
    queryFn: async () => {
      const res = await apiClient.get("/engines");
      return res.data.data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
