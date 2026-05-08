"use client";

import { Permission, Scope } from '@/lib/permission-management/types';

interface Props {
  permission: Permission;
  value: { granted: boolean; scope: Scope | null };
  disabled: boolean;
  onChange: (next: { granted: boolean; scope: Scope | null }) => void;
}

export function PermissionCell({ permission, value, disabled, onChange }: Props) {
  if (!permission.is_scoped) {
    return (
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-[#2B4C7E] disabled:cursor-not-allowed disabled:opacity-50"
        checked={value.granted}
        disabled={disabled}
        onChange={(e) => onChange({ granted: e.target.checked, scope: null })}
        aria-label={`${permission.module}.${permission.action}`}
      />
    );
  }

  const selectValue = value.granted && value.scope ? value.scope : '';
  return (
    <select
      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      value={selectValue}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) onChange({ granted: false, scope: null });
        else onChange({ granted: true, scope: v as Scope });
      }}
      aria-label={`${permission.module}.${permission.action}`}
    >
      <option value="">—</option>
      <option value="own">own</option>
      <option value="branch">branch</option>
      <option value="all">all</option>
    </select>
  );
}
