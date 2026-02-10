"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

interface Permission {
  module: string;
  action: string;
  scope: string;
}

async function fetchPermissions(): Promise<Permission[]> {
  const response = await apiClient.get("/permissions/me");
  return response.data.data || [];
}

export function usePermissions() {
  const {
    data: permissions = [],
    isLoading,
    error,
  } = useQuery<Permission[]>({
    queryKey: ["permissions", "me"],
    queryFn: fetchPermissions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const hasPermission = (module: string, action: string): boolean => {
    return permissions.some(
      (p) => p.module === module && p.action === action
    );
  };

  const getScope = (module: string, action: string): string | null => {
    const perm = permissions.find(
      (p) => p.module === module && p.action === action
    );
    return perm?.scope ?? null;
  };

  const canRead = (module: string) => hasPermission(module, "read");
  const canWrite = (module: string) => hasPermission(module, "write");
  const canDelete = (module: string) => hasPermission(module, "delete");
  const canAccess = (module: string) => hasPermission(module, "access");

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    getScope,
    canRead,
    canWrite,
    canDelete,
    canAccess,
  };
}
