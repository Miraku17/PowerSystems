import axios from "axios";
import { ApiResponse, Customer } from "@/types";

// Create a local client that doesn't use the external base URL
const localApiClient = axios.create();

export const customerService = {
  // Get all customers
  getAll: async () => {
    const response = await localApiClient.get<ApiResponse<Customer[]>>("/api/customers");
    return response.data;
  },

  // Get customer by ID
  getById: async (id: string) => {
    const response = await localApiClient.get<ApiResponse<Customer>>(
      `/api/customers/${id}`
    );
    return response.data;
  },

  // Create new customer
  create: async (data: Omit<Customer, "id" | "createdAt" | "updatedAt">) => {
    const response = await localApiClient.post<ApiResponse<Customer>>(
      "/api/customers",
      data
    );
    return response.data;
  },

  // Update customer
  update: async (id: string, data: Partial<Customer>) => {
    const response = await localApiClient.put<ApiResponse<Customer>>(
      `/api/customers/${id}`,
      data
    );
    return response.data;
  },

  // Delete customer
  delete: async (id: string) => {
    const response = await localApiClient.delete<ApiResponse<void>>(`/api/customers/${id}`);
    return response.data;
  },
};
