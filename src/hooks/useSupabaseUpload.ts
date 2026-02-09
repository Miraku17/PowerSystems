import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { buildStoragePath, validateFileType, validateFileSize } from '@/lib/uploadHelpers';

interface UploadOptions {
  bucket: string;
  pathPrefix: string;
  maxSizeMB?: number;
  onProgress?: (fileIndex: number, progress: number) => void;
}

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  fileName: string;
}

interface UseSupabaseUploadReturn {
  uploadFiles: (files: File[], options: UploadOptions) => Promise<UploadResult[]>;
  uploadProgress: Record<number, number>;
  isUploading: boolean;
  cancelUpload: () => void;
}

export const useSupabaseUpload = (): UseSupabaseUploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsUploading(false);
      setUploadProgress({});
    }
  }, []);

  const uploadSingleFile = async (
    file: File,
    index: number,
    options: UploadOptions,
    abortSignal: AbortSignal
  ): Promise<UploadResult> => {
    const { bucket, pathPrefix, maxSizeMB = 10, onProgress } = options;

    // Validate file type
    if (!validateFileType(file)) {
      return {
        success: false,
        error: 'Invalid file type. Only images are allowed.',
        fileName: file.name,
      };
    }

    // Validate file size
    if (!validateFileSize(file, maxSizeMB)) {
      return {
        success: false,
        error: `File size exceeds ${maxSizeMB}MB limit.`,
        fileName: file.name,
      };
    }

    try {
      // Check if upload was cancelled
      if (abortSignal.aborted) {
        return {
          success: false,
          error: 'Upload cancelled',
          fileName: file.name,
        };
      }

      // Build storage path
      const category = pathPrefix.split('/').pop() || 'misc';
      const storagePath = buildStoragePath(category, file.name);

      // Update progress - starting
      setUploadProgress(prev => ({ ...prev, [index]: 0 }));
      onProgress?.(index, 0);

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error(`Upload error for ${file.name}:`, error);
        return {
          success: false,
          error: error.message || 'Upload failed',
          fileName: file.name,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      // Update progress - complete
      setUploadProgress(prev => ({ ...prev, [index]: 100 }));
      onProgress?.(index, 100);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path,
        fileName: file.name,
      };
    } catch (error: any) {
      console.error(`Upload error for ${file.name}:`, error);
      return {
        success: false,
        error: error.message || 'Upload failed',
        fileName: file.name,
      };
    }
  };

  const uploadFiles = useCallback(
    async (files: File[], options: UploadOptions): Promise<UploadResult[]> => {
      if (files.length === 0) {
        return [];
      }

      setIsUploading(true);
      setUploadProgress({});

      // Create new abort controller for this upload batch
      abortControllerRef.current = new AbortController();
      const abortSignal = abortControllerRef.current.signal;

      try {
        // Upload files with max 3 concurrent uploads
        const MAX_CONCURRENT = 3;
        const results: UploadResult[] = [];

        for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
          // Check if cancelled
          if (abortSignal.aborted) {
            // Add cancelled results for remaining files
            for (let j = i; j < files.length; j++) {
              results.push({
                success: false,
                error: 'Upload cancelled',
                fileName: files[j].name,
              });
            }
            break;
          }

          // Upload batch of files
          const batch = files.slice(i, i + MAX_CONCURRENT);
          const batchPromises = batch.map((file, batchIndex) =>
            uploadSingleFile(file, i + batchIndex, options, abortSignal)
          );

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }

        return results;
      } catch (error: any) {
        console.error('Upload batch error:', error);
        // Return failed results for all files
        return files.map(file => ({
          success: false,
          error: error.message || 'Upload failed',
          fileName: file.name,
        }));
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  return {
    uploadFiles,
    uploadProgress,
    isUploading,
    cancelUpload,
  };
};
