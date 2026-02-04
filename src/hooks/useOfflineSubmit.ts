'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { useIsOnline } from '@/stores/networkStore';
import { useSyncStore } from '@/stores/syncStore';
import {
  addPendingSubmission,
  fileToStorable,
  FormType,
  StorableAttachment,
} from '@/lib/offlineDb';

// Map form types to their respective endpoints
const formTypeEndpoints: Record<FormType, string> = {
  'job-order-request': '/forms/job-order-request',
  'deutz-commissioning': '/forms/deutz-commissioning',
  'deutz-service': '/forms/deutz-service',
  'engine-teardown': '/forms/engine-teardown',
  'electric-surface-pump-teardown': '/forms/electric-surface-pump-teardown',
  'electric-surface-pump-service': '/forms/electric-surface-pump-service',
  'electric-surface-pump-commissioning': '/forms/electric-surface-pump-commissioning',
  'engine-surface-pump-service': '/forms/engine-surface-pump-service',
  'engine-surface-pump-commissioning': '/forms/engine-surface-pump-commissioning',
  'submersible-pump-commissioning': '/forms/submersible-pump-commissioning',
  'submersible-pump-teardown': '/forms/submersible-pump-teardown',
  'engine-inspection-receiving': '/forms/engine-inspection-receiving',
  'components-teardown-measuring': '/forms/components-teardown-measuring',
};

interface Attachment {
  file: File;
  title: string;
}

interface AttachmentGroup {
  fieldName: string; // e.g., 'attachment', 'motor_components', 'wet_end'
  attachments: Attachment[];
}

interface SubmitOptions {
  formType: FormType;
  formData: Record<string, unknown>;
  attachments?: Attachment[];
  attachmentGroups?: AttachmentGroup[]; // For forms with multiple attachment categories
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  additionalFields?: Record<string, string>;
}

export function useOfflineSubmit() {
  const isOnline = useIsOnline();
  const { incrementPendingCount } = useSyncStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async ({
    formType,
    formData,
    attachments = [],
    attachmentGroups = [],
    onSuccess,
    onError,
    additionalFields = {},
  }: SubmitOptions): Promise<boolean> => {
    setIsSubmitting(true);
    const loadingToastId = toast.loading('Submitting form...');

    // Combine all attachments for offline storage
    const allAttachments = [
      ...attachments,
      ...attachmentGroups.flatMap((g) => g.attachments),
    ];

    try {
      if (isOnline) {
        // Online: Submit directly
        const formDataToSubmit = new FormData();

        // Append all form fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formDataToSubmit.append(key, String(value));
          }
        });

        // Append additional mapped fields
        Object.entries(additionalFields).forEach(([key, value]) => {
          formDataToSubmit.append(key, value);
        });

        // Append standard attachments
        attachments.forEach((attachment) => {
          formDataToSubmit.append('attachment_files', attachment.file);
          formDataToSubmit.append('attachment_titles', attachment.title);
        });

        // Append grouped attachments with custom field names
        attachmentGroups.forEach((group) => {
          group.attachments.forEach((attachment) => {
            formDataToSubmit.append(`${group.fieldName}_files`, attachment.file);
            formDataToSubmit.append(`${group.fieldName}_titles`, attachment.title);
          });
        });

        const endpoint = formTypeEndpoints[formType];
        if (!endpoint) {
          throw new Error(`Unknown form type: ${formType}`);
        }

        await apiClient.post(endpoint, formDataToSubmit, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        toast.success('Form submitted successfully!', { id: loadingToastId });
        onSuccess?.();
        return true;
      } else {
        // Offline: Save to IndexedDB
        toast.loading('Saving form offline...', { id: loadingToastId });

        // Convert all attachments to storable format
        const storableAttachments: StorableAttachment[] = await Promise.all(
          allAttachments.map((att) => fileToStorable(att.file, att.title))
        );

        // Merge additional fields into form data
        const mergedFormData = { ...formData, ...additionalFields };

        // Add to pending queue
        await addPendingSubmission(formType, mergedFormData, storableAttachments);
        incrementPendingCount();

        toast.success('Form saved offline. It will sync when you\'re back online.', {
          id: loadingToastId,
          duration: 5000,
          icon: '📴',
        });
        onSuccess?.();
        return true;
      }
    } catch (error) {
      console.error('Submit error:', error);

      // Check if it's a network error (might have gone offline during submission)
      if (
        error instanceof Error &&
        (error.message.includes('Network Error') ||
          error.message.includes('Failed to fetch') ||
          !navigator.onLine)
      ) {
        // Save offline instead
        try {
          toast.loading('Network error. Saving form offline...', { id: loadingToastId });

          const storableAttachments: StorableAttachment[] = await Promise.all(
            allAttachments.map((att) => fileToStorable(att.file, att.title))
          );

          const mergedFormData = { ...formData, ...additionalFields };
          await addPendingSubmission(formType, mergedFormData, storableAttachments);
          incrementPendingCount();

          toast.success('Form saved offline. It will sync when you\'re back online.', {
            id: loadingToastId,
            duration: 5000,
            icon: '📴',
          });
          onSuccess?.();
          return true;
        } catch (offlineError) {
          console.error('Failed to save offline:', offlineError);
          toast.error('Failed to save form. Please try again.', { id: loadingToastId });
          onError?.(offlineError as Error);
          return false;
        }
      }

      // Handle other errors
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred. Please try again.';

      // Check for axios error response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { data?: { error?: string; message?: string } };
        };
        const apiError =
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          errorMessage;
        toast.error(`Failed to submit: ${apiError}`, { id: loadingToastId });
      } else {
        toast.error(`Failed to submit: ${errorMessage}`, { id: loadingToastId });
      }

      onError?.(error as Error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
    isOnline,
  };
}
