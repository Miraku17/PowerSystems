"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  DocumentTextIcon,
  EyeIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarIcon,
  PrinterIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { TableSkeleton } from "@/components/Skeletons";
import ViewDeutzCommissioning from "@/components/ViewDeutzCommissioning";
import ViewDeutzService from "@/components/ViewDeutzService";
import ViewSubmersiblePumpCommissioning from "@/components/ViewSubmersiblePumpCommissioning";
import ViewSubmersiblePumpService from "@/components/ViewSubmersiblePumpService";
import ViewSubmersiblePumpTeardown from "@/components/ViewSubmersiblePumpTeardown";
import ViewElectricSurfacePumpCommissioning from "@/components/ViewElectricSurfacePumpCommissioning";
import ViewElectricSurfacePumpService from "@/components/ViewElectricSurfacePumpService";
import ViewEngineSurfacePumpService from "@/components/ViewEngineSurfacePumpService";
import ViewEngineSurfacePumpCommissioning from "@/components/ViewEngineSurfacePumpCommissioning";
import EditDeutzCommissioning from "@/components/EditDeutzCommissioning";
import EditDeutzService from "@/components/EditDeutzService";
import EditSubmersiblePumpCommissioning from "@/components/EditSubmersiblePumpCommissioning";
import EditSubmersiblePumpService from "@/components/EditSubmersiblePumpService";
import EditSubmersiblePumpTeardown from "@/components/EditSubmersiblePumpTeardown";
import EditElectricSurfacePumpCommissioning from "@/components/EditElectricSurfacePumpCommissioning";
import EditElectricSurfacePumpService from "@/components/EditElectricSurfacePumpService";
import EditEngineSurfacePumpService from "@/components/EditEngineSurfacePumpService";
import EditEngineSurfacePumpCommissioning from "@/components/EditEngineSurfacePumpCommissioning";
import ViewEngineTeardown from "@/components/ViewEngineTeardown";
import EditEngineTeardown from "@/components/EditEngineTeardown";
import ViewElectricSurfacePumpTeardown from "@/components/ViewElectricSurfacePumpTeardown";
import EditElectricSurfacePumpTeardown from "@/components/EditElectricSurfacePumpTeardown";
import ViewEngineInspectionReceiving from "@/components/ViewEngineInspectionReceiving";
import EditEngineInspectionReceiving from "@/components/EditEngineInspectionReceiving";
import ViewComponentsTeardownMeasuring from "@/components/ViewComponentsTeardownMeasuring";
import EditComponentsTeardownMeasuring from "@/components/EditComponentsTeardownMeasuring";
import ViewJobOrderRequest from "@/components/ViewJobOrderRequest";
import EditJobOrderRequest from "@/components/EditJobOrderRequest";
import ViewDailyTimeSheet from "@/components/ViewDailyTimeSheet";
import EditDailyTimeSheet from "@/components/EditDailyTimeSheet";
import ConfirmationModal from "@/components/ConfirmationModal";
import { usePermissions } from "@/hooks/usePermissions";

interface FormRecord {
  id: string;
  companyFormId: number;
  job_order?: string;
  data: Record<string, any>;
  dateCreated: string;
  dateUpdated: string;
  created_by?: string;
  approval?: {
    approval_id: string | null;
    approval_status: string;
    level1_status: string;
    level2_status: string;
    level1_remarks: string | null;
    level2_remarks: string | null;
  };
  companyForm: {
    id: string;
    name: string;
    formType: string;
  };
}

// Form types that use the centralized approvals table (not JO Request or DTS)
const SERVICE_REPORT_FORM_TYPES = [
  "deutz-commissioning", "deutz-service",
  "submersible-pump-service", "submersible-pump-commissioning", "submersible-pump-teardown",
  "engine-surface-pump-service", "engine-surface-pump-commissioning",
  "electric-surface-pump-service", "electric-surface-pump-commissioning", "electric-surface-pump-teardown",
  "engine-inspection-receiving", "engine-teardown", "components-teardown-measuring",
];

function ApprovalStatusBadge({ status }: { status?: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending_level_1: {
      label: "Pending Level 1",
      color: "bg-amber-50 text-amber-700 border border-amber-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    pending_level_2: {
      label: "Pending Level 2",
      color: "bg-orange-50 text-orange-700 border border-orange-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    pending_level_3: {
      label: "Pending Level 3",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    pending: {
      label: "Pending",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    approved: {
      label: "Approved",
      color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: <CheckCircleIcon className="h-3.5 w-3.5" />
    },
    rejected: {
      label: "Rejected",
      color: "bg-rose-50 text-rose-700 border border-rose-200",
      icon: <XCircleIcon className="h-3.5 w-3.5" />
    },
    "in-progress": {
      label: "In Progress",
      color: "bg-blue-50 text-blue-700 border border-blue-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    completed: {
      label: "Completed",
      color: "bg-green-50 text-green-700 border border-green-200",
      icon: <CheckCircleIcon className="h-3.5 w-3.5" />
    },
    closed: {
      label: "Closed",
      color: "bg-purple-50 text-purple-700 border border-purple-200",
      icon: <CheckCircleIcon className="h-3.5 w-3.5" />
    },
  };

  const statusConfig = config[status || ""] || {
    label: status || "Unknown",
    color: "bg-gray-50 text-gray-600 border border-gray-200",
    icon: <ClockIcon className="h-3.5 w-3.5" />
  };

  return (
    <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
      {statusConfig.icon}
      {statusConfig.label}
    </span>
  );
}

export default function FormRecordsPage() {
  const router = useRouter();
  const params = useParams();
  const formType = params.formType as string;
  const normalizedFormType = formType?.toLowerCase();

  const [records, setRecords] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<FormRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<FormRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FormRecord | null>(null);

  // Approval state
  const [approvalProcessing, setApprovalProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ approvalId: string; label: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [completeModal, setCompleteModal] = useState<{ approvalId: string; label: string } | null>(null);
  const [userPosition, setUserPosition] = useState<string | null>(null);

  // Check if this form type uses the centralized approvals table
  const isServiceReport = SERVICE_REPORT_FORM_TYPES.includes(normalizedFormType);

  // Date range filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Get permission check functions from auth store
  const canEditRecord = useAuthStore((state) => state.canEditRecord);
  const { canDelete: canDeletePermission, canWrite: canWritePermission } = usePermissions();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Form type to endpoint mapping (case-insensitive)
  const formTypeEndpoints: Record<string, { endpoint: string; name: string }> = {
    "job-order-request": { endpoint: "/forms/job-order-request", name: "Job Order Requests" },
    "deutz-commissioning": { endpoint: "/forms/deutz-commissioning", name: "Deutz Commissioning Report" },
    "deutz-service": { endpoint: "/forms/deutz-service", name: "Deutz Service Report" },
    "submersible-pump-commissioning": { endpoint: "/forms/submersible-pump-commissioning", name: "Submersible Pump Commissioning Report" },
    "submersible-pump-service": { endpoint: "/forms/submersible-pump-service", name: "Submersible Pump Service Report" },
    "submersible-pump-teardown": { endpoint: "/forms/submersible-pump-teardown", name: "Submersible Pump Teardown Report" },
    "electric-surface-pump-commissioning": { endpoint: "/forms/electric-surface-pump-commissioning", name: "Electric Driven Surface Pump Commissioning Report" },
    "electric-surface-pump-service": { endpoint: "/forms/electric-surface-pump-service", name: "Electric Driven Surface Pump Service Report" },
    "engine-surface-pump-service": { endpoint: "/forms/engine-surface-pump-service", name: "Engine Driven Surface Pump Service Report" },
    "engine-surface-pump-commissioning": { endpoint: "/forms/engine-surface-pump-commissioning", name: "Engine Driven Surface Pump Commissioning Report" },
    "engine-teardown": { endpoint: "/forms/engine-teardown", name: "Engine Teardown Report" },
    "electric-surface-pump-teardown": { endpoint: "/forms/electric-surface-pump-teardown", name: "Electric Driven Surface Pump Teardown Report" },
    "engine-inspection-receiving": { endpoint: "/forms/engine-inspection-receiving", name: "Engine Inspection / Receiving Report" },
    "components-teardown-measuring": { endpoint: "/forms/components-teardown-measuring", name: "Components Teardown Measuring Report" },
    "daily-time-sheet": { endpoint: "/forms/daily-time-sheet", name: "Daily Time Sheet" },
    "commission": { endpoint: "/forms/deutz-commissioning", name: "Deutz Commissioning Report" },
    "commissioning": { endpoint: "/forms/deutz-commissioning", name: "Deutz Commissioning Report" },
    "service": { endpoint: "/forms/deutz-service", name: "Deutz Service Report" },
  };

  useEffect(() => {
    loadRecords();
  }, [formType]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);

      const formConfig = formTypeEndpoints[normalizedFormType];

      if (!formConfig) {
        toast.error(`Unsupported form type: ${formType}`);
        setRecords([]);
        return;
      }

      const response = await apiClient.get(formConfig.endpoint);
      const recordsData = response.data?.data || response.data;
      setRecords(Array.isArray(recordsData) ? recordsData : []);
    } catch (error) {
      console.error("Error loading records:", error);
      toast.error("Failed to load form records");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user position for approval permissions
  useEffect(() => {
    if (isServiceReport) {
      apiClient.get("/auth/position").then((res) => {
        if (res.data?.success) {
          setUserPosition(res.data.positionName || null);
        }
      }).catch(() => {});
    }
  }, [isServiceReport]);

  // Check if user can approve at the current level for a given record
  const canApproveRecord = (record: FormRecord) => {
    if (!isServiceReport || !record.approval?.approval_id) return false;
    const { level1_status, level2_status, level1_remarks, level2_remarks } = record.approval;
    // Check if rejected
    if (level1_remarks?.startsWith("REJECTED:") || level2_remarks?.startsWith("REJECTED:")) return false;
    // Check if fully completed
    if (level1_status === "completed" && level2_status === "completed" && !level1_remarks?.startsWith("REJECTED:")) return false;

    if (userPosition === "Super Admin") return true;
    if (userPosition === "Admin 2" && level1_status === "pending") return true;
    if (userPosition === "Admin 1" && level1_status === "completed" && level2_status === "pending") return true;
    return false;
  };

  const handleApproveRecord = async (approvalId: string) => {
    setApprovalProcessing(approvalId);
    try {
      const response = await apiClient.post(`/approvals/${approvalId}`, { action: "approve" });
      if (response.data.success) {
        toast.success(response.data.message);
        loadRecords();
      } else {
        toast.error(response.data.message || "Failed to approve");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve");
    } finally {
      setApprovalProcessing(null);
    }
  };

  const handleRejectRecord = async () => {
    if (!rejectModal) return;
    setApprovalProcessing(rejectModal.approvalId);
    try {
      const response = await apiClient.post(`/approvals/${rejectModal.approvalId}`, {
        action: "reject",
        notes: rejectNotes,
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setRejectModal(null);
        setRejectNotes("");
        loadRecords();
      } else {
        toast.error(response.data.message || "Failed to reject");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject");
    } finally {
      setApprovalProcessing(null);
    }
  };

  const canCompleteRecord = (record: FormRecord) => {
    if (!isServiceReport || !record.approval?.approval_id) return false;
    const { level1_status, level2_status, level1_remarks, level2_remarks } = record.approval;
    if (level1_remarks?.startsWith("REJECTED:") || level2_remarks?.startsWith("REJECTED:")) return false;
    if (level1_status !== "completed" || level2_status !== "completed") return false;
    if (record.data?.approval_status !== "in-progress") return false;
    // Only the creator can mark as completed
    const currentUser = useAuthStore.getState().user;
    return currentUser?.id === record.created_by;
  };

  const handleCompleteRecord = async () => {
    if (!completeModal) return;
    setApprovalProcessing(completeModal.approvalId);
    try {
      const response = await apiClient.post(`/approvals/${completeModal.approvalId}`, { action: "complete" });
      if (response.data.success) {
        toast.success(response.data.message);
        setCompleteModal(null);
        loadRecords();
      } else {
        toast.error(response.data.message || "Failed to mark as completed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to mark as completed");
    } finally {
      setApprovalProcessing(null);
    }
  };

  const canCloseRecord = (record: FormRecord) => {
    if (!isServiceReport || !record.approval?.approval_id) return false;
    const { level1_status, level2_status, level1_remarks, level2_remarks } = record.approval;
    if (level1_remarks?.startsWith("REJECTED:") || level2_remarks?.startsWith("REJECTED:")) return false;
    if (level1_status !== "completed" || level2_status !== "completed") return false;
    if (record.data?.approval_status === "closed") return false;
    return userPosition === "Admin 2" || userPosition === "Super Admin";
  };

  const handleCloseRecord = async (approvalId: string) => {
    setApprovalProcessing(approvalId);
    try {
      const response = await apiClient.post(`/approvals/${approvalId}`, { action: "close" });
      if (response.data.success) {
        toast.success(response.data.message);
        loadRecords();
      } else {
        toast.error(response.data.message || "Failed to close");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to close");
    } finally {
      setApprovalProcessing(null);
    }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    const { id } = recordToDelete;

    const loadingToast = toast.loading("Deleting record...");

    try {
      const formConfig = formTypeEndpoints[normalizedFormType];

      if (!formConfig) {
        toast.error("Invalid form type", { id: loadingToast });
        return;
      }

      await apiClient.delete(`${formConfig.endpoint}/${id}`);

      toast.success("Record deleted successfully!", { id: loadingToast });
      setRecordToDelete(null);
      loadRecords(); // Refresh the list
    } catch (error) {
      toast.error("Failed to delete record.", { id: loadingToast });
      console.error("Error deleting record:", error);
    }
  };

  const handleBackToFolders = () => {
    router.push("/dashboard/records/folders");
    setSearchTerm("");
  };

  const handleExportPDF = async (recordId: string) => {
    const loadingToast = toast.loading("Generating PDF...");
    try {

      const formConfig = formTypeEndpoints[normalizedFormType];
      if (!formConfig) {
        toast.error("Invalid form type", { id: loadingToast });
        return;
      }

      // Map form type aliases to actual PDF route names
      const pdfFormTypeMap: Record<string, string> = {
        "job-order-request": "job-order-request",
        "deutz-commissioning": "deutz-commissioning",
        "commission": "deutz-commissioning",
        "commissioning": "deutz-commissioning",
        "deutz-service": "deutz-service",
        "service": "deutz-service",
        "submersible-pump-commissioning": "submersible-pump-commissioning",
        "submersible-pump-service": "submersible-pump-service",
        "submersible-pump-teardown": "submersible-pump-teardown",
        "electric-surface-pump-commissioning": "electric-surface-pump-commissioning",
        "electric-surface-pump-service": "electric-surface-pump-service",
        "engine-surface-pump-service": "engine-surface-pump-service",
        "engine-surface-pump-commissioning": "engine-surface-pump-commissioning",
        "engine-teardown": "engine-teardown",
        "electric-surface-pump-teardown": "electric-surface-pump-teardown",
        "engine-inspection-receiving": "engine-inspection-receiving",
        "components-teardown-measuring": "components-teardown-measuring",
        "daily-time-sheet": "daily-time-sheet",
      };

      const pdfFormType = pdfFormTypeMap[normalizedFormType];
      if (!pdfFormType) {
        toast.error("PDF export not available for this form type", { id: loadingToast });
        return;
      }

      // Determine PDF endpoint based on form type
      const pdfEndpoint = `/pdf/${pdfFormType}/${recordId}`;

      const response = await apiClient.get(pdfEndpoint, {
        responseType: "blob",
      });

      // Check if response is actually a PDF or an error
      if (response.data.type === "application/json") {
        // It's an error response, read it as JSON
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        toast.error(errorData.error || "Failed to generate PDF", { id: loadingToast });
        return;
      }

      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL);
      toast.success("PDF generated successfully!", { id: loadingToast });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);

      // Try to extract error message from response
      let errorMessage = "Failed to generate PDF";
      if (error.response?.data) {
        try {
          if (error.response.data instanceof Blob) {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } else {
            errorMessage = error.response.data.error || errorMessage;
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
      }

      toast.error(errorMessage, { id: loadingToast });
    }
  };

  const getJobOrder = (record: FormRecord): string => {
    if (record.job_order) return record.job_order;
    // Check for job order request specific field
    if (record.data?.shop_field_jo_number) return record.data.shop_field_jo_number;
    return "N/A";
  };

  const getCustomer = (record: FormRecord): string => {
    const data = record.data;
    return data?.full_customer_name || data?.customer_name || data?.customer || data?.basicInformation?.customer || data?.basicInformation?.customerName || "N/A";
  };

  const getSerialNo = (record: FormRecord): string => {
    const data = record.data;
    // For Job Order Request, show equipment_number in this column
    if (normalizedFormType === "job-order-request") {
      return data?.equipment_number || "N/A";
    }
    // For other forms, show equipment/engine serial numbers
    return data?.engine_serial_no || data?.engine_serial_number || data?.pump_serial_number || data?.pump_serial_no || data?.serial_no || data?.esn || data?.equipment_number || data?.engineInformation?.engineSerialNo || data?.engineInformation?.serialNo || "N/A";
  };

  const filteredRecords = records.filter((record) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const jobOrder = getJobOrder(record);
      const customer = getCustomer(record);
      const serialNo = getSerialNo(record);
      const jobOrderMatches = jobOrder !== "N/A" && jobOrder.toLowerCase().includes(searchLower);
      const customerMatches = customer !== "N/A" && customer.toLowerCase().includes(searchLower);
      const serialMatches = serialNo !== "N/A" && serialNo.toLowerCase().includes(searchLower);
      if (!jobOrderMatches && !customerMatches && !serialMatches) return false;
    }
    if (startDate || endDate) {
      const recordDate = new Date(record.dateCreated);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (recordDate > end) return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const formConfig = formTypeEndpoints[normalizedFormType];

  // Determine the serial number column label based on form type
  const serialNoLabel = normalizedFormType === "job-order-request" ? "Equipment No." : "Serial No.";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToFolders}
            className="p-2 text-gray-500 hover:text-[#2B4C7E] hover:bg-blue-50 rounded-full transition-colors"
            title="Back to Folders"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {formConfig?.name || "Form Records"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View and manage submitted records for this template.
            </p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm text-gray-600">
          Total Records: <span className="font-bold text-[#2B4C7E]">{records.length}</span>
        </div>
      </div>

      {/* Records Table View */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Job Order, Customer, or Serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-200">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-3 pr-2 py-1.5 text-sm border-none focus:ring-0 bg-transparent text-gray-600"
                />
              </div>
              <span className="text-gray-300">|</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-2 pr-3 py-1.5 text-sm border-none focus:ring-0 bg-transparent text-gray-600"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Clear dates"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table/Card View */}
        {isLoading ? (
          <div className="p-6"><TableSkeleton rows={5} /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No records found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or date filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Order</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{serialNoLabel}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Approval Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getJobOrder(record)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getCustomer(record)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{getSerialNo(record)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                          {new Date(record.dateCreated).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <ApprovalStatusBadge status={record.data?.approval_status} />
                        {record.data?.approval_status === "in-progress" && (
                          <p className="text-[10px] text-gray-400 mt-1">Both levels approved</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canEditRecord(record.created_by) && !((record.data?.approval_status === "completed" || record.data?.approval_status === "closed" || record.data?.approval_status === "approved") && !canWritePermission("form_records")) && (
                            <button
                              onClick={() => setEditingRecord(record)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit Record"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleExportPDF(record.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </button>
                          {canApproveRecord(record) && record.approval?.approval_id && (
                            <>
                              <button
                                onClick={() => handleApproveRecord(record.approval!.approval_id!)}
                                disabled={approvalProcessing === record.approval!.approval_id}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setRejectModal({
                                  approvalId: record.approval!.approval_id!,
                                  label: getJobOrder(record),
                                })}
                                disabled={approvalProcessing === record.approval!.approval_id}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {canCompleteRecord(record) && record.approval?.approval_id && (
                            <button
                              onClick={() => setCompleteModal({ approvalId: record.approval!.approval_id!, label: record.data?.job_order_no || record.data?.job_order || normalizedFormType })}
                              disabled={approvalProcessing === record.approval!.approval_id}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Mark as Completed"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canCloseRecord(record) && record.approval?.approval_id && (
                            <button
                              onClick={() => handleCloseRecord(record.approval!.approval_id!)}
                              disabled={approvalProcessing === record.approval!.approval_id}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Close"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDeletePermission("form_records") && (
                            <button
                              onClick={() => setRecordToDelete(record)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden bg-gray-50/50 p-4 space-y-4">
              {paginatedRecords.map((record) => (
                <div key={record.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Job Order</p>
                      <p className="text-lg font-bold text-gray-900">{getJobOrder(record)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                      <p className="text-sm font-medium text-gray-700 flex items-center justify-end">
                         <CalendarIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                         {new Date(record.dateCreated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                      <p className="text-sm text-gray-800 font-medium line-clamp-1">{getCustomer(record)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{serialNoLabel}</p>
                      <p className="text-sm text-gray-600 font-mono">{getSerialNo(record)}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Approval Status</p>
                    <ApprovalStatusBadge status={record.data?.approval_status} />
                    {record.data?.approval_status === "in-progress" && (
                      <p className="text-[10px] text-gray-400 mt-1">Both levels approved</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                     <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <EyeIcon className="h-4 w-4 mr-1.5" />
                          View
                        </button>
                     </div>
                     <div className="flex gap-1">
                        {canApproveRecord(record) && record.approval?.approval_id && (
                          <>
                            <button
                              onClick={() => handleApproveRecord(record.approval!.approval_id!)}
                              disabled={approvalProcessing === record.approval!.approval_id}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setRejectModal({
                                approvalId: record.approval!.approval_id!,
                                label: getJobOrder(record),
                              })}
                              disabled={approvalProcessing === record.approval!.approval_id}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {canCompleteRecord(record) && record.approval?.approval_id && (
                          <button
                            onClick={() => setCompleteModal({ approvalId: record.approval!.approval_id!, label: record.data?.job_order_no || record.data?.job_order || normalizedFormType })}
                            disabled={approvalProcessing === record.approval!.approval_id}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Mark as Completed"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canCloseRecord(record) && record.approval?.approval_id && (
                          <button
                            onClick={() => handleCloseRecord(record.approval!.approval_id!)}
                            disabled={approvalProcessing === record.approval!.approval_id}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Close"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canEditRecord(record.created_by) && !((record.data?.approval_status === "completed" || record.data?.approval_status === "closed" || record.data?.approval_status === "approved") && !canWritePermission("form_records")) && (
                          <button
                            onClick={() => setEditingRecord(record)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleExportPDF(record.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="PDF"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                        {canDeletePermission("form_records") && (
                          <button
                            onClick={() => setRecordToDelete(record)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredRecords.length)}</span> of <span className="font-medium">{filteredRecords.length}</span> results
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Deletion */}
      {recordToDelete && (
        <ConfirmationModal
          isOpen={!!recordToDelete}
          title="Delete Record"
          message={`Are you sure you want to delete this record? This action cannot be undone.`}
          onConfirm={handleDeleteRecord}
          onClose={() => setRecordToDelete(null)}
          confirmText="Delete"
          type="danger"
        />
      )}

      {/* View Modal */}
      {selectedRecord && normalizedFormType === "deutz-commissioning" && (
        <ViewDeutzCommissioning
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {selectedRecord && normalizedFormType === "deutz-service" && (
        <ViewDeutzService
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {selectedRecord && normalizedFormType === "service" && (
        <ViewDeutzService
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {selectedRecord && normalizedFormType === "commission" && (
        <ViewDeutzCommissioning
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {selectedRecord && normalizedFormType === "commissioning" && (
        <ViewDeutzCommissioning
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {/* Edit Modals */}
      {editingRecord && normalizedFormType === "deutz-commissioning" && (
        <EditDeutzCommissioning
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {editingRecord && normalizedFormType === "deutz-service" && (
        <EditDeutzService
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {editingRecord && normalizedFormType === "service" && (
        <EditDeutzService
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {editingRecord && normalizedFormType === "commission" && (
        <EditDeutzCommissioning
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {editingRecord && normalizedFormType === "commissioning" && (
        <EditDeutzCommissioning
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "submersible-pump-commissioning" && (
        <ViewSubmersiblePumpCommissioning
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "submersible-pump-commissioning" && (
        <EditSubmersiblePumpCommissioning
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "submersible-pump-service" && (
        <ViewSubmersiblePumpService
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "submersible-pump-service" && (
        <EditSubmersiblePumpService
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "submersible-pump-teardown" && (
        <ViewSubmersiblePumpTeardown
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "submersible-pump-teardown" && (
        <EditSubmersiblePumpTeardown
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "electric-surface-pump-commissioning" && (
        <ViewElectricSurfacePumpCommissioning
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "electric-surface-pump-commissioning" && (
        <EditElectricSurfacePumpCommissioning
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "electric-surface-pump-service" && (
        <ViewElectricSurfacePumpService
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "electric-surface-pump-service" && (
        <EditElectricSurfacePumpService
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "engine-surface-pump-service" && (
        <ViewEngineSurfacePumpService
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "engine-surface-pump-service" && (
        <EditEngineSurfacePumpService
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "engine-surface-pump-commissioning" && (
        <ViewEngineSurfacePumpCommissioning
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "engine-surface-pump-commissioning" && (
        <EditEngineSurfacePumpCommissioning
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "engine-teardown" && (
        <ViewEngineTeardown
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "engine-teardown" && (
        <EditEngineTeardown
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "electric-surface-pump-teardown" && (
        <ViewElectricSurfacePumpTeardown
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "electric-surface-pump-teardown" && (
        <EditElectricSurfacePumpTeardown
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "engine-inspection-receiving" && (
        <ViewEngineInspectionReceiving
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "engine-inspection-receiving" && (
        <EditEngineInspectionReceiving
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "components-teardown-measuring" && (
        <ViewComponentsTeardownMeasuring
          data={selectedRecord.data}
          recordId={selectedRecord.id}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {editingRecord && normalizedFormType === "components-teardown-measuring" && (
        <EditComponentsTeardownMeasuring
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "job-order-request" && (
        <ViewJobOrderRequest
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "job-order-request" && (
        <EditJobOrderRequest
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {selectedRecord && normalizedFormType === "daily-time-sheet" && (
        <ViewDailyTimeSheet
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {editingRecord && normalizedFormType === "daily-time-sheet" && (
        <EditDailyTimeSheet
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {/* Reject Modal for Service Report Approvals */}
      {rejectModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRejectModal(null);
              setRejectNotes("");
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Reject Service Report</h3>
              </div>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectNotes("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Rejecting <span className="font-semibold">{rejectModal.label}</span>. Please provide a reason:
              </p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectNotes("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRecord}
                disabled={approvalProcessing === rejectModal.approvalId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {approvalProcessing === rejectModal.approvalId ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {completeModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompleteModal(null);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100">
                  <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Mark as Completed</h3>
              </div>
              <button
                onClick={() => setCompleteModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                Are you sure you want to mark <span className="font-semibold">{completeModal.label}</span> as completed?
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setCompleteModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteRecord}
                disabled={approvalProcessing === completeModal.approvalId}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {approvalProcessing === completeModal.approvalId ? "Completing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
