import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize filename to remove problematic characters for URLs
 * Removes #, ?, &, % and replaces spaces and special characters with underscores
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[#?&%]/g, '')  // Remove URL-breaking characters
    .replace(/\s+/g, '_')    // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace other special chars with underscore
};
