import apiClient from "@/lib/axios";
import { User, ApiResponse } from "@/types";

export const userService = {
  // Get all users
  getAll: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get<ApiResponse<User[]>>("/users");
    return response.data;
  },

  // Get user by ID
  getById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },
};
