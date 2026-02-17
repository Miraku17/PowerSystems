"use client";

import { KBArticle } from "@/types";
import {
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
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
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all animate-slideUp">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider border uppercase ${categoryColor}`}
            >
              <TagIcon className="h-3.5 w-3.5 mr-1.5" />
              {article.kbCode}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider border uppercase ${categoryColor}`}
            >
              {categoryLabel} Resource
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar">
          {/* Title Section */}
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {article.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" />
                {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span className="flex items-center gap-1.5">
                <UserIcon className="h-4 w-4" />
                {article.createdByName || "System Admin"}
              </span>
            </div>
          </div>

          {/* Article Body */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-widest">
              <div className="w-8 h-1 bg-[#2B4C7E] rounded-full" />
              Technical Documentation
            </div>
            <div
              className="text-gray-700 text-[15px] sm:text-[16px] leading-relaxed bg-gray-50/50 rounded-2xl p-6 sm:p-8 border border-gray-100 whitespace-pre-wrap font-medium"
            >
              {article.content}
            </div>
          </div>

          {/* Media Grid (Images & Videos) */}
          {(article.images?.length > 0 || article.videoLinks?.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-6 border-t border-gray-100">
              {/* Images */}
              {article.images && article.images.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center">
                    <PhotoIcon className="h-4.5 w-4.5 mr-2 text-blue-500" />
                    Technical Diagrams ({article.images.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {article.images.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(img.fileUrl)}
                        className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-200 hover:border-[#2B4C7E] shadow-sm hover:shadow-md transition-all group"
                      >
                        <img
                          src={img.fileUrl}
                          alt={img.fileName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {article.videoLinks && article.videoLinks.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center">
                    <VideoCameraIcon className="h-4.5 w-4.5 mr-2 text-red-500" />
                    Video References ({article.videoLinks.length})
                  </h3>
                  <div className="space-y-3">
                    {article.videoLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#2B4C7E] hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                            <VideoCameraIcon className="h-5 w-5 text-red-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 truncate group-hover:text-gray-900">
                            {link.split('/').pop() || 'View Video Resource'}
                          </span>
                        </div>
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 group-hover:text-[#2B4C7E] flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-10 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <UserIcon className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Authored By</p>
                <p className="text-sm font-bold text-gray-900">{article.createdByName || "System Admin"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(article.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
            {article.updatedBy && article.updatedAt !== article.createdAt && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-xl">
                  <CalendarIcon className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Last Modified</p>
                  <p className="text-sm font-bold text-gray-900">{article.updatedByName || "System Admin"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(article.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all active:scale-95"
          >
            Close Document
          </button>
        </div>
      </div>

      {/* Enhanced Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Technical Diagram Full Size"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoomIn"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-0 right-0 m-4 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
