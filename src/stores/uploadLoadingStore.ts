import { create } from 'zustand';

interface UploadLoadingState {
  isUploading: boolean;
  message: string;
  showUploadLoading: (message?: string) => void;
  hideUploadLoading: () => void;
}

export const useUploadLoadingStore = create<UploadLoadingState>((set) => ({
  isUploading: false,
  message: 'Uploading images...',
  showUploadLoading: (message = 'Uploading images...') =>
    set({ isUploading: true, message }),
  hideUploadLoading: () =>
    set({ isUploading: false, message: 'Uploading images...' }),
}));
