import apiClient from "@/lib/axios";
import { ApiResponse, Customer } from "@/types";

export const customerService = {
  // Get all customers
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Customer[]>>("/customers");
    return response.data;
  },

  // Get customer by ID
  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Customer>>(
      `/customers/${id}`
    );
    return response.data;
  },

  // Create new customer
  create: async (data: Omit<Customer, "id" | "createdAt" | "updatedAt">) => {
    const response = await apiClient.post<ApiResponse<Customer>>(
      "/customers",
      data
    );
    return response.data;
  },

  // Update customer
  update: async (id: string, data: Partial<Customer>) => {
    const response = await apiClient.put<ApiResponse<Customer>>(
      `/customers/${id}`,
      data
    );
    return response.data;
  },

  // Delete customer
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/customers/${id}`);
    return response.data;
  },
};
