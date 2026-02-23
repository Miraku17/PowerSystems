/**
 * Compress an image file by resizing and converting to JPEG.
 * Max dimensions: 1920x1920, JPEG quality: 0.8
 * Only compresses files larger than the threshold (default 2MB).
 */

const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2MB
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 0.8;

export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with 0.8 quality for good compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, '.jpg'),
                { type: 'image/jpeg', lastModified: Date.now() }
              );
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/**
 * Compress an image file if it exceeds the threshold size.
 * Returns the original file if it's small enough or compression fails.
 */
export const compressImageIfNeeded = async (file: File, thresholdBytes: number = COMPRESSION_THRESHOLD): Promise<File> => {
  if (file.size <= thresholdBytes) {
    return file;
  }

  try {
    return await compressImage(file);
  } catch {
    // Fall back to original file if compression fails
    return file;
  }
};
