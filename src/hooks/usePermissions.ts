"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

interface Permission {
  module: string;
  action: string;
  scope: string;
}

interface PermissionsResponse {
  permissions: Permission[];
  isSuperAdmin: boolean;
}

async function fetchPermissions(): Promise<PermissionsResponse> {
  const response = await apiClient.get("/permissions/me");
  return {
    permissions: response.data.data || [],
    isSuperAdmin: !!response.data.isSuperAdmin,
  };
}

export function usePermissions() {
  const {
    data,
    isLoading: queryLoading,
    isFetching,
    error,
  } = useQuery<PermissionsResponse>({
    queryKey: ["permissions", "me"],
    queryFn: fetchPermissions,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  const permissions = data?.permissions ?? [];
  const isSuperAdmin = data?.isSuperAdmin ?? false;

  // Treat as loading if the query is loading OR if fetching with no cached data yet
  const isLoading = queryLoading || (isFetching && !data);

  const hasPermission = (module: string, action: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.some(
      (p) => p.module === module && p.action === action
    );
  };

  const getScope = (module: string, action: string): string | null => {
    if (isSuperAdmin) return "all";
    const perm = permissions.find(
      (p) => p.module === module && p.action === action
    );
    return perm?.scope ?? null;
  };

  const canRead = (module: string) => hasPermission(module, "read");
  const canWrite = (module: string) => hasPermission(module, "write");
  const canEdit = (module: string) => hasPermission(module, "edit");
  const canDelete = (module: string) => hasPermission(module, "delete");
  const canAccess = (module: string) => hasPermission(module, "access");
  const canRestore = (module: string) => hasPermission(module, "restore");

  return {
    permissions,
    isSuperAdmin,
    isLoading,
    error,
    hasPermission,
    getScope,
    canRead,
    canWrite,
    canEdit,
    canDelete,
    canAccess,
    canRestore,
  };
}
