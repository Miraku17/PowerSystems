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
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { TableSkeleton } from "@/components/Skeletons";
import ViewDeutzCommissioning from "@/components/ViewDeutzCommissioning";
import ViewDeutzService from "@/components/ViewDeutzService";
import ViewGrindexService from "@/components/ViewGrindexService";
import ViewWedaService from "@/components/ViewWedaService";
import EditDeutzCommissioning from "@/components/EditDeutzCommissioning";
import EditDeutzService from "@/components/EditDeutzService";
import EditGrindexService from "@/components/EditGrindexService";
import EditWedaService from "@/components/EditWedaService";
import ConfirmationModal from "@/components/ConfirmationModal";

interface FormRecord {
  id: string;
  companyFormId: number;
  job_order?: string;
  data: Record<string, any>;
  dateCreated: string;
  dateUpdated: string;
  created_by?: string;
  companyForm: {
    id: string;
    name: string;
    formType: string;
  };
}

export default function FormRecordsPage() {
  const router = useRouter();
  const params = useParams();
  const formType = params.formType as string;

  const [records, setRecords] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<FormRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<FormRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FormRecord | null>(null);

  // Date range filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Get permission check functions from auth store
  const canEditRecord = useAuthStore((state) => state.canEditRecord);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Form type to endpoint mapping (case-insensitive)
  const formTypeEndpoints: Record<string, { endpoint: string; name: string }> = {
    "deutz-commissioning": { endpoint: "/forms/deutz-commissioning", name: "Deutz Commissioning Report" },
    "deutz-service": { endpoint: "/forms/deutz-service", name: "Deutz Service Report" },
    "grindex-service": { endpoint: "/forms/grindex-service", name: "Grindex Service Form" },
    "weda-service": { endpoint: "/forms/weda-service", name: "WEDA Service Report" },
    "commission": { endpoint: "/forms/deutz-commissioning", name: "Deutz Commissioning Report" },
    "commissioning": { endpoint: "/forms/deutz-commissioning", name: "Deutz Commissioning Report" },
    "service": { endpoint: "/forms/deutz-service", name: "Deutz Service Report" },
  };

  // Normalize form type to lowercase
  const normalizedFormType = formType?.toLowerCase();

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
        "deutz-commissioning": "deutz-commissioning",
        "commission": "deutz-commissioning",
        "commissioning": "deutz-commissioning",
        "deutz-service": "deutz-service",
        "service": "deutz-service",
        "grindex-service": "grindex-service",
        "weda-service": "weda-service",
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
    return "N/A";
  };

  const getCustomer = (record: FormRecord): string => {
    const data = record.data;
    return data?.customer_name || data?.basicInformation?.customer || data?.basicInformation?.customerName || "N/A";
  };

  const getSerialNo = (record: FormRecord): string => {
    const data = record.data;
    return data?.engine_serial_no || data?.pump_serial_no || data?.engineInformation?.engineSerialNo || data?.engineInformation?.serialNo || "N/A";
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Serial No.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Created</th>
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
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canEditRecord(record.created_by) && (
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
                          {isAdmin() && (
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
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Serial No.</p>
                      <p className="text-sm text-gray-600 font-mono">{getSerialNo(record)}</p>
                    </div>
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
                        {canEditRecord(record.created_by) && (
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
                        {isAdmin() && (
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

      {selectedRecord && normalizedFormType === "grindex-service" && (
        <ViewGrindexService
          data={selectedRecord.data}
          onClose={() => setSelectedRecord(null)}
          onExportPDF={() => handleExportPDF(selectedRecord.id)}
        />
      )}

      {selectedRecord && normalizedFormType === "weda-service" && (
        <ViewWedaService
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

      {editingRecord && normalizedFormType === "grindex-service" && (
        <EditGrindexService
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}

      {editingRecord && normalizedFormType === "weda-service" && (
        <EditWedaService
          data={editingRecord.data}
          recordId={editingRecord.id}
          onClose={() => setEditingRecord(null)}
          onSaved={loadRecords}
        />
      )}
    </div>
  );
}
