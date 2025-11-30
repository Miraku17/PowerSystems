import apiClient from "@/lib/axios";
import { ApiResponse } from "@/types";

export interface FormRecordSubmission {
  jobOrder?: string;
  companyFormId: number;
  data: Record<string, any>;
}

export interface FormRecord {
  id: string;
  jobOrder?: string;
  companyFormId: number;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Map form types to their respective endpoints
const formTypeEndpoints: Record<string, string> = {
  "deutz-commissioning": "/forms/deutz-commissioning",
  "deutz-service": "/forms/deutz-service",
};

export const formRecordService = {
  // Get all records for a specific form type
  getAllByFormType: async (formType: string) => {
    // Normalize form type to lowercase
    const normalizedFormType = formType.toLowerCase();
    const endpoint = formTypeEndpoints[normalizedFormType];
    if (!endpoint) {
      throw new Error(`Unsupported form type: ${formType}`);
    }
    const response = await apiClient.get<ApiResponse<FormRecord[]>>(endpoint);
    return response.data;
  },

  // Create a new form record
  create: async (formType: string, data: Record<string, any>) => {
    // Normalize form type to lowercase
    const normalizedFormType = formType.toLowerCase();
    const endpoint = formTypeEndpoints[normalizedFormType];

    if (!endpoint) {
      throw new Error(`Unsupported form type: ${formType}`);
    }

    // Flatten nested section data if present
    const flattenedData: Record<string, any> = {};
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key] !== null) {
        // If it's an object (section), merge its properties into flattenedData
        Object.assign(flattenedData, data[key]);
      } else {
        // Otherwise, add the key-value pair directly
        flattenedData[key] = data[key];
      }
    });

    const response = await apiClient.post<ApiResponse<any>>(endpoint, flattenedData);
    return response.data;
  },

  // Note: Update method is not implemented yet as it requires
  // form-type-specific routes. They will be added when needed.
  update: async (id: string, data: Partial<FormRecordSubmission>) => {
    throw new Error("Update functionality not yet implemented for form records");
  },

  // Delete a record by its ID for a specific form type
  deleteRecord: async (formType: string, recordId: string) => {
    // Normalize form type to lowercase
    const normalizedFormType = formType.toLowerCase();
    const endpoint = formTypeEndpoints[normalizedFormType];

    if (!endpoint) {
      throw new Error(`Unsupported form type for deletion: ${formType}`);
    }

    // Construct the correct URL (e.g., /forms/deutz-service/123)
    const url = `${endpoint}/${recordId}`;

    const response = await apiClient.delete<ApiResponse<any>>(url);
    return response.data;
  },
};
