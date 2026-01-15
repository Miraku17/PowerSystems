"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderIcon } from "@heroicons/react/24/outline";

export default function RecordsFoldersPage() {
  const router = useRouter();
  const [comingSoonModal, setComingSoonModal] = useState<string | null>(null);

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
      id: "grindex-service",
      name: "Grindex Service",
      formType: "grindex-service",
    },
    {
      id: "weda-service",
      name: "WEDA Service Report",
      formType: "weda-service",
      comingSoon: true,
    },
    {
      id: "weda-commissioning",
      name: "WEDA Commissioning Report",
      formType: "weda-commissioning",
      comingSoon: true,
    },
    {
      id: "grindex-commissioning",
      name: "Grindex Commissioning Report",
      formType: "grindex-commissioning",
      comingSoon: true,
    },
    {
      id: "electric-pump-commissioning",
      name: "Electric Driven Pump Commissioning Report",
      formType: "electric-pump-commissioning",
      comingSoon: true,
    },
    {
      id: "electric-pump-service",
      name: "Electric Driven Pump Service Report",
      formType: "electric-pump-service",
      comingSoon: true,
    },
    {
      id: "electric-pump-teardown",
      name: "Electric Driven Pump Teardown Report",
      formType: "electric-pump-teardown",
      comingSoon: true,
    },
    {
      id: "engine-pump-commissioning",
      name: "Engine Driven Pump Commissioning Report",
      formType: "engine-pump-commissioning",
      comingSoon: true,
    },
    {
      id: "engine-pump-service",
      name: "Engine Driven Pump Service Report",
      formType: "engine-pump-service",
      comingSoon: true,
    },
    {
      id: "inspection-report",
      name: "Inspection Report",
      formType: "inspection-report",
      comingSoon: true,
    },
    {
      id: "technical-report",
      name: "Technical Report",
      formType: "technical-report",
      comingSoon: true,
    },
  ];

  const handleFolderClick = (template: { formType: string; comingSoon?: boolean; name: string }) => {
    if (template.comingSoon) {
      setComingSoonModal(template.name);
      return;
    }
    // Normalize form type to lowercase for URL
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
              {!template.comingSoon && (
                <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full group-hover:bg-blue-50 group-hover:text-[#2B4C7E] transition-colors">
                  {template.formType}
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#2B4C7E] transition-colors line-clamp-1">
              {template.name}
            </h3>
            <p className="text-sm text-gray-500">
              {template.comingSoon ? "Coming soon" : "View records"} &rarr;
            </p>

            {template.comingSoon && (
              <div className="absolute top-3 right-3">
                <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Coming Soon Modal */}
      {comingSoonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md mx-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-500 mb-6">
              The <span className="font-semibold text-gray-700">{comingSoonModal}</span> records are currently under development and will be available shortly.
            </p>
            <button
              onClick={() => setComingSoonModal(null)}
              className="px-6 py-2.5 bg-[#2B4C7E] text-white rounded-lg font-medium hover:bg-[#1a3a5c] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
