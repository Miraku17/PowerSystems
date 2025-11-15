"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  ChevronLeftIcon
} from "@heroicons/react/24/outline";
import { formRecordService, companyFormService } from "@/services";
import { CompanyForm } from "@/types";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { TableSkeleton, CardSkeleton } from "@/components/Skeletons";

interface FormRecord {
  id: string;
  companyFormId: number;
  job_order?: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  companyForm: {
    id: string;
    name: string;
    formType: string;
  };
}

export default function RecordsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [formTemplates, setFormTemplates] = useState<CompanyForm[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CompanyForm | null>(null);
  const [records, setRecords] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<FormRecord | null>(null);

  // Fetch form templates on mount
  useEffect(() => {
    loadFormTemplates();
  }, []);

  // Handle URL query parameter for folder ID
  useEffect(() => {
    const folderId = searchParams.get('id');

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

    const template = formTemplates.find(t => String(t.id) === String(folderId));

    if (template) {
      if (!selectedTemplate || String(selectedTemplate.id) !== String(template.id)) {
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
      const templatesData = response.data?.data || response.data;
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
      const response = await apiClient.get(`/forms?companyFormId=${templateId}`);
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
      const response = await apiClient.get(`/pdf/service-report/${recordId}`, {
        responseType: 'blob',
      });

      // Create a blob from the PDF Stream
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);

      // Open the PDF in a new window
      window.open(fileURL);

      toast.success("PDF generated successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to generate PDF");
    }
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
    return 'N/A';
  };

  // Filter records by search term
  const filteredRecords = records.filter((record) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const allFields = getAllFieldsFlat(record.data);
    return Object.values(allFields).some((value) =>
      String(value).toLowerCase().includes(searchLower)
    );
  });

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
            Total Records: <span className="font-semibold">{records.length}</span>
          </div>
        )}
      </div>

      {/* Folders View */}
      {!selectedTemplate && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
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
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search in all fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Order
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getJobOrder(record)}
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
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
          ></div>

          {/* Modal content */}
          <div className="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setSelectedRecord(null)}>
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
                2nd Floor TOPY's Place #3 Calle Industria cor. Economia Street,
                Bagumbayan, Libis, Quezon City
              </p>
              <p className="text-xs text-gray-600 mb-1">
                Tel: (+63-2) 687-9275 to 78 | Fax: (+63-2) 687-9279
              </p>
              <p className="text-xs text-gray-600 mb-2">
                Email: sales@psi-deutz.com
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA •
                ILO-ILO • SURIGAO
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
                {Object.entries(selectedRecord.data).map(([sectionName, sectionData]) => {
                  const sectionLabel = sectionName.replace(/([A-Z])/g, " $1").trim();
                  return (
                    <div key={sectionName}>
                      <h3
                        className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2"
                        style={{ color: "#2B4C7E" }}
                      >
                        {sectionLabel.charAt(0).toUpperCase() + sectionLabel.slice(1)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {typeof sectionData === "object" &&
                          sectionData !== null &&
                          Object.entries(sectionData).map(([fieldName, fieldValue]) => {
                            const fieldLabel = fieldName.replace(/([A-Z])/g, " $1").trim();
                            const isTextarea = String(fieldValue || "").length > 100;
                            return (
                              <div
                                key={fieldName}
                                className={isTextarea ? "md:col-span-2" : ""}
                              >
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                  {fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1)}
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
                          })}
                      </div>
                    </div>
                  );
                })}
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
    </div>
  );
}
