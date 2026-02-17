"use client";

import { useState, useEffect, useRef } from "react";
import { KBArticle, KBCategory, KBArticleImage } from "@/types";
import { knowledgeBaseService } from "@/services/knowledgeBase";
import { useKBFormStore } from "@/stores/knowledgeBaseFormStore";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";
import {
  XMarkIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  VideoCameraIcon,
  TagIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface KnowledgeBaseFormModalProps {
  mode: "create" | "edit";
  article?: KBArticle | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImagePreview {
  id?: string;
  file?: File;
  url: string;
  fileName: string;
  isExisting: boolean;
}

export default function KnowledgeBaseFormModal({
  mode,
  article,
  onClose,
  onSuccess,
}: KnowledgeBaseFormModalProps) {
  const { formData, setFormData, resetFormData } = useKBFormStore();

  // Edit mode local state (not persisted)
  const [editData, setEditData] = useState({
    category: article?.category || ("engine" as KBCategory),
    title: article?.title || "",
    content: article?.content || "",
    videoLinks: article?.videoLinks || [] as string[],
  });

  const currentData = mode === "edit" ? editData : formData;
  const updateData =
    mode === "edit"
      ? (data: Partial<typeof editData>) =>
          setEditData((prev) => ({ ...prev, ...data }))
      : setFormData;

  const [kbCode, setKbCode] = useState(article?.kbCode || "");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<{ id: string; articleId: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing images in edit mode
  useEffect(() => {
    if (mode === "edit" && article?.images) {
      setImages(
        article.images.map((img) => ({
          id: img.id,
          url: img.fileUrl,
          fileName: img.fileName,
          isExisting: true,
        }))
      );
    }
  }, [mode, article]);

  // Fetch next KB code
  useEffect(() => {
    if (mode === "edit") {
      setKbCode(article?.kbCode || "");
      return;
    }
    fetchNextCode(currentData.category);
  }, [currentData.category, mode]);

  const fetchNextCode = async (category: KBCategory) => {
    setIsLoadingCode(true);
    try {
      const response = await knowledgeBaseService.getNextCode(category);
      if (response.success && response.data) {
        setKbCode(response.data.code);
      }
    } catch (error) {
      console.error("Error fetching next code:", error);
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const totalImages = images.length + files.length;
    if (totalImages > 5) {
      toast.error(`Maximum 5 images allowed. You can add ${5 - images.length} more.`);
      return;
    }

    const compressionOptions = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    const loadingToast = toast.loading("Compressing images...");

    try {
      const newPreviews: ImagePreview[] = [];

      for (const file of files) {
        const compressed = await imageCompression(file, compressionOptions);
        const previewUrl = URL.createObjectURL(compressed);
        newPreviews.push({
          file: compressed as File,
          url: previewUrl,
          fileName: file.name,
          isExisting: false,
        });
      }

      setImages((prev) => [...prev, ...newPreviews]);
      toast.success("Images compressed successfully", { id: loadingToast });
    } catch (error) {
      console.error("Error compressing images:", error);
      toast.error("Failed to compress images", { id: loadingToast });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    const image = images[index];

    // If it's an existing image, queue it for deletion on save
    if (image.isExisting && image.id && article) {
      setImagesToDelete((prev) => [...prev, { id: image.id!, articleId: article.id }]);
    }

    // Revoke blob URL if it's a new image
    if (!image.isExisting) {
      URL.revokeObjectURL(image.url);
    }

    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Video links management
  const addVideoLink = () => {
    updateData({ videoLinks: [...currentData.videoLinks, ""] });
  };

  const updateVideoLink = (index: number, value: string) => {
    const updated = [...currentData.videoLinks];
    updated[index] = value;
    updateData({ videoLinks: updated });
  };

  const removeVideoLink = (index: number) => {
    updateData({
      videoLinks: currentData.videoLinks.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const loadingToast = toast.loading(
      mode === "create" ? "Creating article..." : "Updating article..."
    );

    try {
      let articleId: string;

      if (mode === "create") {
        // Filter out empty video links
        const filteredLinks = currentData.videoLinks.filter(
          (link) => link.trim() !== ""
        );

        const response = await knowledgeBaseService.create({
          category: currentData.category,
          title: currentData.title,
          content: currentData.content,
          videoLinks: filteredLinks,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to create article");
        }

        articleId = response.data.id;
      } else {
        if (!article) throw new Error("No article to update");

        const filteredLinks = currentData.videoLinks.filter(
          (link) => link.trim() !== ""
        );

        const response = await knowledgeBaseService.update(article.id, {
          title: currentData.title,
          content: currentData.content,
          videoLinks: filteredLinks,
        });

        if (!response.success) {
          throw new Error(response.message || "Failed to update article");
        }

        articleId = article.id;
      }

      // Delete queued images
      for (const img of imagesToDelete) {
        try {
          await knowledgeBaseService.deleteImage(img.articleId, img.id);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }

      // Upload new images
      const newImages = images.filter((img) => !img.isExisting && img.file);
      if (newImages.length > 0) {
        const formDataObj = new FormData();
        newImages.forEach((img) => {
          if (img.file) {
            formDataObj.append("files", img.file);
          }
        });

        await knowledgeBaseService.uploadImages(articleId, formDataObj);
      }

      toast.success(
        mode === "create"
          ? "Article created successfully!"
          : "Article updated successfully!",
        { id: loadingToast }
      );

      if (mode === "create") {
        resetFormData();
      }

      // Clean up blob URLs
      images.forEach((img) => {
        if (!img.isExisting) URL.revokeObjectURL(img.url);
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving article:", error);
      toast.error(error.message || "Failed to save article", {
        id: loadingToast,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {mode === "create"
                ? "Create New Article"
                : "Edit Article"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "create"
                ? "Add a new knowledge base article."
                : "Update article information."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category & KB Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={currentData.category}
                onChange={(e) =>
                  updateData({ category: e.target.value as KBCategory })
                }
                disabled={mode === "edit"}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="engine">Engine</option>
                <option value="pump">Pump</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                KB Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <TagIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={isLoadingCode ? "Loading..." : kbCode}
                  disabled
                  className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 sm:text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={currentData.title}
                onChange={(e) => updateData({ title: e.target.value })}
                className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                placeholder="Article title..."
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              required
              rows={8}
              value={currentData.content}
              onChange={(e) => updateData({ content: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm resize-none"
              style={{ whiteSpace: "pre-wrap" }}
              placeholder="Article content... (whitespace and line breaks are preserved)"
            />
          </div>

          {/* Images */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <PhotoIcon className="h-4 w-4 mr-1.5" />
                Images ({images.length}/5)
              </label>
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Images
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group"
                  >
                    <img
                      src={img.url}
                      alt={img.fileName}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-0.5 truncate">
                      {img.fileName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Click to upload images (max 5, auto-compressed)
                </p>
              </div>
            )}
          </div>

          {/* Video Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <VideoCameraIcon className="h-4 w-4 mr-1.5" />
                Video Links
              </label>
              <button
                type="button"
                onClick={addVideoLink}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Link
              </button>
            </div>

            {currentData.videoLinks.length > 0 ? (
              <div className="space-y-2">
                {currentData.videoLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <VideoCameraIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateVideoLink(idx, e.target.value)}
                        className="block w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideoLink(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No video links added yet.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#2B4C7E] text-white font-medium rounded-xl hover:bg-[#1A2F4F] shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                ? "Create Article"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
