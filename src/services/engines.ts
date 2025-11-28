import axios from "axios";
import { ApiResponse, CreateEngineData, Engine } from "@/types";

const localApiClient = axios.create();

export const engineService = {
  // Get all engines
  getAll: async () => {
    const response = await localApiClient.get<ApiResponse<Engine[]>>("/api/engines");
    return response.data;
  },

  // Get engine by ID
  getById: async (id: string) => {
    const response = await localApiClient.get<ApiResponse<Engine>>(`/api/engines/${id}`);
    return response.data;
  },

  // Create new engine
  create: async (data: CreateEngineData) => {
    const formData = new FormData();

    // Append all fields
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof CreateEngineData];
      if (key !== "image" && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append("image", data.image);
    }

    const response = await localApiClient.post<ApiResponse<Engine>>(
      "/api/engines",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Update engine
  update: async (id: string, data: Partial<CreateEngineData>) => {
    const formData = new FormData();

    // Append all fields
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof CreateEngineData];
      if (key !== "image" && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Append image if provided
    if (data.image) {
      formData.append("image", data.image);
    }

    const response = await localApiClient.put<ApiResponse<Engine>>(
      `/api/engines/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Delete engine
  delete: async (id: string) => {
    const response = await localApiClient.delete<ApiResponse<void>>(`/api/engines/${id}`);
    return response.data;
  },
};
