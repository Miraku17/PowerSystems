import apiClient from "@/lib/axios";
import { CompanyForm, ApiResponse } from "@/types";

export const companyFormService = {
  // Get all company forms
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<CompanyForm[]>>(
      "/company-forms"
    );
    return response.data;
  },

  // Get company form by ID
  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<CompanyForm>>(
      `/company-forms/${id}`
    );
    return response.data;
  },

  // Create new company form
  create: async (data: Omit<CompanyForm, "id" | "createdAt" | "updatedAt">) => {
    const response = await apiClient.post<ApiResponse<CompanyForm>>(
      "/company-forms",
      data
    );
    return response.data;
  },

  // Update company form
  update: async (id: string, data: Partial<CompanyForm>) => {
    const response = await apiClient.patch<ApiResponse<CompanyForm>>(
      `/company-forms/${id}`,
      data
    );
    return response.data;
  },

  // Delete company form
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/company-forms/${id}`
    );
    return response.data;
  },
};
