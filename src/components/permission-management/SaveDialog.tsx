"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Change, Permission, Position } from '@/lib/permission-management/types';

interface Props {
  open: boolean;
  changes: Change[];
  positions: Position[];
  permissions: Permission[];
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isSaving: boolean;
  errorMessage: string | null;
}

export function SaveDialog({ open, changes, positions, permissions, onCancel, onConfirm, isSaving, errorMessage }: Props) {
  const [reason, setReason] = useState('');
  if (!open) return null;
  const posById = new Map(positions.map((p) => [p.id, p]));
  const permById = new Map(permissions.map((p) => [p.id, p]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-[#1A2F4F]">Save permission changes</h2>
        <p className="mt-1 text-sm text-gray-600">
          {changes.length} change{changes.length === 1 ? '' : 's'} will be applied atomically.
        </p>

        <div className="mt-3 max-h-48 overflow-y-auto rounded border border-gray-200 text-xs">
          <ul className="divide-y divide-gray-100">
            {changes.map((c) => {
              const pos = posById.get(c.position_id);
              const perm = permById.get(c.permission_id);
              return (
                <li key={`${c.position_id}:${c.permission_id}`} className="px-3 py-1.5 font-mono">
                  <span className="text-gray-700">{pos?.name ?? c.position_id}</span>
                  {' · '}
                  <span className="text-[#2B4C7E]">
                    {perm ? `${perm.module}.${perm.action}` : c.permission_id}
                  </span>
                  {' → '}
                  <span className="text-gray-900">
                    {c.op}
                    {c.scope ? ` (${c.scope})` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-gray-700">Reason (optional)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#2B4C7E] focus:outline-none"
          />
        </label>

        {errorMessage && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(reason)} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}
