'use client';

import { useOffline } from '@/providers/OfflineProvider';
import { formTypeLabels, SubmissionStatus } from '@/lib/offline/db';

export function SyncStatusPanel() {
  const { pendingSubmissions, syncAll, syncOne, removePending, isOnline, isSyncing } = useOffline();

  const statusColors: Record<SubmissionStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    syncing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    conflict: 'bg-purple-100 text-purple-800',
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (pendingSubmissions.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>All forms are synced!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Pending Submissions</h3>
        <button
          onClick={() => syncAll()}
          disabled={!isOnline || isSyncing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {isSyncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {pendingSubmissions.map((submission) => (
          <div key={submission.localId} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">
                    {formTypeLabels[submission.formType]}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[submission.status]}`}
                  >
                    {submission.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Job Order: {(submission.formData.job_order as string) || 'N/A'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Created {formatDate(submission.createdAt)}
                  {submission.attachments.length > 0 && (
                    <span className="ml-2">
                      {submission.attachments.length} attachment(s)
                    </span>
                  )}
                </div>
                {submission.errorMessage && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {submission.errorMessage}
                  </div>
                )}
              </div>

              {submission.status !== 'syncing' && (
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => syncOne(submission.localId)}
                    disabled={!isOnline || isSyncing}
                    className="p-2 hover:bg-blue-100 disabled:hover:bg-transparent rounded text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                    title="Retry sync"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this pending form?')) {
                        removePending(submission.localId);
                      }
                    }}
                    className="p-2 hover:bg-red-100 rounded text-red-600"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
