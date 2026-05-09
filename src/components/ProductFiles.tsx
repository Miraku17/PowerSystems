"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmationModal from "./ConfirmationModal";

const BUCKET = "products";

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
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      sortBy: { column: "updated_at", order: "desc" },
    });
    if (error) {
      toast.error("Failed to load files");
      setFiles([]);
    } else {
      setFiles(
        (data ?? [])
          .filter((f) => f.name && !f.name.endsWith("/"))
          .map((f) => ({
            name: f.name,
            size: (f.metadata as { size?: number } | null)?.size ?? 0,
            updated_at: f.updated_at ?? null,
          })),
      );
    }
    setIsLoading(false);
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
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`Skipped ${file.name}: not a PDF`);
        continue;
      }
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from(BUCKET).upload(safeName, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        successes += 1;
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
    const { error } = await supabase.storage.from(BUCKET).remove([target]);
    setIsDeleting(false);
    setPendingDelete(null);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    toast.success("File deleted");
    await loadFiles();
  };

  const openFile = async (name: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(name, 60 * 5);
    if (error || !data?.signedUrl) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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
                  <button
                    onClick={() => setPendingDelete(file.name)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
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
    </div>
  );
}
