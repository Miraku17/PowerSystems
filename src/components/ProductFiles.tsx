"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import apiClient from "@/lib/axios";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmationModal from "./ConfirmationModal";

interface ProductFile {
  name: string;
  size: number;
  updated_at: string | null;
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProductFiles() {
  const { canWrite } = usePermissions();
  const [files, setFiles] = useState<ProductFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: ProductFile[] }>(
        "/products",
      );
      setFiles(res.data.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to load files");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadClick = () => inputRef.current?.click();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    const loadingToast = toast.loading(`Uploading ${fileList.length} file(s)…`);
    let successes = 0;
    for (const file of Array.from(fileList)) {
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        toast.error(`Skipped ${file.name}: not a PDF`);
        continue;
      }
      const formData = new FormData();
      formData.append("file", file);
      try {
        await apiClient.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        successes += 1;
      } catch (err: any) {
        toast.error(
          `Failed to upload ${file.name}: ${
            err?.response?.data?.message ?? err.message
          }`,
        );
      }
    }
    setIsUploading(false);
    toast.dismiss(loadingToast);
    if (successes > 0) toast.success(`Uploaded ${successes} file(s)`);
    if (inputRef.current) inputRef.current.value = "";
    await loadFiles();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const target = pendingDelete;
    try {
      await apiClient.delete(`/products/${encodeURIComponent(target)}`);
      toast.success("File deleted");
      await loadFiles();
    } catch (err: any) {
      toast.error(
        `Failed to delete: ${err?.response?.data?.message ?? err.message}`,
      );
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const openRename = (name: string) => {
    setRenameTarget(name);
    setRenameValue(name.replace(/\.pdf$/i, ""));
  };

  const handleConfirmRename = async () => {
    if (!renameTarget) return;
    const newName = renameValue.trim();
    if (!newName) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsRenaming(true);
    try {
      await apiClient.patch(`/products/${encodeURIComponent(renameTarget)}`, {
        newName,
      });
      toast.success("File renamed");
      setRenameTarget(null);
      setRenameValue("");
      await loadFiles();
    } catch (err: any) {
      toast.error(
        `Failed to rename: ${err?.response?.data?.message ?? err.message}`,
      );
    } finally {
      setIsRenaming(false);
    }
  };

  const openFile = async (name: string) => {
    try {
      const res = await apiClient.get<{ data: { signedUrl: string } }>(
        `/products/${encodeURIComponent(name)}`,
      );
      window.open(res.data.data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not open file");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {canWrite("products") && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2B4C7E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1A2F4F] disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              {isUploading ? "Uploading…" : "Upload PDF"}
            </button>
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading files…</div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">No files yet</p>
            {canWrite("products") && (
              <p className="mt-1 text-xs text-gray-500">Click “Upload PDF” to add one.</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {files.map((file) => (
              <li key={file.name} className="flex items-center gap-3 px-4 py-3">
                <DocumentTextIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
                <button
                  onClick={() => openFile(file.name)}
                  className="flex-1 truncate text-left text-sm text-gray-800 hover:underline"
                  title={file.name}
                >
                  {file.name}
                </button>
                <span className="hidden w-24 text-right text-xs text-gray-500 sm:inline">
                  {formatSize(file.size)}
                </span>
                <span className="hidden w-40 text-right text-xs text-gray-400 md:inline">
                  {file.updated_at ? new Date(file.updated_at).toLocaleString() : ""}
                </span>
                <button
                  onClick={() => openFile(file.name)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#2B4C7E]"
                  title="Open"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                </button>
                {canWrite("products") && (
                  <>
                    <button
                      onClick={() => openRename(file.name)}
                      aria-label={`Rename ${file.name}`}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#2B4C7E]"
                      title="Rename"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPendingDelete(file.name)}
                      aria-label={`Delete ${file.name}`}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        onClose={() => {
          if (!isDeleting) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete file"
        message={`Delete "${pendingDelete ?? ""}"? This cannot be undone.`}
        confirmText={isDeleting ? "Deleting…" : "Delete"}
        type="danger"
      />

      {renameTarget !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 p-5">
              <h3 className="text-lg font-semibold text-gray-900">Rename file</h3>
              <p className="mt-1 truncate text-xs text-gray-500" title={renameTarget}>
                {renameTarget}
              </p>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700">
                New name
              </label>
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) handleConfirmRename();
                  if (e.key === "Escape" && !isRenaming) setRenameTarget(null);
                }}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Product reference sheet"
              />
              <p className="mt-2 text-xs text-gray-500">
                The .pdf extension is added automatically.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                disabled={isRenaming}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                disabled={isRenaming || !renameValue.trim()}
                className="rounded-lg bg-[#2B4C7E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1A2F4F] disabled:opacity-50"
              >
                {isRenaming ? "Renaming…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
