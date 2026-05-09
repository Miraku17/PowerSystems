"use client";

import { useEffect, useState } from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/axios';
import { PermissionMatrixPage } from '@/components/permission-management/PermissionMatrixPage';

export default function PermissionManagementPage() {
  const [position, setPosition] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    apiClient
      .get('/auth/position')
      .then((res) => setPosition(res.data?.positionName ?? null))
      .catch(() => setPosition(null));
  }, []);

  if (position === undefined) {
    return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  }
  if (position !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">Only Super Admin can manage permissions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
          <ShieldCheckIcon className="h-7 w-7 text-[#2B4C7E]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A2F4F] tracking-tight">Permission Management</h1>
          <p className="text-sm text-[#607D8B] mt-0.5">
            Grant, revoke, and adjust scope per position
          </p>
        </div>
      </div>
      <PermissionMatrixPage />
    </div>
  );
}
