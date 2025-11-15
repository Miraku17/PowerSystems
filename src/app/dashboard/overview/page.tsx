"use client";

import { useState, useEffect } from "react";
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CogIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { StatCardSkeleton } from "@/components/Skeletons";

export default function OverviewPage() {
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  useEffect(() => {
    setIsOverviewLoading(true);
    setTimeout(() => setIsOverviewLoading(false), 1000);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isOverviewLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <UsersIcon className="h-10 w-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <CogIcon className="h-10 w-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Companies</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <BuildingOfficeIcon className="h-10 w-10 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Forms</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <DocumentTextIcon className="h-10 w-10 text-red-500" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Welcome to Power Systems Inc Admin Dashboard
        </h2>
        <p className="text-gray-600">
          Manage your customers, products, companies, and custom forms from
          this centralized dashboard. Select a menu item from the sidebar to
          get started.
        </p>
      </div>
    </div>
  );
}
