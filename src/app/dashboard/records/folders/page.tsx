"use client";

import { useRouter } from "next/navigation";
import { FolderIcon, FolderOpenIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export default function RecordsFoldersPage() {
  const router = useRouter();

  const formTemplates = [
    {
      id: "job-order-request",
      name: "Job Order Requests",
      formType: "job-order-request",
      description: "Job order requests for service, repairs, and equipment maintenance.",
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

  const handleFolderClick = (template: { formType: string }) => {
    const normalizedFormType = template.formType.toLowerCase();
    router.push(`/dashboard/records/folders/${normalizedFormType}`);
  };

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

      {/* Folders View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {formTemplates.map((template, index) => (
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
                {/* Optional Badge or Status could go here */}
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
        ))}
      </div>
    </div>
  );
}
