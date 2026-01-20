import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

export interface WedaCommissioningReport {
  id: string;
  reporting_person_name: string;
  phone_number: string;
  equipment_name: string;
  running_hours: number | null;
  customer_name: string;
  contact_person: string;
  address: string;
  email_address: string;
  commissioning_location: string;
  job_order_no: string;
  commissioning_date: string | null;
  weda_pump_model: string;
  pump_serial_no: string;
  commissioning_no: string;
  equipment_manufacturer: string;
  pump_no: string;
  pump_type: string;
  rated_shaft_power_kw: number | null;
  rated_voltage: string;
  rated_current_amps: number | null;
  phase: string;
  frequency_hz: number | null;
  oil_type: string;
  maximum_height_m: number | null;
  maximum_capacity: string;
  pump_weight: string;
  summary: string;
  inspector: string;
  comments_action: string;
  attending_technician: string;
  attending_technician_signature: string | null;
  approved_by: string;
  approved_by_signature: string | null;
  acknowledged_by: string;
  acknowledged_by_signature: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  form_id: string;
  file_url: string;
  file_title: string;
  created_at: string;
}

// Fetch all WEDA commissioning reports
export function useWedaCommissioningReports() {
  return useQuery({
    queryKey: ["weda-commissioning-reports"],
    queryFn: async () => {
      const response = await apiClient.get("/forms/weda-commissioning");
      return response.data;
    },
  });
}

// Fetch single WEDA commissioning report by ID
export function useWedaCommissioningReport(id: string | null) {
  return useQuery({
    queryKey: ["weda-commissioning-report", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/forms/weda-commissioning/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create WEDA commissioning report
export function useCreateWedaCommissioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post("/forms/weda-commissioning", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weda-commissioning-reports"] });
    },
  });
}

// Update WEDA commissioning report
export function useUpdateWedaCommissioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/forms/weda-commissioning?id=${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["weda-commissioning-reports"] });
      queryClient.invalidateQueries({ queryKey: ["weda-commissioning-report", variables.id] });
    },
  });
}

// Delete WEDA commissioning report
export function useDeleteWedaCommissioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/forms/weda-commissioning/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weda-commissioning-reports"] });
    },
  });
}

// Update attachments
export function useUpdateWedaCommissioningAttachments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post("/forms/weda-commissioning/attachments", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      const formId = variables.get("form_id") as string;
      queryClient.invalidateQueries({ queryKey: ["weda-commissioning-report", formId] });
    },
  });
}
