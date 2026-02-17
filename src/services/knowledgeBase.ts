import apiClient from "@/lib/axios";
import { ApiResponse, KBArticle, CreateKBArticleData, UpdateKBArticleData } from "@/types";

export const knowledgeBaseService = {
  getAll: async (params?: { category?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set("category", params.category);
    if (params?.search) queryParams.set("search", params.search);
    const query = queryParams.toString();
    const response = await apiClient.get<ApiResponse<KBArticle[]>>(
      `/knowledge-base${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<KBArticle>>(
      `/knowledge-base/${id}`
    );
    return response.data;
  },

  create: async (data: CreateKBArticleData) => {
    const response = await apiClient.post<ApiResponse<KBArticle>>(
      "/knowledge-base",
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateKBArticleData) => {
    const response = await apiClient.put<ApiResponse<KBArticle>>(
      `/knowledge-base/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/knowledge-base/${id}`
    );
    return response.data;
  },

  getNextCode: async (category: string) => {
    const response = await apiClient.get<ApiResponse<{ code: string }>>(
      `/knowledge-base/next-code?category=${category}`
    );
    return response.data;
  },

  uploadImages: async (articleId: string, files: FormData) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/knowledge-base/${articleId}/images`,
      files,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  deleteImage: async (articleId: string, imageId: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/knowledge-base/${articleId}/images?imageId=${imageId}`
    );
    return response.data;
  },
};
