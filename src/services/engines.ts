import apiClient from "@/lib/axios";
import { ApiResponse, Engine } from "@/types";

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
  create: async (
    data: Omit<Engine, "id" | "createdAt" | "updatedAt">
  ) => {
    const response = await apiClient.post<ApiResponse<Engine>>(
      "/engines",
      data
    );
    return response.data;
  },

  // Update engine
  update: async (id: string, data: Partial<Engine>) => {
    const response = await apiClient.put<ApiResponse<Engine>>(
      `/engines/${id}`,
      data
    );
    return response.data;
  },

  // Delete engine
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/engines/${id}`);
    return response.data;
  },
};
