import apiClient from "@/lib/axios";
import { Company, ApiResponse, CreateCompanyData } from "@/types";

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
  create: async (data: CreateCompanyData) => {
    const formData = new FormData();

    // Append all text fields
    Object.keys(data).forEach((key) => {
      if (
        key !== "image" &&
        data[key as keyof CreateCompanyData] !== undefined
      ) {
        formData.append(key, String(data[key as keyof CreateCompanyData]));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append("image", data.image);
    }

    const response = await apiClient.post<ApiResponse<Company>>(
      "/companies",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Update company
  update: async (id: string, data: Partial<CreateCompanyData>) => {
    const formData = new FormData();

    // Append all text fields
    Object.keys(data).forEach((key) => {
      if (
        key !== "image" &&
        data[key as keyof CreateCompanyData] !== undefined
      ) {
        formData.append(key, String(data[key as keyof CreateCompanyData]));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append("image", data.image);
    }

    const response = await apiClient.put<ApiResponse<Company>>(
      `/companies/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Delete company
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/companies/${id}`
    );
    return response.data;
  },
};
