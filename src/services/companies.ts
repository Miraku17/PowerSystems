import apiClient from "@/lib/axios";
import { Company, ApiResponse } from "@/types";

export const companyService = {
  // Get all companies
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Company[]>>("/companies");
    return response.data;
  },

  // Get company by ID
  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Company>>(
      `/companies/${id}`
    );
    return response.data;
  },

  // Create new company
  create: async (data: Omit<Company, "id" | "createdAt" | "updatedAt">) => {
    const response = await apiClient.post<ApiResponse<Company>>(
      "/companies",
      data
    );
    return response.data;
  },

  // Update company
  update: async (id: string, data: Partial<Company>) => {
    const response = await apiClient.put<ApiResponse<Company>>(
      `/companies/${id}`,
      data
    );
    return response.data;
  },

  // Delete company
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/companies/${id}`);
    return response.data;
  },
};
