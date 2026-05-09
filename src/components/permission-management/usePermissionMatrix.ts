"use client";

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import {
  Assignment,
  Change,
  DraftMap,
  MatrixData,
  Scope,
  draftKey,
} from '@/lib/permission-management/types';
import { diffPermissions } from '@/lib/permission-management/diff';

const QUERY_KEY = ['permission-management', 'matrix'] as const;

async function fetchMatrix(): Promise<MatrixData> {
  const res = await apiClient.get('/permission-management/matrix');
  return res.data.data as MatrixData;
}

export function usePermissionMatrix() {
  const queryClient = useQueryClient();
  const matrixQuery = useQuery({ queryKey: QUERY_KEY, queryFn: fetchMatrix });

  const [draft, setDraft] = useState<DraftMap>({});

  const matrix = matrixQuery.data;

  const effective = useCallback(
    (positionId: string, permissionId: string) => {
      const key = draftKey(positionId, permissionId);
      if (key in draft) return draft[key];
      const server = matrix?.assignments.find(
        (a) => a.position_id === positionId && a.permission_id === permissionId,
      );
      return { granted: !!server, scope: (server?.scope ?? null) as Scope | null };
    },
    [draft, matrix],
  );

  const setCell = useCallback(
    (positionId: string, permissionId: string, next: { granted: boolean; scope: Scope | null }) => {
      setDraft((d) => ({ ...d, [draftKey(positionId, permissionId)]: next }));
    },
    [],
  );

  const changes: Change[] = useMemo(() => {
    if (!matrix) return [];
    return diffPermissions({
      server: matrix.assignments,
      draft,
      permissions: matrix.permissions,
    });
  }, [matrix, draft]);

  const dirtyCount = changes.length;

  const discard = useCallback(() => setDraft({}), []);

  const saveMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiClient.post('/permission-management/save', {
        reason,
        changes,
      });
      return res.data.data as MatrixData;
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(QUERY_KEY, fresh);
      setDraft({});
    },
  });

  return {
    matrix,
    isLoading: matrixQuery.isLoading,
    isError: !!matrixQuery.error,
    effective,
    setCell,
    changes,
    dirtyCount,
    discard,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error as Error | null,
  };
}
