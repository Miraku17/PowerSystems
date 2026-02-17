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
} from "@heroicons/react/24/outline";
import { TableSkeleton } from "./Skeletons";
import ConfirmationModal from "./ConfirmationModal";
import KnowledgeBaseFormModal from "./KnowledgeBaseFormModal";
import KnowledgeBaseDetail from "./KnowledgeBaseDetail";
import { usePermissions } from "@/hooks/usePermissions";

const CATEGORY_TABS = [
  { label: "All", value: "" },
  { label: "Engine", value: "engine" },
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search articles, KB codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 ease-in-out sm:text-sm"
            />
          </div>
          {canWrite("knowledge_base") && (
            <button
              onClick={handleOpenCreate}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-[#2B4C7E] hover:bg-[#1A2F4F] shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Article
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategoryFilter(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === tab.value
                  ? "bg-[#2B4C7E] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      KB Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Images
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <DocumentTextIcon className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 text-lg font-medium">
                            No articles found
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            Try adjusting your search or create a new article.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((article) => (
                      <tr
                        key={article.id}
                        className="hover:bg-gray-50/50 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryBadge(
                              article.category
                            )}`}
                          >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {article.kbCode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleOpenDetail(article)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                          >
                            {article.title}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 capitalize">
                            {article.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center text-sm text-gray-500">
                            <PhotoIcon className="h-4 w-4 mr-1" />
                            {article.images?.length || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => handleOpenDetail(article)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {canEdit("knowledge_base") && (
                              <button
                                onClick={() => handleOpenEdit(article)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete("knowledge_base") && (
                              <button
                                onClick={() => handleDelete(article.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
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
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredArticles.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No articles found</p>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryBadge(
                          article.category
                        )}`}
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {article.kbCode}
                      </span>
                      <h3
                        onClick={() => handleOpenDetail(article)}
                        className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {article.title}
                      </h3>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleOpenDetail(article)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {canEdit("knowledge_base") && (
                        <button
                          onClick={() => handleOpenEdit(article)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      )}
                      {canDelete("knowledge_base") && (
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 line-clamp-2">
                    {article.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="capitalize">{article.category}</span>
                    <span className="flex items-center">
                      <PhotoIcon className="h-3.5 w-3.5 mr-0.5" />
                      {article.images?.length || 0} images
                    </span>
                    <span>
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
