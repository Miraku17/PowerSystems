"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FolderIcon, FolderOpenIcon, ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import apiClient from "@/lib/axios";

export default function RecordsFoldersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const formTemplates = [
    {
      id: "job-order-request",
      name: "Job Order Requests",
      formType: "job-order-request",
      description: "Job order requests for service, repairs, and equipment maintenance.",
    },
    {
      id: "daily-time-sheet",
      name: "Daily Time Sheets",
      formType: "daily-time-sheet",
      description: "Daily time sheets tracking manhours and job descriptions.",
    },
    {
      id: "deutz-service",
      name: "Deutz Service",
      formType: "deutz-service",
      description: "Service maintenance and repair logs for Deutz systems.",
    },
    {
      id: "deutz-commissioning",
      name: "Deutz Commissioning",
      formType: "deutz-commissioning",
      description: "Commissioning reports and records for Deutz engines.",
    },
    {
      id: "submersible-pump-commissioning",
      name: "Submersible Pump Commissioning",
      formType: "submersible-pump-commissioning",
      description: "Commissioning documentation for submersible pumps.",
    },
    {
      id: "submersible-pump-service",
      name: "Submersible Pump Service",
      formType: "submersible-pump-service",
      description: "Service and maintenance reports for submersible pumps.",
    },
    {
      id: "submersible-pump-teardown",
      name: "Submersible Pump Teardown",
      formType: "submersible-pump-teardown",
      description: "Teardown reports and analysis for submersible pumps.",
    },
    {
      id: "electric-surface-pump-commissioning",
      name: "Electric Surface Pump Commissioning",
      formType: "electric-surface-pump-commissioning",
      description: "Commissioning documentation for electric driven surface pumps.",
    },
    {
      id: "electric-surface-pump-service",
      name: "Electric Surface Pump Service",
      formType: "electric-surface-pump-service",
      description: "Service and maintenance reports for electric driven surface pumps.",
    },
    {
      id: "engine-surface-pump-service",
      name: "Engine Surface Pump Service",
      formType: "engine-surface-pump-service",
      description: "Service and maintenance reports for engine driven surface pumps.",
    },
    {
      id: "engine-surface-pump-commissioning",
      name: "Engine Surface Pump Commissioning",
      formType: "engine-surface-pump-commissioning",
      description: "Commissioning documentation for engine driven surface pumps.",
    },
    {
      id: "engine-teardown",
      name: "Engine Teardown Report",
      formType: "engine-teardown",
      description: "Comprehensive engine teardown inspection and component analysis reports.",
    },
    {
      id: "electric-surface-pump-teardown",
      name: "Electric Surface Pump Teardown",
      formType: "electric-surface-pump-teardown",
      description: "Teardown reports and analysis for electric driven surface pumps.",
    },
    {
      id: "engine-inspection-receiving",
      name: "Engine Inspection / Receiving",
      formType: "engine-inspection-receiving",
      description: "Engine inspection and receiving reports with detailed inspection checklists.",
    },
    {
      id: "components-teardown-measuring",
      name: "Components Teardown Measuring",
      formType: "components-teardown-measuring",
      description: "Comprehensive component measurement reports for teardown analysis and quality control.",
    },
  ];

  // Fetch record counts using TanStack Query
  const { data: recordCounts = {}, isLoading: isLoadingCounts } = useQuery({
    queryKey: ["formRecordCounts"],
    queryFn: async () => {
      const response = await apiClient.get("/forms/counts");
      return response.data?.counts || {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleFolderClick = (template: { formType: string }) => {
    const normalizedFormType = template.formType.toLowerCase();
    router.push(`/dashboard/records/folders/${normalizedFormType}`);
  };

  // Filter templates based on search term
  const filteredTemplates = formTemplates.filter((template) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.description.toLowerCase().includes(searchLower) ||
      template.formType.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-fadeIn p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2B4C7E] tracking-tight">Form Records</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-2xl">
            Access and manage digital records for various equipment and service types. Select a category below to view detailed logs.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Folders View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No folders found matching "{searchTerm}"</p>
          </div>
        ) : (
          filteredTemplates.map((template, index) => (
          <div
            key={template.id}
            onClick={() => handleFolderClick(template)}
            className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#4A6FA5]/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(43,76,126,0.12)] transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#2B4C7E]/5 to-[#4A6FA5]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
            
            <div className="relative flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div className="relative p-3.5 bg-[#F5F5F0] text-[#2B4C7E] rounded-xl group-hover:bg-[#2B4C7E] group-hover:text-white transition-colors duration-300 shadow-sm ring-1 ring-[#2B4C7E]/5 overflow-hidden">
                   {/* Icon Container with Stacked Icons */}
                   <div className="relative w-7 h-7">
                      <FolderIcon className="absolute inset-0 w-full h-full transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:scale-75" />
                      <FolderOpenIcon className="absolute inset-0 w-full h-full transition-all duration-300 ease-in-out opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100" />
                   </div>
                </div>
                {/* Record Count Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2B4C7E]/5 text-[#2B4C7E] rounded-lg text-sm font-semibold group-hover:bg-[#2B4C7E]/10 transition-colors">
                  <span className="text-xs text-gray-500 font-normal">Records:</span>
                  {isLoadingCounts ? (
                    <div className="flex items-center">
                      <svg className="animate-spin h-4 w-4 text-[#2B4C7E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <span>{recordCounts[template.formType] ?? 0}</span>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#2B4C7E] transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6 line-clamp-2">
                  {template.description}
                </p>
              </div>

              <div className="flex items-center text-sm font-semibold text-[#4A6FA5] group-hover:text-[#2B4C7E] transition-colors mt-auto pt-4 border-t border-gray-50">
                <span>Access Records</span>
                <ChevronRightIcon className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}
