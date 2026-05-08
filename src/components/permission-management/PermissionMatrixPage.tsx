"use client";

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MatrixData, Position } from '@/lib/permission-management/types';
import { usePermissionMatrix } from './usePermissionMatrix';
import { MatrixToolbar } from './MatrixToolbar';
import { ModuleSection } from './ModuleSection';
import { SaveDialog } from './SaveDialog';

export function PermissionMatrixPage() {
  const {
    matrix,
    isLoading,
    isError,
    effective,
    setCell,
    changes,
    dirtyCount,
    discard,
    save,
    isSaving,
    saveError,
  } = usePermissionMatrix();
  const [search, setSearch] = useState('');
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    if (dirtyCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirtyCount]);

  const superAdminPosition: Position | undefined = useMemo(
    () => matrix?.positions.find((p) => p.name === 'Super Admin'),
    [matrix],
  );

  const groupedByModule = useMemo(() => {
    if (!matrix) return [] as Array<{ module: string; permissions: MatrixData['permissions'] }>;
    const groups = new Map<string, MatrixData['permissions']>();
    for (const p of matrix.permissions) {
      if (search && !p.module.toLowerCase().includes(search.toLowerCase())) continue;
      const list = groups.get(p.module) ?? [];
      list.push(p);
      groups.set(p.module, list);
    }
    return Array.from(groups.entries()).map(([module, permissions]) => ({ module, permissions }));
  }, [matrix, search]);

  if (isLoading) return <div className="p-6 text-sm text-gray-600">Loading permissions…</div>;
  if (isError || !matrix) return <div className="p-6 text-sm text-red-700">Failed to load permissions.</div>;

  const orderedPositions = [
    ...(superAdminPosition ? [superAdminPosition] : []),
    ...matrix.positions.filter((p) => p.name !== 'Super Admin'),
  ];

  const onConfirmSave = async (reason: string) => {
    try {
      await save(reason);
      toast.success('Permissions saved');
      setShowSave(false);
    } catch {
      // saveError is shown inside the dialog; keep open so user can retry
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <MatrixToolbar
        search={search}
        onSearch={setSearch}
        dirtyCount={dirtyCount}
        onDiscard={discard}
        onOpenSave={() => setShowSave(true)}
        isSaving={isSaving}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left">Module / Permission</th>
              {orderedPositions.map((pos) => (
                <th key={pos.id} className="px-3 py-2 text-center">
                  {pos.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedByModule.map(({ module, permissions }) => (
              <ModuleSection
                key={module}
                module={module}
                permissions={permissions}
                positions={orderedPositions}
                superAdminPositionId={superAdminPosition?.id ?? null}
                effective={effective}
                setCell={setCell}
              />
            ))}
          </tbody>
        </table>
      </div>

      <SaveDialog
        open={showSave}
        changes={changes}
        positions={matrix.positions}
        permissions={matrix.permissions}
        onCancel={() => setShowSave(false)}
        onConfirm={onConfirmSave}
        isSaving={isSaving}
        errorMessage={saveError ? (saveError as Error).message : null}
      />
    </div>
  );
}
