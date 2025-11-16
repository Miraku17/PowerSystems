import apiClient from "@/lib/axios";
import { ApiResponse, Engine, CreateEngineData } from "@/types";

export const engineService = {
  // Get all engines
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Engine[]>>("/engines");
    return response.data;
  },

  // Get engine by ID
  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Engine>>(`/engines/${id}`);
    return response.data;
  },

  // Create new engine
  create: async (data: CreateEngineData) => {
    const formData = new FormData();

    // Append all text fields
    Object.keys(data).forEach((key) => {
      if (key !== 'image' && data[key as keyof CreateEngineData] !== undefined) {
        formData.append(key, String(data[key as keyof CreateEngineData]));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await apiClient.post<ApiResponse<Engine>>(
      "/engines",
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Update engine
  update: async (id: string, data: Partial<CreateEngineData>) => {
    const formData = new FormData();

    // Append all text fields
    Object.keys(data).forEach((key) => {
      if (key !== 'image' && data[key as keyof CreateEngineData] !== undefined) {
        formData.append(key, String(data[key as keyof CreateEngineData]));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await apiClient.put<ApiResponse<Engine>>(
      `/engines/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Delete engine
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/engines/${id}`);
    return response.data;
  },
};
