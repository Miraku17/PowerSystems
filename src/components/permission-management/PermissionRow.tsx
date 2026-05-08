"use client";

import { Permission, Position, Scope } from '@/lib/permission-management/types';
import { PermissionCell } from './PermissionCell';
import { PermissionTooltip } from './PermissionTooltip';

interface Props {
  permission: Permission;
  positions: Position[];
  superAdminPositionId: string | null;
  effective: (positionId: string, permissionId: string) => { granted: boolean; scope: Scope | null };
  setCell: (positionId: string, permissionId: string, next: { granted: boolean; scope: Scope | null }) => void;
}

export function PermissionRow({ permission, positions, superAdminPositionId, effective, setCell }: Props) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="sticky left-0 z-10 bg-white px-3 py-2 text-xs text-gray-700">
        <PermissionTooltip description={permission.description}>
          <span className="font-mono">
            {permission.module}.<span className="text-[#2B4C7E]">{permission.action}</span>
          </span>
        </PermissionTooltip>
      </td>
      {positions.map((pos) => (
        <td key={pos.id} className="px-3 py-2 text-center">
          <PermissionCell
            permission={permission}
            value={effective(pos.id, permission.id)}
            disabled={pos.id === superAdminPositionId}
            onChange={(next) => setCell(pos.id, permission.id, next)}
          />
        </td>
      ))}
    </tr>
  );
}
