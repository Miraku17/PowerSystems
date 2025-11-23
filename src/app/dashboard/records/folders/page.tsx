"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  ChevronLeftIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formRecordService, companyFormService } from "@/services";
import { CompanyForm } from "@/types";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { TableSkeleton, CardSkeleton } from "@/components/Skeletons";
import ConfirmationModal from "@/components/ConfirmationModal";

interface FormRecord {
  id: string;
  companyFormId: number;
  job_order?: string;
  data: Record<string, any>;
  dateCreated: string;
  dateUpdated: string;
  companyForm: {
    id: string;
    name: string;
    formType: string;
  };
}

function RecordsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [formTemplates, setFormTemplates] = useState<CompanyForm[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CompanyForm | null>(
    null
  );
  const [records, setRecords] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<FormRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<FormRecord | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editJobOrder, setEditJobOrder] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Date range filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Fetch form templates on mount
  useEffect(() => {
    loadFormTemplates();
  }, []);

  // Handle URL query parameter for folder ID
  useEffect(() => {
    const folderId = searchParams.get("id");

    if (!folderId) {
      // No ID in URL, show folders view
      if (selectedTemplate) {
        setSelectedTemplate(null);
        setRecords([]);
      }
      return;
    }

    // ID exists in URL
    if (formTemplates.length === 0) {
      // Templates not loaded yet, wait
      return;
    }

    const template = formTemplates.find(
      (t) => String(t.id) === String(folderId)
    );

    if (template) {
      if (
        !selectedTemplate ||
        String(selectedTemplate.id) !== String(template.id)
      ) {
        // Template found and different from current, load it
        setSelectedTemplate(template);
        loadRecordsForTemplate(template.id);
      }
    }
  }, [searchParams, formTemplates.length]);

  const loadFormTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await companyFormService.getAll();
      const templatesData = response.data || [];
      const templates = Array.isArray(templatesData) ? templatesData : [];
      setFormTemplates(templates);
    } catch (error) {
      console.error("Error loading form templates:", error);
      toast.error("Failed to load form templates");
      setFormTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecordsForTemplate = async (templateId: string) => {
    try {
      setIsLoadingRecords(true);
      const response = await apiClient.get(
        `/forms?companyFormId=${templateId}`
      );
      const recordsData = response.data?.data || response.data;
      setRecords(Array.isArray(recordsData) ? recordsData : []);
    } catch (error) {
      console.error("Error loading records:", error);
      toast.error("Failed to load form records");
      setRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleFolderClick = (template: CompanyForm) => {
    // Update URL with query parameter
    router.push(`/dashboard/records/folders?id=${template.id}`);
  };

  const handleBackToFolders = () => {
    // Update URL to remove query parameter
    router.push("/dashboard/records/folders");
    setSearchTerm("");
  };

  const handleExportPDF = async (recordId: string) => {
    try {
      const loadingToast = toast.loading("Generating PDF...");
      const response = await apiClient.get(`/pdf/report/${recordId}`, {
        responseType: "blob",
      });

      // Create a blob from the PDF Stream
      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);

      // Open the PDF in a new window
      window.open(fileURL);

      toast.success("PDF generated successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleOpenEditModal = (record: FormRecord) => {
    setEditingRecord(record);
    setEditFormData(record.data);
    setEditJobOrder(record.job_order || "");
  };

  const handleCloseEditModal = () => {
    setEditingRecord(null);
    setEditFormData({});
    setEditJobOrder("");
  };

  const handleRequestSave = () => {
    setShowSaveConfirm(true);
  };

  const confirmSaveEdit = async () => {
    if (!editingRecord) return;

    setIsSaving(true);
    try {
      const loadingToast = toast.loading("Saving changes...");

      await formRecordService.update(editingRecord.id, {
        jobOrder: editJobOrder,
        companyFormId: editingRecord.companyFormId,
        data: editFormData,
      });

      toast.success("Form updated successfully!", { id: loadingToast });

      // Reload records
      if (selectedTemplate) {
        await loadRecordsForTemplate(selectedTemplate.id);
      }

      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating form:", error);
      toast.error("Failed to update form");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (
    sectionKey: string,
    fieldKey: string,
    value: any
  ) => {
    setEditFormData((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [fieldKey]: value,
      },
    }));
  };

  // Helper function to get all field values from nested data
  const getAllFieldsFlat = (data: Record<string, any>): Record<string, any> => {
    const flat: Record<string, any> = {};
    Object.values(data).forEach((section) => {
      if (typeof section === "object" && section !== null) {
        Object.assign(flat, section);
      }
    });
    return flat;
  };

  // Helper function to get job order from record
  const getJobOrder = (record: FormRecord): string => {
    // Check top-level job_order field first
    if (record.job_order) {
      return record.job_order;
    }
    return "N/A";
  };

  // Helper function to get customer name from record
  const getCustomer = (record: FormRecord): string => {
    // Check in basicInformation section for customer-related fields
    const basicInfo = record.data?.basicInformation;
    if (basicInfo) {
      // Try different possible customer field names
      return basicInfo.customer || basicInfo.customerName || basicInfo.name || "N/A";
    }
    return "N/A";
  };

  // Filter records by search term and date range
  const filteredRecords = records.filter((record) => {
    // Filter by job order or customer search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const jobOrder = getJobOrder(record);
      const customer = getCustomer(record);

      // Check if job order matches
      const jobOrderMatches = jobOrder !== "N/A" && jobOrder.toLowerCase().includes(searchLower);

      // Check if customer matches
      const customerMatches = customer !== "N/A" && customer.toLowerCase().includes(searchLower);

      // Return true if either matches
      if (!jobOrderMatches && !customerMatches) {
        return false;
      }
    }

    // Filter by date range
    if (startDate || endDate) {
      const recordDate = new Date(record.dateCreated);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) {
          return false;
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (recordDate > end) {
          return false;
        }
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {selectedTemplate && (
            <button
              onClick={handleBackToFolders}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              Back
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedTemplate ? selectedTemplate.name : "Form Records"}
          </h1>
        </div>
        {selectedTemplate && (
          <div className="text-sm text-gray-600">
            Total Records:{" "}
            <span className="font-semibold">{records.length}</span>
          </div>
        )}
      </div>

      {/* Folders View */}
      {!selectedTemplate && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-md p-6 animate-pulse"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-20 w-20 bg-gray-300 rounded"></div>
                    <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : formTemplates.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                No form templates available. Create form templates first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {formTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleFolderClick(template)}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <FolderIcon className="h-20 w-20 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {template.formType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Records Table View */}
      {selectedTemplate && (
        <>
          {/* Search and Filters */}
          <div className="bg-transparent rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Box */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Job Order or Customer
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Job Order or Customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="lg:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Date Range
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                      placeholder="Start Date"
                    />
                  </div>
                  <div className="flex items-center justify-center text-gray-400 hidden sm:block">
                    <span className="text-sm font-medium">to</span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                      placeholder="End Date"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="px-4 py-2.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || startDate || endDate) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Active Filters:
                  </span>
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Search: "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm("")}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  {startDate && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      From: {new Date(startDate).toLocaleDateString()}
                      <button
                        onClick={() => setStartDate("")}
                        className="hover:bg-green-200 rounded-full p-0.5"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  {endDate && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      To: {new Date(endDate).toLocaleDateString()}
                      <button
                        onClick={() => setEndDate("")}
                        className="hover:bg-green-200 rounded-full p-0.5"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 underline ml-2"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Records Table */}
          {isLoadingRecords ? (
            <TableSkeleton rows={5} />
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm
                  ? "No records found matching your search."
                  : "No records for this form template yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getJobOrder(record)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getCustomer(record)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(record.dateCreated).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <EyeIcon className="h-5 w-5 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(record)}
                              className="text-orange-600 hover:text-orange-900 inline-flex items-center"
                            >
                              <PencilIcon className="h-5 w-5 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleExportPDF(record.id)}
                              className="text-green-600 hover:text-green-900 inline-flex items-center"
                            >
                              <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
                              Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">{startIndex + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(endIndex, filteredRecords.length)}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {filteredRecords.length}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* View Modal */}
      {selectedRecord && (
        <>
          {/* Backdrop with blur */}
          <div
            onClick={() => setSelectedRecord(null)}
            className="fixed inset-0 z-40 overflow-hidden"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
            }}
          ></div>

          {/* Modal content */}
          <div
            className="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto"
            onClick={(e) =>
              e.target === e.currentTarget && setSelectedRecord(null)
            }
          >
            <div className="bg-white shadow-lg max-w-[900px] w-full my-8">
              {/* Close button */}
              <div className="flex justify-end p-4">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600 text-3xl font-bold leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Company Header */}
              <div className="text-center py-6 px-8 border-b-2 border-gray-300">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Power Systems, Incorporated
                </h1>
                <p className="text-xs text-gray-600 mb-1">
                  2nd Floor TOPY's Place #3 Calle Industria cor. Economia
                  Street, Bagumbayan, Libis, Quezon City
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  Tel: (+63-2) 687-9275 to 78 | Fax: (+63-2) 687-9279
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  Email: sales@psi-deutz.com
                </p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN •
                  ZAMBOANGA • ILO-ILO • SURIGAO
                </p>
              </div>

              {/* Form Title */}
              <div className="text-center py-4 bg-white">
                <h2
                  className="text-2xl font-bold uppercase tracking-wide"
                  style={{ color: "#2B4C7E" }}
                >
                  {selectedTemplate?.name || "Form Record"}
                </h2>
              </div>

              {/* Form Body */}
              <div className="px-8 py-6">
                <div className="space-y-8">
                  {Object.entries(selectedRecord.data).map(
                    ([sectionName, sectionData]) => {
                      const sectionLabel = sectionName
                        .replace(/([A-Z])/g, " $1")
                        .trim();
                      return (
                        <div key={sectionName}>
                          <h3
                            className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2"
                            style={{ color: "#2B4C7E" }}
                          >
                            {sectionLabel.charAt(0).toUpperCase() +
                              sectionLabel.slice(1)}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {typeof sectionData === "object" &&
                              sectionData !== null &&
                              Object.entries(sectionData).map(
                                ([fieldName, fieldValue]) => {
                                  const fieldLabel = fieldName
                                    .replace(/([A-Z])/g, " $1")
                                    .trim();
                                  const isTextarea =
                                    String(fieldValue || "").length > 100;
                                  return (
                                    <div
                                      key={fieldName}
                                      className={
                                        isTextarea ? "md:col-span-2" : ""
                                      }
                                    >
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        {fieldLabel.charAt(0).toUpperCase() +
                                          fieldLabel.slice(1)}
                                      </label>
                                      {isTextarea ? (
                                        <div className="w-full px-2 py-1.5 border-0 border-b-2 border-gray-300 bg-transparent text-gray-900 whitespace-pre-wrap">
                                          {String(fieldValue || "-")}
                                        </div>
                                      ) : (
                                        <div className="w-full px-2 py-1.5 border-0 border-b-2 border-gray-300 bg-transparent text-gray-900">
                                          {typeof fieldValue === "object"
                                            ? JSON.stringify(fieldValue)
                                            : String(fieldValue || "-")}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t-2 border-gray-300">
                  <button
                    onClick={() => handleExportPDF(selectedRecord.id)}
                    className="flex items-center space-x-2 px-8 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-colors shadow-md"
                    style={{ backgroundColor: "#2B4C7E" }}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingRecord && selectedTemplate && (
        <>
          {/* Backdrop with blur */}
          <div
            onClick={handleCloseEditModal}
            className="fixed inset-0 z-40 overflow-hidden"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
            }}
          ></div>

          {/* Modal content */}
          <div
            className="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto"
            onClick={(e) =>
              e.target === e.currentTarget && handleCloseEditModal()
            }
          >
            <div className="bg-white rounded-lg shadow-xl max-w-[900px] w-full my-8">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  Edit Form Record
                </h3>
                <button
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600 text-3xl font-bold leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Form Body */}
              <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                {/* Job Order - Read only */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Order
                  </label>
                  <div className="text-gray-900 font-medium">
                    {editJobOrder || "N/A"}
                  </div>
                </div>

                {/* Dynamic Form Sections */}
                <div className="space-y-6">
                  {Object.entries(editFormData).map(
                    ([sectionName, sectionData]) => {
                      const sectionLabel = sectionName
                        .replace(/([A-Z])/g, " $1")
                        .trim();
                      return (
                        <div
                          key={sectionName}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            {sectionLabel.charAt(0).toUpperCase() +
                              sectionLabel.slice(1)}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {typeof sectionData === "object" &&
                              sectionData !== null &&
                              Object.entries(sectionData).map(
                                ([fieldName, fieldValue]) => {
                                  const fieldLabel = fieldName
                                    .replace(/([A-Z])/g, " $1")
                                    .trim();
                                  const isTextarea =
                                    String(fieldValue || "").length > 100;
                                  return (
                                    <div
                                      key={fieldName}
                                      className={
                                        isTextarea ? "md:col-span-2" : ""
                                      }
                                    >
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {fieldLabel.charAt(0).toUpperCase() +
                                          fieldLabel.slice(1)}
                                      </label>
                                      {isTextarea ? (
                                        <textarea
                                          value={String(fieldValue || "")}
                                          onChange={(e) =>
                                            handleFieldChange(
                                              sectionName,
                                              fieldName,
                                              e.target.value
                                            )
                                          }
                                          rows={4}
                                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          value={
                                            typeof fieldValue === "object"
                                              ? JSON.stringify(fieldValue)
                                              : String(fieldValue || "")
                                          }
                                          onChange={(e) =>
                                            handleFieldChange(
                                              sectionName,
                                              fieldName,
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                      )}
                                    </div>
                                  );
                                }
                              )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleCloseEditModal}
                  disabled={isSaving}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestSave}
                  disabled={isSaving}
                  className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#2B4C7E" }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={confirmSaveEdit}
        title="Save Changes"
        message="Are you sure you want to save these changes to the form record?"
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <RecordsPageContent />
    </Suspense>
  );
}
