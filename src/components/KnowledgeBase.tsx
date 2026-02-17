"use client";

import { useState, useEffect } from "react";
import { KBArticle, KBCategory } from "@/types";
import { knowledgeBaseService } from "@/services/knowledgeBase";
import toast from "react-hot-toast";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  TagIcon,
  PhotoIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  Bars3Icon,
  BookOpenIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { TableSkeleton } from "./Skeletons";
import ConfirmationModal from "./ConfirmationModal";
import KnowledgeBaseFormModal from "./KnowledgeBaseFormModal";
import KnowledgeBaseDetail from "./KnowledgeBaseDetail";
import { usePermissions } from "@/hooks/usePermissions";

const CATEGORY_TABS = [
  { label: "All Resources", value: "" },
  { label: "Engines", value: "engine" },
  { label: "Pumps", value: "pump" },
] as const;

const getCategoryBadge = (category: KBCategory) => {
  return category === "engine"
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-green-50 text-green-700 border-green-200";
};

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailArticle, setDetailArticle] = useState<KBArticle | null>(null);

  // Confirmation modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { canWrite, canEdit, canDelete } = usePermissions();

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await knowledgeBaseService.getAll();
      const data = response.data || [];
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load articles");
      console.error("Error loading KB articles:", error);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormMode("create");
    setSelectedArticle(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (article: KBArticle) => {
    setFormMode("edit");
    setSelectedArticle(article);
    setShowFormModal(true);
  };

  const handleOpenDetail = (article: KBArticle) => {
    setDetailArticle(article);
    setShowDetail(true);
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const loadingToast = toast.loading("Deleting article...");
    try {
      await knowledgeBaseService.delete(pendingDeleteId);
      await loadArticles();
      toast.success("Article deleted successfully!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to delete article", { id: loadingToast });
      console.error("Error deleting article:", error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesCategory = !categoryFilter || article.category === categoryFilter;
    const matchesSearch =
      !searchTerm ||
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.kbCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    total: articles.length,
    engines: articles.filter(a => a.category === 'engine').length,
    pumps: articles.filter(a => a.category === 'pump').length
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Page Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpenIcon className="h-8 w-8 text-[#2B4C7E]" />
            Knowledge Base
          </h1>
          <p className="text-gray-500 mt-1">
            Access technical documentation, guides, and troubleshooting resources.
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-3 sm:gap-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-center px-2 sm:px-4 border-r border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="text-center px-2 sm:px-4 border-r border-gray-100">
            <p className="text-xs font-medium text-blue-500 uppercase tracking-wider">Engines</p>
            <p className="text-lg font-bold text-gray-900">{stats.engines}</p>
          </div>
          <div className="text-center px-2 sm:px-4">
            <p className="text-xs font-medium text-green-500 uppercase tracking-wider">Pumps</p>
            <p className="text-lg font-bold text-gray-900">{stats.pumps}</p>
          </div>
        </div>
      </div>

      {/* Header / Filter Section */}
      <div className="flex flex-col gap-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Category Tabs */}
          <div className="flex p-1 bg-gray-100/80 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCategoryFilter(tab.value)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  categoryFilter === tab.value
                    ? "bg-white text-[#2B4C7E] shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80 lg:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search articles, codes, content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 sm:text-sm"
              />
            </div>
            {canWrite("knowledge_base") && (
              <button
                onClick={handleOpenCreate}
                className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-xl text-white bg-[#2B4C7E] hover:bg-[#1A2F4F] shadow-md hover:shadow-lg transform active:scale-95 transition-all duration-200 focus:outline-none"
              >
                <PlusIcon className="h-5 w-5 mr-2 stroke-[2.5px]" />
                New Article
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      KB Code
                    </th>
                    <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Resource Title
                    </th>
                    <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Category
                    </th>
                    <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Assets
                    </th>
                    <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Date Created
                    </th>
                    <th className="px-6 py-5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-4 bg-gray-50 rounded-full mb-4">
                            <DocumentTextIcon className="h-10 w-10 text-gray-300" />
                          </div>
                          <p className="text-gray-900 text-lg font-bold">
                            No resources found
                          </p>
                          <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                            We couldn't find any articles matching your current search or filter criteria.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((article) => (
                      <tr
                        key={article.id}
                        className="hover:bg-blue-50/30 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider border uppercase ${getCategoryBadge(
                              article.category
                            )}`}
                          >
                            <TagIcon className="h-3 w-3 mr-1.5" />
                            {article.kbCode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleOpenDetail(article)}
                            className="text-sm font-semibold text-gray-900 hover:text-[#2B4C7E] transition-colors text-left block"
                          >
                            {article.title}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[13px] font-medium text-gray-600 capitalize flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${article.category === 'engine' ? 'bg-blue-400' : 'bg-green-400'}`} />
                            {article.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center text-[12px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                              <PhotoIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              {article.images?.length || 0}
                            </span>
                            {article.videoLinks && article.videoLinks.length > 0 && (
                              <span className="inline-flex items-center text-[12px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                                <Bars3Icon className="h-3.5 w-3.5 mr-1 text-gray-400 rotate-90" />
                                {article.videoLinks.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-[13px] text-gray-500 font-medium">
                            {new Date(article.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => handleOpenDetail(article)}
                              className="p-2 text-gray-400 hover:text-[#2B4C7E] hover:bg-blue-50 rounded-lg transition-all"
                              title="View Resource"
                            >
                              <EyeIcon className="h-4.5 w-4.5" />
                            </button>
                            {canEdit("knowledge_base") && (
                              <button
                                onClick={() => handleOpenEdit(article)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Edit Resource"
                              >
                                <PencilIcon className="h-4.5 w-4.5" />
                              </button>
                            )}
                            {canDelete("knowledge_base") && (
                              <button
                                onClick={() => handleDelete(article.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Resource"
                              >
                                <TrashIcon className="h-4.5 w-4.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredArticles.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <DocumentTextIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-900 font-bold">No articles found</p>
                <p className="text-gray-500 text-sm mt-1">Try a different search term.</p>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4 active:scale-[0.98] transition-transform"
                  onClick={() => handleOpenDetail(article)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider border uppercase ${getCategoryBadge(
                          article.category
                        )}`}
                      >
                        {article.kbCode}
                      </span>
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {article.title}
                      </h3>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit("knowledge_base") && (
                        <button
                          onClick={() => handleOpenEdit(article)}
                          className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete("knowledge_base") && (
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {article.content}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <span className="flex items-center">
                        <PhotoIcon className="h-3.5 w-3.5 mr-1" />
                        {article.images?.length || 0}
                      </span>
                      <span className="capitalize">{article.category}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <KnowledgeBaseFormModal
          mode={formMode}
          article={selectedArticle}
          onClose={() => {
            setShowFormModal(false);
            setSelectedArticle(null);
          }}
          onSuccess={loadArticles}
        />
      )}

      {/* Detail Modal */}
      {showDetail && detailArticle && (
        <KnowledgeBaseDetail
          article={detailArticle}
          onClose={() => {
            setShowDetail(false);
            setDetailArticle(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
