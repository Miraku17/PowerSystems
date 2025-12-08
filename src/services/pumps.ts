import apiClient from "@/lib/axios";
import { ApiResponse } from "@/types";

export interface Pump {
  id: string;
  engineModel: string;
  engineSerialNumber: string;
  kw: string;
  pumpModel: string;
  pumpSerialNumber: string;
  rpm: string;
  productNumber: string;
  hmax: string;
  qmax: string;
  runningHours: string;
  imageUrl: string | null;
  company: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface CreatePumpData {
  companyId: string;
  engineModel?: string;
  engineSerialNumber?: string;
  kw?: string;
  pumpModel: string;
  pumpSerialNumber: string;
  rpm?: string;
  productNumber?: string;
  hmax?: string;
  qmax?: string;
  runningHours?: string;
  image?: File;
}

export const pumpService = {
  // Get all pumps
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Pump[]>>("/pumps");
    return response.data;
  },

  // Get pump by ID
  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Pump>>(`/pumps/${id}`);
    return response.data;
  },

  // Create new pump
  create: async (data: CreatePumpData) => {
    const formData = new FormData();

    // Append all fields
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof CreatePumpData];
      if (key !== "image" && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append("image", data.image);
    }

    const response = await apiClient.post<ApiResponse<Pump>>(
      "/pumps",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Update pump
  update: async (id: string, data: Partial<CreatePumpData>) => {
    const formData = new FormData();

    // Append all fields
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof CreatePumpData];
      if (key !== "image" && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append("image", data.image);
    }

    const response = await apiClient.put<ApiResponse<Pump>>(
      `/pumps/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Delete pump
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/pumps/${id}`);
    return response.data;
  },
};
