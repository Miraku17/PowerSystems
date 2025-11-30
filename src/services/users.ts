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

  // Create a new user
  create: async (userData: Omit<User, "id">): Promise<ApiResponse<User>> => {
    const response = await apiClient.post<ApiResponse<User>>("/users", userData);
    return response.data;
  },

  // Update a user
  update: async (id: string, userData: Partial<Omit<User, "id">>): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data;
  },

  // Delete a user
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/users/${id}`);
    return response.data;
  },
};
