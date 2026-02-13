"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Company } from "@/types";
import Companies from "@/components/Companies";
import Engines from "@/components/Engines";
import { companyService } from "@/services";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";

function CompaniesPageContent() {
  const { canRead, isLoading: permissionsLoading } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
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

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Set active tab from URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl) {
      setActiveTab(String(tabFromUrl));
    } else {
      setActiveTab("all");
    }
  }, [searchParams]);

  const loadCompanies = async () => {
    try {
      const response = await companyService.getAll();
      const companiesData = response.data || [];
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      toast.error("Failed to load companies");
      console.error("Error loading companies:", error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (permissionsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!canRead("company")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view companies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Companies</h1>

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
          {/* All Tab */}
          <button
            onClick={() => {
              setActiveTab("all");
              router.push("/dashboard/companies");
            }}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Companies
          </button>

          {/* Company Tabs */}
          {isLoading ? (
            // Skeleton loaders for company tabs
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
            companies.map((company) => {
              // Convert both to strings for comparison
              const isTabActive = String(activeTab) === String(company.id);

              return (
                <button
                  key={company.id}
                  onClick={() => {
                    setActiveTab(String(company.id));
                    router.push(`/dashboard/companies?tab=${company.id}`);
                  }}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isTabActive
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {company.name}
                </button>
              );
            })
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "all" ? (
        <Companies companies={companies} setCompanies={setCompanies} />
      ) : (
        <div className="space-y-4">
          <Engines companyId={activeTab} withFilterOptions={false} />
        </div>
      )}
    </div>
  );
}


export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <CompaniesPageContent />
    </Suspense>
  );
}
