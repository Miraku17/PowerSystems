"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CompanyForm } from "@/types";
import CompanyForms from "@/components/CompanyForms";
import FormInstances from "@/components/FormInstances";
import { companyFormService } from "@/services";
import toast from "react-hot-toast";

function FormsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [forms, setForms] = useState<CompanyForm[]>([]);
  const [activeTab, setActiveTab] = useState<string>("create");
  const [isLoading, setIsLoading] = useState(true);

  // Add style to hide scrollbar
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .nav-tabs-scroll::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Load forms on mount
  useEffect(() => {
    loadForms();
  }, []);

  // Set active tab from URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl) {
      setActiveTab(String(tabFromUrl));
    } else {
      setActiveTab("create");
    }
  }, [searchParams]);

  const loadForms = async () => {
    try {
      const response = await companyFormService.getAll();
      const formsData = response.data || [];
      setForms(Array.isArray(formsData) ? formsData : []);
    } catch (error) {
      toast.error("Failed to load forms");
      console.error("Error loading forms:", error);
      setForms([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Company Forms</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex space-x-8 overflow-x-auto nav-tabs-scroll"
          aria-label="Tabs"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Create Form Tab */}
          <button
            onClick={() => {
              setActiveTab("create");
              router.push("/dashboard/forms");
            }}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "create"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Form Templates
          </button>

          {/* Form Tabs (by form ID) */}
          {isLoading ? (
            // Skeleton loaders for form tabs
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="whitespace-nowrap py-4 px-1 animate-pulse"
                >
                  <div className="h-5 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </>
          ) : (
            forms.map((form) => {
              const isTabActive = String(activeTab) === String(form.id);

              return (
                <button
                  key={form.id}
                  onClick={() => {
                    setActiveTab(String(form.id));
                    router.push(`/dashboard/forms?tab=${form.id}`);
                  }}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isTabActive
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {form.name}
                </button>
              );
            })
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "create" ? (
        <CompanyForms forms={forms} setForms={setForms} />
      ) : (
        <div className="space-y-4">
          <FormInstances formId={activeTab} forms={forms} />
        </div>
      )}
    </div>
  );
}

export default function FormsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <FormsPageContent />
    </Suspense>
  );
}
