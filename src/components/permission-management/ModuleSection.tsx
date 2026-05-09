"use client";

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Permission, Position, Scope } from '@/lib/permission-management/types';
import { PermissionRow } from './PermissionRow';

interface Props {
  module: string;
  permissions: Permission[];
  positions: Position[];
  superAdminPositionId: string | null;
  effective: (positionId: string, permissionId: string) => { granted: boolean; scope: Scope | null };
  setCell: (positionId: string, permissionId: string, next: { granted: boolean; scope: Scope | null }) => void;
}

export function ModuleSection({ module, permissions, positions, superAdminPositionId, effective, setCell }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <tr className="bg-gray-100">
        <td colSpan={positions.length + 1} className="sticky left-0 z-10 px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700"
          >
            {open ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            {module}
            <span className="text-xs font-normal text-gray-500">({permissions.length})</span>
          </button>
        </td>
      </tr>
      {open &&
        permissions.map((p) => (
          <PermissionRow
            key={p.id}
            permission={p}
            positions={positions}
            superAdminPositionId={superAdminPositionId}
            effective={effective}
            setCell={setCell}
          />
        ))}
    </>
  );
}
