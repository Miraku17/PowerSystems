import { supabase } from './supabase';
import { sanitizeFilename } from './utils';

/**
 * Build storage path for file upload
 * @param category - Category of attachment (e.g., 'pre-teardown', 'wet-end', 'motor')
 * @param filename - Original filename
 * @returns Full storage path
 */
export const buildStoragePath = (category: string, filename: string): string => {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(filename);
  return `submersible/teardown/${category}/${timestamp}-${sanitized}`;
};

/**
 * Validate if file is an image
 * @param file - File to validate
 * @returns true if file is an image
 */
export const validateFileType = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Validate file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in MB
 * @returns true if file size is within limit
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Extract storage path from Supabase public URL
 * @param url - Public URL from Supabase Storage
 * @returns Storage path or null if invalid
 */
export const extractPathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const objectIndex = pathParts.indexOf('object');

    if (objectIndex !== -1 && pathParts[objectIndex + 1] === 'public') {
      // Extract everything after /object/public/{bucket-name}/
      const bucketIndex = objectIndex + 2;
      return pathParts.slice(bucketIndex + 1).join('/');
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Delete file from Supabase Storage
 * @param url - Public URL or storage path
 * @returns Promise that resolves when file is deleted
 */
export const deleteStorageFile = async (url: string): Promise<void> => {
  try {
    // Extract path from URL if it's a full URL
    const path = url.startsWith('http') ? extractPathFromUrl(url) : url;

    if (!path) {
      console.error('Invalid URL or path for deletion:', url);
      return;
    }

    const { error } = await supabase
      .storage
      .from('service-reports')
      .remove([path]);

    if (error) {
      console.error('Error deleting file from storage:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete storage file:', error);
    throw error;
  }
};

/**
 * Validate multiple files before upload
 * @param files - Files to validate
 * @param maxSizeMB - Maximum size per file in MB
 * @returns Object with validation results
 */
export const validateFiles = (files: File[], maxSizeMB: number = 10): {
  valid: File[];
  invalid: Array<{ file: File; reason: string }>;
} => {
  const valid: File[] = [];
  const invalid: Array<{ file: File; reason: string }> = [];

  for (const file of files) {
    if (!validateFileType(file)) {
      invalid.push({ file, reason: 'Not an image file' });
      continue;
    }

    if (!validateFileSize(file, maxSizeMB)) {
      invalid.push({ file, reason: `Exceeds ${maxSizeMB}MB limit` });
      continue;
    }

    valid.push(file);
  }

  return { valid, invalid };
};
