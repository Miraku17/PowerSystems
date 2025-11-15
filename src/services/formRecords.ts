import apiClient from "@/lib/axios";
import { ApiResponse } from "@/types";

export interface FormRecordSubmission {
  companyFormId: number;
  data: Record<string, any>;
}

export interface FormRecord {
  id: string;
  companyFormId: number;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const formRecordService = {
  // Submit a new form record
  create: async (data: FormRecordSubmission) => {
    const response = await apiClient.post<ApiResponse<FormRecord>>(
      "/forms",
      data
    );
    return response.data;
  },

  // Get all form records
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<FormRecord[]>>("/forms");
    return response.data;
  },

  // Get form record by ID
  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<FormRecord>>(
      `/forms/${id}`
    );
    return response.data;
  },

  // Update form record
  update: async (id: string, data: Partial<FormRecordSubmission>) => {
    const response = await apiClient.patch<ApiResponse<FormRecord>>(
      `/forms/${id}`,
      data
    );
    return response.data;
  },

  // Delete form record
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/forms/${id}`);
    return response.data;
  },
};
