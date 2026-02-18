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
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { TableSkeleton } from "@/components/Skeletons";
import dynamic from "next/dynamic";
import ConfirmationModal from "@/components/ConfirmationModal";

const modalLoading = () => <div className="py-8 text-center text-gray-400">Loading...</div>;

const ViewDeutzCommissioning = dynamic(() => import("@/components/ViewDeutzCommissioning"), { loading: modalLoading });
const ViewDeutzService = dynamic(() => import("@/components/ViewDeutzService"), { loading: modalLoading });
const ViewSubmersiblePumpCommissioning = dynamic(() => import("@/components/ViewSubmersiblePumpCommissioning"), { loading: modalLoading });
const ViewSubmersiblePumpService = dynamic(() => import("@/components/ViewSubmersiblePumpService"), { loading: modalLoading });
const ViewSubmersiblePumpTeardown = dynamic(() => import("@/components/ViewSubmersiblePumpTeardown"), { loading: modalLoading });
const ViewElectricSurfacePumpCommissioning = dynamic(() => import("@/components/ViewElectricSurfacePumpCommissioning"), { loading: modalLoading });
const ViewElectricSurfacePumpService = dynamic(() => import("@/components/ViewElectricSurfacePumpService"), { loading: modalLoading });
const ViewEngineSurfacePumpService = dynamic(() => import("@/components/ViewEngineSurfacePumpService"), { loading: modalLoading });
const ViewEngineSurfacePumpCommissioning = dynamic(() => import("@/components/ViewEngineSurfacePumpCommissioning"), { loading: modalLoading });
const EditDeutzCommissioning = dynamic(() => import("@/components/EditDeutzCommissioning"), { loading: modalLoading });
const EditDeutzService = dynamic(() => import("@/components/EditDeutzService"), { loading: modalLoading });
const EditSubmersiblePumpCommissioning = dynamic(() => import("@/components/EditSubmersiblePumpCommissioning"), { loading: modalLoading });
const EditSubmersiblePumpService = dynamic(() => import("@/components/EditSubmersiblePumpService"), { loading: modalLoading });
const EditSubmersiblePumpTeardown = dynamic(() => import("@/components/EditSubmersiblePumpTeardown"), { loading: modalLoading });
const EditElectricSurfacePumpCommissioning = dynamic(() => import("@/components/EditElectricSurfacePumpCommissioning"), { loading: modalLoading });
const EditElectricSurfacePumpService = dynamic(() => import("@/components/EditElectricSurfacePumpService"), { loading: modalLoading });
const EditEngineSurfacePumpService = dynamic(() => import("@/components/EditEngineSurfacePumpService"), { loading: modalLoading });
const EditEngineSurfacePumpCommissioning = dynamic(() => import("@/components/EditEngineSurfacePumpCommissioning"), { loading: modalLoading });
const ViewEngineTeardown = dynamic(() => import("@/components/ViewEngineTeardown"), { loading: modalLoading });
const EditEngineTeardown = dynamic(() => import("@/components/EditEngineTeardown"), { loading: modalLoading });
const ViewElectricSurfacePumpTeardown = dynamic(() => import("@/components/ViewElectricSurfacePumpTeardown"), { loading: modalLoading });
const EditElectricSurfacePumpTeardown = dynamic(() => import("@/components/EditElectricSurfacePumpTeardown"), { loading: modalLoading });
const ViewEngineInspectionReceiving = dynamic(() => import("@/components/ViewEngineInspectionReceiving"), { loading: modalLoading });
const EditEngineInspectionReceiving = dynamic(() => import("@/components/EditEngineInspectionReceiving"), { loading: modalLoading });
const ViewComponentsTeardownMeasuring = dynamic(() => import("@/components/ViewComponentsTeardownMeasuring"), { loading: modalLoading });
const EditComponentsTeardownMeasuring = dynamic(() => import("@/components/EditComponentsTeardownMeasuring"), { loading: modalLoading });
const ViewJobOrderRequest = dynamic(() => import("@/components/ViewJobOrderRequest"), { loading: modalLoading });
const EditJobOrderRequest = dynamic(() => import("@/components/EditJobOrderRequest"), { loading: modalLoading });
const ViewDailyTimeSheet = dynamic(() => import("@/components/ViewDailyTimeSheet"), { loading: modalLoading });
const EditDailyTimeSheet = dynamic(() => import("@/components/EditDailyTimeSheet"), { loading: modalLoading });
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
      label: "Pending",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    pending_level_2: {
      label: "Pending",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    pending_level_3: {
      label: "Pending",
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
    "In-Progress": {
      label: "In-Progress",
      color: "bg-blue-50 text-blue-700 border border-blue-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    "Pending": {
      label: "Pending",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      icon: <ClockIcon className="h-3.5 w-3.5" />
    },
    "Close": {
      label: "Close",
      color: "bg-purple-50 text-purple-700 border border-purple-200",
      icon: <CheckCircleIcon className="h-3.5 w-3.5" />
    },
    "Cancelled": {
      label: "Cancelled",
      color: "bg-rose-50 text-rose-700 border border-rose-200",
      icon: <XCircleIcon className="h-3.5 w-3.5" />
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

  // Check if this form type uses the centralized approvals table
  const isServiceReport = SERVICE_REPORT_FORM_TYPES.includes(normalizedFormType);
  const isJORequest = normalizedFormType === "job-order-request";
  const isDTS = normalizedFormType === "daily-time-sheet";

  // Status dropdown state (for service reports and JO requests)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [statusConfirmModal, setStatusConfirmModal] = useState<{ approvalId: string; newStatus: string; jobOrder: string; isJORequest?: boolean; isDTS?: boolean; recordId?: string } | null>(null);

  const { canEdit: canEditPermission } = usePermissions();
  const canChangeStatus = isServiceReport && canEditPermission("approvals");
  const canChangeJOStatus = isJORequest && canEditPermission("approvals");
  const canChangeDTSStatus = isDTS && canEditPermission("approvals");

  // Date range filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

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

  const STATUS_OPTIONS = ["In-Progress", "Pending", "Close", "Cancelled"];

  const getStatusSelectClass = (status: string) => {
    switch (status) {
      case "In-Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Close":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleStatusChangeRequest = (record: FormRecord, newStatus: string) => {
    const currentStatus = record.approval?.approval_status;
    if (newStatus === currentStatus) return;
    setStatusConfirmModal({
      approvalId: record.approval!.approval_id!,
      newStatus,
      jobOrder: getJobOrder(record),
    });
  };

  const handleJOStatusChangeRequest = (record: FormRecord, newStatus: string) => {
    const currentStatus = record.data?.status;
    if (newStatus === currentStatus) return;
    setStatusConfirmModal({
      approvalId: record.id,
      newStatus,
      jobOrder: getJobOrder(record),
      isJORequest: true,
      recordId: record.id,
    });
  };

  const handleDTSStatusChangeRequest = (record: FormRecord, newStatus: string) => {
    const currentStatus = record.data?.status;
    if (newStatus === currentStatus) return;
    setStatusConfirmModal({
      approvalId: record.id,
      newStatus,
      jobOrder: getJobOrder(record),
      isDTS: true,
      recordId: record.id,
    });
  };

  const handleStatusChangeConfirm = async () => {
    if (!statusConfirmModal) return;
    const { approvalId, newStatus, isJORequest: isJO, isDTS: isDTSRecord, recordId } = statusConfirmModal;
    const trackingId = (isJO || isDTSRecord) ? recordId! : approvalId;
    setUpdatingStatus(trackingId);
    setStatusConfirmModal(null);
    try {
      const endpoint = isJO
        ? `/forms/job-order-request/${recordId}/status`
        : isDTSRecord
        ? `/forms/daily-time-sheet/${recordId}/status`
        : `/approvals/${approvalId}`;
      const response = await apiClient.patch(endpoint, { status: newStatus });
      if (response.data.success) {
        toast.success("Status updated successfully");
        loadRecords();
      } else {
        toast.error(response.data.message || "Failed to update status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
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
    // Helper to safely check and return a value
    const checkValue = (val: any): string | null => {
      if (val === null || val === undefined) return null;
      const strVal = String(val).trim();
      return strVal !== '' ? strVal : null;
    };

    // Check top-level job_order field first
    const topLevel = checkValue(record.job_order);
    if (topLevel) return topLevel;

    // Check for various job order field names used by different forms in data object
    const data = record.data;
    const shopField = checkValue(data?.shop_field_jo_number);
    if (shopField) return shopField;

    const joNumber = checkValue(data?.jo_number);
    if (joNumber) return joNumber;

    const jobOrderNo = checkValue(data?.job_order_no);
    if (jobOrderNo) return jobOrderNo;

    const jobNumber = checkValue(data?.job_number);
    if (jobNumber) return jobNumber;

    const jobOrder = checkValue(data?.job_order);
    if (jobOrder) return jobOrder;

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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
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
                        {canChangeJOStatus ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={record.data?.status || "Pending"}
                              onChange={(e) => handleJOStatusChangeRequest(record, e.target.value)}
                              disabled={updatingStatus === record.id}
                              className={`appearance-none text-xs font-semibold rounded-full border pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusSelectClass(record.data?.status || "Pending")}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
                          </div>
                        ) : canChangeDTSStatus ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={record.data?.status || "Pending"}
                              onChange={(e) => handleDTSStatusChangeRequest(record, e.target.value)}
                              disabled={updatingStatus === record.id}
                              className={`appearance-none text-xs font-semibold rounded-full border pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusSelectClass(record.data?.status || "Pending")}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
                          </div>
                        ) : canChangeStatus && record.approval?.approval_id ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={record.approval?.approval_status || "Pending"}
                              onChange={(e) => handleStatusChangeRequest(record, e.target.value)}
                              disabled={updatingStatus === record.approval.approval_id}
                              className={`appearance-none text-xs font-semibold rounded-full border pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusSelectClass(record.approval?.approval_status || "Pending")}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
                          </div>
                        ) : (
                          <ApprovalStatusBadge status={(isJORequest || isDTS) ? record.data?.status : (record.approval?.approval_status ?? record.data?.approval_status)} />
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
                          {canWritePermission("form_records") && ((isJORequest || isDTS) ? record.data?.status !== "Close" : (record.approval?.approval_status !== "Close" && record.approval?.approval_status !== "Cancelled")) && (
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
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                    {canChangeJOStatus ? (
                      <div className="relative inline-flex items-center">
                        <select
                          value={record.data?.status || "Pending"}
                          onChange={(e) => handleJOStatusChangeRequest(record, e.target.value)}
                          disabled={updatingStatus === record.id}
                          className={`appearance-none text-xs font-semibold rounded-full border pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusSelectClass(record.data?.status || "Pending")}`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
                      </div>
                    ) : canChangeDTSStatus ? (
                      <div className="relative inline-flex items-center">
                        <select
                          value={record.data?.status || "Pending"}
                          onChange={(e) => handleDTSStatusChangeRequest(record, e.target.value)}
                          disabled={updatingStatus === record.id}
                          className={`appearance-none text-xs font-semibold rounded-full border pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusSelectClass(record.data?.status || "Pending")}`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
                      </div>
                    ) : canChangeStatus && record.approval?.approval_id ? (
                      <div className="relative inline-flex items-center">
                        <select
                          value={record.approval?.approval_status || "Pending"}
                          onChange={(e) => handleStatusChangeRequest(record, e.target.value)}
                          disabled={updatingStatus === record.approval.approval_id}
                          className={`appearance-none text-xs font-semibold rounded-full border pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusSelectClass(record.approval?.approval_status || "Pending")}`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
                      </div>
                    ) : (
                      <ApprovalStatusBadge status={(isJORequest || isDTS) ? record.data?.status : (record.approval?.approval_status ?? record.data?.approval_status)} />
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
                        {canWritePermission("form_records") && ((isJORequest || isDTS) ? record.data?.status !== "Close" : (record.data?.approval_status !== "Close" && record.data?.approval_status !== "Cancelled")) && (
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

      {/* Status Change Confirmation Modal */}
      {statusConfirmModal && (
        <ConfirmationModal
          isOpen={!!statusConfirmModal}
          title="Change Status"
          message={`Are you sure you want to change the status of "${statusConfirmModal.jobOrder}" to "${statusConfirmModal.newStatus}"?`}
          onConfirm={handleStatusChangeConfirm}
          onClose={() => setStatusConfirmModal(null)}
          confirmText="Update Status"
          type="warning"
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

    </div>
  );
}
