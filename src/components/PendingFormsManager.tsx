'use client';

import { useEffect, useState } from 'react';
import {
  getPendingSubmissions,
  removePendingSubmission,
  PendingSubmission,
} from '@/lib/offlineDb';
import { offlineSyncService } from '@/services/offlineSync';
import { usePendingCount, useIsSyncing } from '@/stores/syncStore';
import { useIsOnline } from '@/stores/networkStore';
import {
  TrashIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Form type display names
const formTypeNames: Record<string, string> = {
  'deutz-commissioning': 'Deutz Commissioning',
  'deutz-service': 'Deutz Service',
  'engine-teardown': 'Engine Teardown',
  'electric-surface-pump-teardown': 'Electric Surface Pump Teardown',
  'electric-surface-pump-service': 'Electric Surface Pump Service',
  'electric-surface-pump-commissioning': 'Electric Surface Pump Commissioning',
  'engine-surface-pump-service': 'Engine Surface Pump Service',
  'engine-surface-pump-commissioning': 'Engine Surface Pump Commissioning',
  'submersible-pump-commissioning': 'Submersible Pump Commissioning',
  'submersible-pump-teardown': 'Submersible Pump Teardown',
  'engine-inspection-receiving': 'Engine Inspection Receiving',
  'components-teardown-measuring': 'Components Teardown Measuring',
};

export default function PendingFormsManager() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const pendingCount = usePendingCount();
  const isSyncing = useIsSyncing();
  const isOnline = useIsOnline();

  const loadSubmissions = async () => {
    try {
      const pending = await getPendingSubmissions();
      setSubmissions(pending);
    } catch (error) {
      console.error('Failed to load pending submissions:', error);
      toast.error('Failed to load pending forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [pendingCount]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pending form? This cannot be undone.')) {
      return;
    }

    try {
      await removePendingSubmission(id);
      toast.success('Pending form deleted');
      loadSubmissions();
    } catch (error) {
      console.error('Failed to delete submission:', error);
      toast.error('Failed to delete pending form');
    }
  };

  const handleRetry = async (id: string) => {
    if (!isOnline) {
      toast.error('Cannot retry while offline');
      return;
    }

    setRetryingId(id);
    try {
      const success = await offlineSyncService.retrySubmission(id);
      if (success) {
        toast.success('Form submitted successfully');
      } else {
        toast.error('Failed to submit form');
      }
      loadSubmissions();
    } catch (error) {
      console.error('Failed to retry submission:', error);
      toast.error('Failed to retry submission');
    } finally {
      setRetryingId(null);
    }
  };

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    const { synced, failed } = await offlineSyncService.syncAll();
    if (synced > 0) {
      toast.success(`Synced ${synced} form${synced !== 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`${failed} form${failed !== 1 ? 's' : ''} failed to sync`);
    }
    loadSubmissions();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: PendingSubmission['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'syncing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusText = (status: PendingSubmission['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'syncing':
        return 'Syncing...';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pending Forms</h2>
          <p className="text-sm text-gray-500 mt-1">
            {submissions.length === 0
              ? 'No pending forms'
              : `${submissions.length} form${submissions.length !== 1 ? 's' : ''} waiting to sync`}
          </p>
        </div>
        {submissions.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isOnline && !isSyncing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ArrowPathIcon className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </button>
        )}
      </div>

      {/* Status Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            You are currently offline. Forms will sync automatically when you&apos;re back online.
          </p>
        </div>
      )}

      {/* Empty State */}
      {submissions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No pending forms</h3>
          <p className="text-gray-500">All your forms have been synced successfully.</p>
        </div>
      )}

      {/* Pending Forms List */}
      <div className="space-y-4">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <DocumentTextIcon className="h-6 w-6 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {formTypeNames[submission.formType] || submission.formType}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      {getStatusIcon(submission.status)}
                      {getStatusText(submission.status)}
                    </span>
                    <span>Created: {formatDate(submission.createdAt)}</span>
                    {submission.attachments.length > 0 && (
                      <span>
                        {submission.attachments.length} attachment
                        {submission.attachments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {submission.errorMessage && (
                    <p className="text-sm text-red-600 mt-2">{submission.errorMessage}</p>
                  )}
                  {submission.retryCount > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Retry attempts: {submission.retryCount}/5
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {submission.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(submission.id)}
                    disabled={!isOnline || retryingId === submission.id}
                    className={`p-2 rounded-lg transition-colors ${
                      isOnline && retryingId !== submission.id
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title="Retry"
                  >
                    <ArrowPathIcon
                      className={`h-5 w-5 ${retryingId === submission.id ? 'animate-spin' : ''}`}
                    />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(submission.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
