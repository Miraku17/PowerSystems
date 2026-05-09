'use client';

import PendingFormsManager from '@/components/PendingFormsManager';
import InstallForOfflineButton from '@/components/InstallForOfflineButton';

export default function PendingFormsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Forms you fill out while offline are queued here and sync automatically when you're back online.
        </p>
        <InstallForOfflineButton />
      </div>
      <PendingFormsManager />
    </div>
  );
}
