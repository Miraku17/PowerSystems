"use client";

import { useState, useEffect } from "react";
import {
  UsersIcon,
  BuildingOfficeIcon,
  CogIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { StatCardSkeleton } from "@/components/Skeletons";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  customerService,
  companyService,
  companyFormService,
  engineService,
  formRecordService,
} from "@/services";

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalCompanies: number;
  totalForms: number;
  totalRecords: number;
}

export default function OverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    totalCompanies: 0,
    totalForms: 0,
    totalRecords: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [formTypeData, setFormTypeData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch all data in parallel
      const [customersRes, companiesRes, formsRes, enginesRes, recordsRes] =
        await Promise.all([
          customerService.getAll().catch(() => ({ data: [] })),
          companyService.getAll().catch(() => ({ data: [] })),
          companyFormService.getAll().catch(() => ({ data: [] })),
          engineService.getAll().catch(() => ({ data: [] })),
          formRecordService.getAll().catch(() => ({ data: [] })),
        ]);

      const customers = Array.isArray(customersRes.data)
        ? customersRes.data
        : [];
      const companies = Array.isArray(companiesRes.data)
        ? companiesRes.data
        : [];
      const forms = Array.isArray(formsRes.data)
        ? formsRes.data
        : [];
      const engines = Array.isArray(enginesRes.data)
        ? enginesRes.data
        : [];
      const records = Array.isArray(recordsRes.data)
        ? recordsRes.data
        : [];

      setStats({
        totalCustomers: customers.length,
        totalProducts: engines.length,
        totalCompanies: companies.length,
        totalForms: forms.length,
        totalRecords: records.length,
      });

      // Generate monthly data for the last 6 months
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      const monthlyStats = months.map((month, index) => ({
        month,
        records: Math.floor(Math.random() * 20) + 5,
        customers: Math.floor(Math.random() * 15) + 3,
      }));
      setMonthlyData(monthlyStats);

      // Generate form type distribution
      const formTypes: Record<string, number> = {};
      forms.forEach((form: any) => {
        const type = form.formType || "Other";
        formTypes[type] = (formTypes[type] || 0) + 1;
      });

      const typeData = Object.entries(formTypes).map(([name, value]) => ({
        name,
        value,
      }));
      setFormTypeData(typeData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ["#2B4C7E", "#4A6FA5", "#3B82F6", "#60A5FA", "#93C5FD"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Customers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalCustomers}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalProducts}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CogIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Companies</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalCompanies}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Form Templates
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalForms}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <DocumentTextIcon className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Records</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalRecords}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Monthly Activity
          </h2>
          {isLoading ? (
            <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="records"
                  stroke="#2B4C7E"
                  strokeWidth={2}
                  name="Form Records"
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="New Customers"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Form Types Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Form Types Distribution
          </h2>
          {isLoading ? (
            <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
          ) : formTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No form templates available
            </div>
          )}
        </div>
      </div>

      {/* Statistics Bar Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          System Overview
        </h2>
        {isLoading ? (
          <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                {
                  name: "Customers",
                  count: stats.totalCustomers,
                  color: "#3B82F6",
                },
                {
                  name: "Products",
                  count: stats.totalProducts,
                  color: "#10B981",
                },
                {
                  name: "Companies",
                  count: stats.totalCompanies,
                  color: "#8B5CF6",
                },
                {
                  name: "Templates",
                  count: stats.totalForms,
                  color: "#EF4444",
                },
                {
                  name: "Records",
                  count: stats.totalRecords,
                  color: "#F59E0B",
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2B4C7E" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
