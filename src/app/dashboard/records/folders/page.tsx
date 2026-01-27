"use client";

import { useRouter } from "next/navigation";
import { FolderIcon } from "@heroicons/react/24/outline";

export default function RecordsFoldersPage() {
  const router = useRouter();

  const formTemplates = [
    {
      id: "deutz-commissioning",
      name: "Deutz Commissioning",
      formType: "deutz-commissioning",
    },
    {
      id: "deutz-service",
      name: "Deutz Service",
      formType: "deutz-service",
    },
    {
      id: "submersible-pump-commissioning",
      name: "Submersible Pump Commissioning",
      formType: "submersible-pump-commissioning",
    },
  ];

  const handleFolderClick = (template: { formType: string }) => {
    const normalizedFormType = template.formType.toLowerCase();
    router.push(`/dashboard/records/folders/${normalizedFormType}`);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Form Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Select a form template to view its records.
          </p>
        </div>
      </div>

      {/* Folders View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {formTemplates.map((template, index) => (
          <div
            key={template.id}
            onClick={() => handleFolderClick(template)}
            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />

            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 text-[#2B4C7E] rounded-xl group-hover:bg-[#2B4C7E] group-hover:text-white transition-colors shadow-sm">
                <FolderIcon className="h-8 w-8" />
              </div>
              <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full group-hover:bg-blue-50 group-hover:text-[#2B4C7E] transition-colors">
                {template.formType}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#2B4C7E] transition-colors line-clamp-1">
              {template.name}
            </h3>
            <p className="text-sm text-gray-500">
              View records &rarr;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
