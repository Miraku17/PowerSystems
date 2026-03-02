"use client";

import { useUploadLoadingStore } from "@/stores/uploadLoadingStore";

export default function FullScreenLoading() {
  const { isUploading, message } = useUploadLoadingStore();

  if (!isUploading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 max-w-sm mx-4">
        <svg
          className="animate-spin h-10 w-10 text-[#2B4C7E]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-gray-700 font-medium text-center">{message}</p>
        <p className="text-gray-400 text-sm text-center">
          Please do not close or navigate away.
        </p>
      </div>
    </div>
  );
}
