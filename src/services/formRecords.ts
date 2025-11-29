import axios from "axios";
import { ApiResponse } from "@/types";

// Create a local client for internal API routes
const localApiClient = axios.create();

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
  "deutz-commissioning": "/api/forms/deutz-commissioning",
  "deutz-service": "/api/forms/deutz-service",
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
    const response = await localApiClient.get<ApiResponse<FormRecord[]>>(endpoint);
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

    // Construct the correct URL (e.g., /api/forms/deutz-service/123)
    const url = `${endpoint}/${recordId}`;

    const response = await localApiClient.delete<ApiResponse<any>>(url);
    return response.data;
  },
};
