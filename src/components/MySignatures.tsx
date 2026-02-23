"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import apiClient from "@/lib/axios";
import SignaturePad from "@/components/SignaturePad";
import ConfirmationModal from "@/components/ConfirmationModal";
import toast from "react-hot-toast";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Signature {
  id: string;
  user_id: string;
  label: string;
  signature_url: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

async function fetchSignature(): Promise<Signature | null> {
  const response = await apiClient.get("/signatures");
  return response.data.data || null;
}

export default function MySignatures() {
  const queryClient = useQueryClient();
  const { canAccess, canWrite, canDelete, isLoading: permissionsLoading } = usePermissions();

  // State
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch signature
  const {
    data: signature,
    isLoading,
    error,
  } = useQuery<Signature | null>({
    queryKey: ["signature"],
    queryFn: fetchSignature,
    enabled: canAccess("signatures"),
  });

  // Save mutation (creates or replaces)
  const saveMutation = useMutation({
    mutationFn: async (base64Signature: string) => {
      const response = await fetch(base64Signature);
      const blob = await response.blob();
      const file = new File([blob], "signature.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("signature", file);

      return apiClient.post("/signatures", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Signature saved successfully");
      resetDrawForm();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to save signature";
      toast.error(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete("/signatures");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Signature deleted successfully");
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to delete signature";
      toast.error(message);
    },
  });

  const resetDrawForm = () => {
    setShowDrawModal(false);
    setSignatureData("");
  };

  const handleSave = () => {
    if (!signatureData) {
      toast.error("Please draw your signature");
      return;
    }
    saveMutation.mutate(signatureData);
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!canAccess("signatures")) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Your signature will be used when signing forms.
      </p>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Failed to load signature. Please try again.
        </div>
      )}

      {/* No signature — empty state */}
      {!isLoading && !error && !signature && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 mb-3">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900">No signature yet</h3>
          <p className="mt-1 text-sm text-gray-500 mb-4">
            Draw your signature to use when signing forms.
          </p>
          {canWrite("signatures") && (
            <button
              onClick={() => setShowDrawModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#083459] text-white rounded-lg hover:bg-[#0a4a7a] transition-colors text-sm font-medium"
            >
              Draw Signature
            </button>
          )}
        </div>
      )}

      {/* Existing signature */}
      {!isLoading && signature && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm max-w-md">
          {/* Signature image */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <img
              src={signature.signature_url}
              alt="My Signature"
              className="w-full h-32 object-contain"
            />
          </div>

          {/* Actions */}
          <div className="p-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Saved {new Date(signature.created_at).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-2">
              {canWrite("signatures") && (
                <button
                  onClick={() => setShowDrawModal(true)}
                  className="px-3 py-1.5 text-sm bg-[#083459] text-white rounded-lg hover:bg-[#0a4a7a] transition-colors font-medium"
                >
                  Edit
                </button>
              )}
              {canDelete("signatures") && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete signature"
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Draw Signature Modal */}
      {showDrawModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) resetDrawForm();
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {signature ? "Edit Signature" : "Draw Signature"}
              </h3>
              <button
                onClick={resetDrawForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <SignaturePad
                label="Draw your signature"
                value={signatureData}
                onChange={setSignatureData}
                subtitle="Draw your signature above"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={resetDrawForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-4 py-2 bg-[#083459] text-white rounded-lg hover:bg-[#0a4a7a] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : "Save Signature"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Signature"
        message="Are you sure you want to delete your signature? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
