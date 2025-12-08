"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Engines from "@/components/Engines";
import Pumps from "@/components/Pumps";

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>(() => {
    return searchParams.get("tab") || "engines";
  });

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

  // Set active tab from URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl) {
      setActiveTab(String(tabFromUrl));
    } else {
      setActiveTab("engines");
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Products</h1>

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
          {/* Engines Tab */}
          <button
            onClick={() => {
              setActiveTab("engines");
              router.push("/dashboard/products?tab=engines");
            }}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "engines"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Engines
          </button>

          {/* Pumps Tab */}
          <button
            onClick={() => {
              setActiveTab("pumps");
              router.push("/dashboard/products?tab=pumps");
            }}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "pumps"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Pumps
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "engines" ? (
        <Engines withFilterOptions={true} />
      ) : activeTab === "pumps" ? (
        <Pumps withFilterOptions={true} />
      ) : null}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
