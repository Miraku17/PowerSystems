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
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
            <FolderIcon className="h-7 w-7 text-[#2B4C7E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A2F4F] tracking-tight">
              Form Records
            </h1>
            <p className="text-sm text-[#607D8B] mt-0.5">
              Access and manage digital records for all equipment categories
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slideUp">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-[400px] group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 group-focus-within:text-[#2B4C7E] transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search by category name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-[#607D8B]">
              <span className="uppercase tracking-wider">Total Categories:</span>
              <span className="text-[#2B4C7E] bg-blue-50 px-2 py-0.5 rounded-md">{filteredTemplates.length}</span>
            </div>
          </div>
        </div>

        {/* Folders View */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                  <FolderIcon className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-[#1A2F4F]">No categories found</h3>
                <p className="text-[#607D8B] mt-2 max-w-sm mx-auto">
                  We couldn't find any form categories matching "{searchTerm}".
                </p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-6 px-6 py-2.5 bg-[#2B4C7E] text-white rounded-xl text-sm font-medium hover:bg-[#1A2F4F] shadow-sm transition-all"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredTemplates.map((template, index) => (
                <div
                  key={template.id}
                  onClick={() => handleFolderClick(template)}
                  className="group relative bg-white rounded-2xl p-6 border border-slate-100 hover:border-[#2B4C7E] shadow-sm hover:shadow-xl hover:shadow-[#2B4C7E]/5 transition-all duration-300 cursor-pointer overflow-hidden animate-slideUp"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Hover Accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#2B4C7E]/5 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-125 duration-500" />
                  
                  <div className="relative flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className="p-3.5 bg-slate-50 text-[#2B4C7E] rounded-2xl group-hover:bg-[#2B4C7E] group-hover:text-white transition-all duration-300 shadow-sm border border-slate-100">
                        <div className="relative w-6 h-6">
                          <FolderIcon className="absolute inset-0 w-full h-full transition-all duration-300 group-hover:opacity-0 group-hover:scale-75" />
                          <FolderOpenIcon className="absolute inset-0 w-full h-full transition-all duration-300 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100" />
                        </div>
                      </div>
                      
                      {/* Record Count Badge */}
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Records</span>
                        <div className="px-3 py-1 bg-blue-50 text-[#2B4C7E] rounded-lg text-sm font-bold group-hover:bg-[#2B4C7E] group-hover:text-white transition-colors border border-blue-100/50">
                          {isLoadingCounts ? (
                            <div className="w-4 h-4 border-2 border-[#2B4C7E]/30 border-t-[#2B4C7E] rounded-full animate-spin" />
                          ) : (
                            <span>{recordCounts[template.formType] ?? 0}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#1A2F4F] mb-2 group-hover:text-[#2B4C7E] transition-colors leading-tight">
                        {template.name}
                      </h3>
                      <p className="text-xs text-[#607D8B] leading-relaxed mb-6 line-clamp-2 font-medium">
                        {template.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-[#2B4C7E] group-hover:text-[#1A2F4F] transition-colors pt-4 border-t border-slate-50">
                      <span className="uppercase tracking-wider">Explore Records</span>
                      <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-[#2B4C7E] group-hover:text-white transition-all transform group-hover:translate-x-1">
                        <ChevronRightIcon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
