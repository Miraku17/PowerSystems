"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowPathIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { StatCardSkeleton } from "@/components/Skeletons";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import Link from "next/link";
import { getPendingSubmissions } from "@/lib/offlineDb";
import { usePendingCount } from "@/stores/syncStore";

interface FormCounts {
  "job-order-request": number;
  "daily-time-sheet": number;
  "deutz-service": number;
  "deutz-commissioning": number;
  "submersible-pump-commissioning": number;
  "submersible-pump-service": number;
  "submersible-pump-teardown": number;
  "electric-surface-pump-commissioning": number;
  "electric-surface-pump-service": number;
  "engine-surface-pump-service": number;
  "engine-surface-pump-commissioning": number;
  "engine-teardown": number;
  "electric-surface-pump-teardown": number;
  "engine-inspection-receiving": number;
  "components-teardown-measuring": number;
}

interface PendingApprovals {
  jobOrders: number;
  timesheets: number;
}

const formTypeConfig: Record<
  keyof FormCounts,
  { name: string; category: string }
> = {
  "job-order-request": { name: "Job Order Requests", category: "Orders" },
  "daily-time-sheet": { name: "Daily Time Sheets", category: "Time Tracking" },
  "deutz-commissioning": {
    name: "Deutz Commissioning",
    category: "Commissioning",
  },
  "deutz-service": { name: "Deutz Service", category: "Service" },
  "submersible-pump-commissioning": {
    name: "Submersible Pump Commissioning",
    category: "Commissioning",
  },
  "submersible-pump-service": {
    name: "Submersible Pump Service",
    category: "Service",
  },
  "submersible-pump-teardown": {
    name: "Submersible Pump Teardown",
    category: "Teardown",
  },
  "electric-surface-pump-commissioning": {
    name: "Electric Surface Pump Commissioning",
    category: "Commissioning",
  },
  "electric-surface-pump-service": {
    name: "Electric Surface Pump Service",
    category: "Service",
  },
  "engine-surface-pump-service": {
    name: "Engine Surface Pump Service",
    category: "Service",
  },
  "engine-surface-pump-commissioning": {
    name: "Engine Surface Pump Commissioning",
    category: "Commissioning",
  },
  "engine-teardown": { name: "Engine Teardown", category: "Teardown" },
  "electric-surface-pump-teardown": {
    name: "Electric Surface Pump Teardown",
    category: "Teardown",
  },
  "engine-inspection-receiving": {
    name: "Engine Inspection/Receiving",
    category: "Inspection",
  },
  "components-teardown-measuring": {
    name: "Components Teardown/Measuring",
    category: "Analysis",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Orders: "#2B4C7E",
  "Time Tracking": "#4A6FA5",
  Commissioning: "#1A2F4F",
  Service: "#607D8B",
  Teardown: "#D32F2F",
  Inspection: "#455A64",
  Analysis: "#4A6FA5",
};

const CATEGORY_BG_CLASSES: Record<string, string> = {
  Orders: "bg-[#2B4C7E]",
  "Time Tracking": "bg-[#4A6FA5]",
  Commissioning: "bg-[#1A2F4F]",
  Service: "bg-[#607D8B]",
  Teardown: "bg-[#D32F2F]",
  Inspection: "bg-[#455A64]",
  Analysis: "bg-[#4A6FA5]",
};

export default function OverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [formCounts, setFormCounts] = useState<FormCounts | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovals>({
    jobOrders: 0,
    timesheets: 0,
  });
  const [offlineForms, setOfflineForms] = useState(0);
  const pendingCount = usePendingCount();

  useEffect(() => {
    loadDashboardData();
  }, [pendingCount]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const countsResponse = await apiClient.get("/forms/counts");
      setFormCounts(countsResponse.data.counts);

      try {
        const [joResponse, dtsResponse] = await Promise.all([
          apiClient.get("/forms/job-order-request/pending"),
          apiClient.get("/forms/daily-time-sheet/pending"),
        ]);
        setPendingApprovals({
          jobOrders: joResponse.data.data?.length || 0,
          timesheets: dtsResponse.data.data?.length || 0,
        });
      } catch (err) {
        console.error("Error fetching pending approvals:", err);
      }

      try {
        const pendingSubmissions = await getPendingSubmissions();
        setOfflineForms(pendingSubmissions.length);
      } catch (err) {
        console.error("Error fetching offline forms:", err);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const totalForms = formCounts
    ? Object.values(formCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const categoryTotals = formCounts
    ? Object.entries(formCounts).reduce(
        (acc, [key, count]) => {
          const category = formTypeConfig[key as keyof FormCounts].category;
          acc[category] = (acc[category] || 0) + count;
          return acc;
        },
        {} as Record<string, number>,
      )
    : {};

  const chartData = useMemo(
    () =>
      Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
          name,
          value,
          color: CATEGORY_COLORS[name] || "#94a3b8",
        })),
    [categoryTotals],
  );

  const pieData = useMemo(
    () =>
      Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
          name,
          value,
          fill: CATEGORY_COLORS[name] || "#94a3b8",
        })),
    [categoryTotals],
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A2F4F]">Overview</h1>
          <p className="text-sm text-[#607D8B] mt-1">
            Form submissions and pending approvals
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[#4A6FA5] hover:text-[#1A2F4F] bg-white border border-slate-200 rounded-lg hover:border-[#4A6FA5]/30 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Link
              href="/dashboard/records/folders"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#4A6FA5]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#2B4C7E]/8 rounded-lg">
                  <DocumentTextIcon className="h-5 w-5 text-[#2B4C7E]" />
                </div>
              </div>
              <p className="text-sm font-medium text-[#607D8B]">Total Forms</p>
              <p className="text-3xl font-semibold text-[#1A2F4F] mt-1 tabular-nums">
                {totalForms}
              </p>
              <p className="text-xs text-slate-400 mt-2 group-hover:text-[#2B4C7E] transition-colors">
                View all records &rarr;
              </p>
            </Link>

            <Link
              href="/dashboard/pending-forms"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#4A6FA5]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-500/8 rounded-lg">
                  <CloudArrowUpIcon className="h-5 w-5 text-amber-600" />
                </div>
                {offlineForms > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                    {offlineForms}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[#607D8B]">
                Pending Offline
              </p>
              <p className="text-3xl font-semibold text-[#1A2F4F] mt-1 tabular-nums">
                {offlineForms}
              </p>
              <p className="text-xs text-slate-400 mt-2 group-hover:text-[#2B4C7E] transition-colors">
                Sync forms &rarr;
              </p>
            </Link>

            <Link
              href="/dashboard/pending-jo-requests"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#4A6FA5]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#4A6FA5]/8 rounded-lg">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 text-[#4A6FA5]" />
                </div>
                {pendingApprovals.jobOrders > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-semibold bg-[#2B4C7E]/10 text-[#2B4C7E] rounded-full">
                    {pendingApprovals.jobOrders}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[#607D8B]">Pending JO</p>
              <p className="text-3xl font-semibold text-[#1A2F4F] mt-1 tabular-nums">
                {pendingApprovals.jobOrders}
              </p>
              <p className="text-xs text-slate-400 mt-2 group-hover:text-[#2B4C7E] transition-colors">
                Review requests &rarr;
              </p>
            </Link>

            <Link
              href="/dashboard/pending-dts"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#4A6FA5]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#455A64]/8 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-[#455A64]" />
                </div>
                {pendingApprovals.timesheets > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-semibold bg-[#455A64]/10 text-[#455A64] rounded-full">
                    {pendingApprovals.timesheets}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[#607D8B]">Pending DTS</p>
              <p className="text-3xl font-semibold text-[#1A2F4F] mt-1 tabular-nums">
                {pendingApprovals.timesheets}
              </p>
              <p className="text-xs text-slate-400 mt-2 group-hover:text-[#2B4C7E] transition-colors">
                Review timesheets &rarr;
              </p>
            </Link>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1A2F4F] uppercase tracking-wide mb-4">
            Submissions by Category
          </h2>
          {isLoading ? (
            <div className="h-[240px] bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#607D8B" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#607D8B" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                    cursor={{ fill: "rgba(43,76,126,0.04)" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Donut Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1A2F4F] uppercase tracking-wide mb-4">
            Category Distribution
          </h2>
          {isLoading ? (
            <div className="h-[240px] bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-center gap-4 h-[240px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {pieData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="text-[#455A64] truncate text-xs">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-[#1A2F4F] font-medium tabular-nums ml-2 text-xs">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-[#1A2F4F] uppercase tracking-wide">
            All Forms
          </h2>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="text-left text-xs font-medium text-[#607D8B] uppercase tracking-wider px-5 py-3">
                    Form Name
                  </th>
                  <th className="text-left text-xs font-medium text-[#607D8B] uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-right text-xs font-medium text-[#607D8B] uppercase tracking-wider px-5 py-3">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formCounts &&
                  Object.entries(formCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([formType, count]) => {
                      const config =
                        formTypeConfig[formType as keyof FormCounts];
                      return (
                        <tr
                          key={formType}
                          className="group hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <Link
                              href={`/dashboard/records/folders/${formType}`}
                              className="text-sm font-medium text-[#1A2F4F] group-hover:text-[#2B4C7E] transition-colors"
                            >
                              {config.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#607D8B]">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${CATEGORY_BG_CLASSES[config.category] || "bg-slate-400"}`}
                              />
                              {config.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="text-sm font-semibold text-[#1A2F4F] tabular-nums">
                              {count}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
