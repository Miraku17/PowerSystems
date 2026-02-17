"use client";

import { KBArticle } from "@/types";
import {
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
  TagIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

interface KnowledgeBaseDetailProps {
  article: KBArticle;
  onClose: () => void;
}

export default function KnowledgeBaseDetail({
  article,
  onClose,
}: KnowledgeBaseDetailProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const categoryLabel = article.category === "engine" ? "Engine" : "Pump";
  const categoryColor =
    article.category === "engine"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-green-50 text-green-700 border-green-200";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${categoryColor}`}
            >
              <TagIcon className="h-3 w-3 mr-1" />
              {article.kbCode}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColor}`}
            >
              {categoryLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">{article.title}</h2>

          <div className="prose max-w-none">
            <div
              className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {article.content}
            </div>
          </div>

          {/* Images */}
          {article.images && article.images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <PhotoIcon className="h-4 w-4 mr-1.5" />
                Images ({article.images.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {article.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.fileUrl)}
                    className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors group"
                  >
                    <img
                      src={img.fileUrl}
                      alt={img.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Links */}
          {article.videoLinks && article.videoLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <VideoCameraIcon className="h-4 w-4 mr-1.5" />
                Video Links ({article.videoLinks.length})
              </h3>
              <div className="space-y-2">
                {article.videoLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                  >
                    <VideoCameraIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
              <span>
                Created by{" "}
                <span className="font-medium text-gray-700">
                  {article.createdByName || "Unknown"}
                </span>{" "}
                on{" "}
                {new Date(article.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at{" "}
                {new Date(article.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {article.updatedBy && article.updatedAt !== article.createdAt && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  Last updated by{" "}
                  <span className="font-medium text-gray-700">
                    {article.updatedByName || "Unknown"}
                  </span>{" "}
                  on{" "}
                  {new Date(article.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(article.updatedAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-end p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
