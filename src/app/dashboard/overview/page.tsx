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
        const joData = joResponse.data.data || [];
        const pendingJoCount = joData.filter((jo: any) => jo.status === "Pending" || jo.status === "In-Progress").length;
        setPendingApprovals({
          jobOrders: pendingJoCount,
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
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-8 animate-fadeIn">
      {/* Header / Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
            <DocumentTextIcon className="h-7 w-7 text-[#2B4C7E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A2F4F] tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-sm text-[#607D8B] mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#2B4C7E] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-[#2B4C7E]/30 transition-all shadow-sm disabled:opacity-50 active:scale-95"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh Data
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#2B4C7E] hover:shadow-xl hover:shadow-[#2B4C7E]/5 transition-all group relative overflow-hidden animate-slideUp"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#2B4C7E]/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110 duration-500" />
              <div className="relative">
                <div className="p-2.5 bg-[#2B4C7E]/10 text-[#2B4C7E] rounded-xl w-fit mb-4 group-hover:bg-[#2B4C7E] group-hover:text-white transition-colors duration-300">
                  <DocumentTextIcon className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-[#607D8B] uppercase tracking-wider">Total Form Records</p>
                <p className="text-3xl font-black text-[#1A2F4F] mt-1 tabular-nums">
                  {totalForms}
                </p>
                <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-[#2B4C7E] uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Explore Library</span>
                  <span className="text-lg leading-none">&rarr;</span>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/pending-forms"
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 transition-all group relative overflow-hidden animate-slideUp [animation-delay:50ms]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110 duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                    <CloudArrowUpIcon className="h-6 w-6" />
                  </div>
                  {offlineForms > 0 && (
                    <span className="flex h-6 min-w-[24px] items-center justify-center px-1.5 text-[10px] font-black bg-amber-100 text-amber-700 rounded-full animate-pulse border border-amber-200">
                      {offlineForms}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-[#607D8B] uppercase tracking-wider">Pending Offline</p>
                <p className="text-3xl font-black text-[#1A2F4F] mt-1 tabular-nums">
                  {offlineForms}
                </p>
                <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-amber-600 uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Sync Records</span>
                  <span className="text-lg leading-none">&rarr;</span>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/pending-jo-requests"
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#4A6FA5] hover:shadow-xl hover:shadow-[#4A6FA5]/5 transition-all group relative overflow-hidden animate-slideUp [animation-delay:100ms]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4A6FA5]/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110 duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-[#4A6FA5]/10 text-[#4A6FA5] rounded-xl group-hover:bg-[#4A6FA5] group-hover:text-white transition-colors duration-300">
                    <ClipboardDocumentCheckIcon className="h-6 w-6" />
                  </div>
                  {pendingApprovals.jobOrders > 0 && (
                    <span className="flex h-6 min-w-[24px] items-center justify-center px-1.5 text-[10px] font-black bg-[#2B4C7E]/10 text-[#2B4C7E] rounded-full border border-[#2B4C7E]/10">
                      {pendingApprovals.jobOrders}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-[#607D8B] uppercase tracking-wider">Pending JO Approval</p>
                <p className="text-3xl font-black text-[#1A2F4F] mt-1 tabular-nums">
                  {pendingApprovals.jobOrders}
                </p>
                <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-[#4A6FA5] uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Review Requests</span>
                  <span className="text-lg leading-none">&rarr;</span>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/pending-dts"
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#455A64] hover:shadow-xl hover:shadow-[#455A64]/5 transition-all group relative overflow-hidden animate-slideUp [animation-delay:150ms]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#455A64]/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110 duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-[#455A64]/10 text-[#455A64] rounded-xl group-hover:bg-[#455A64] group-hover:text-white transition-colors duration-300">
                    <ClockIcon className="h-6 w-6" />
                  </div>
                  {pendingApprovals.timesheets > 0 && (
                    <span className="flex h-6 min-w-[24px] items-center justify-center px-1.5 text-[10px] font-black bg-[#455A64]/10 text-[#455A64] rounded-full border border-[#455A64]/10">
                      {pendingApprovals.timesheets}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-[#607D8B] uppercase tracking-wider">Pending Time Sheets</p>
                <p className="text-3xl font-black text-[#1A2F4F] mt-1 tabular-nums">
                  {pendingApprovals.timesheets}
                </p>
                <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-[#455A64] uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Review DTS</span>
                  <span className="text-lg leading-none">&rarr;</span>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-slideUp [animation-delay:200ms]">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-[#1A2F4F] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#2B4C7E] rounded-full"></span>
              Submission Trends
            </h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="h-[300px] bg-slate-50 rounded-xl animate-pulse" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 20, left: -10 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#607D8B", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#607D8B", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 12,
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        padding: "12px",
                      }}
                      cursor={{ fill: "rgba(43,76,126,0.04)" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-slideUp [animation-delay:250ms]">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-[#1A2F4F] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#2B4C7E] rounded-full"></span>
              Distribution by Category
            </h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="h-[300px] bg-slate-50 rounded-xl animate-pulse" />
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-8 h-full sm:h-[300px]">
                <div className="w-full sm:w-1/2 h-[200px] sm:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 12,
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-3 custom-scrollbar overflow-y-auto max-h-[240px] pr-2">
                  {pieData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span className="text-[#455A64] truncate text-xs font-bold">
                          {entry.name}
                        </span>
                      </div>
                      <span className="text-[#1A2F4F] font-black tabular-nums text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-slideUp [animation-delay:300ms]">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1A2F4F] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#2B4C7E] rounded-full"></span>
            Inventory of Digital Forms
          </h2>
          <Link href="/dashboard/records/folders" className="text-[10px] font-black text-[#2B4C7E] uppercase tracking-tighter hover:underline">
            Manage Folders &rarr;
          </Link>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="text-xs font-bold text-[#607D8B] uppercase tracking-wider px-6 py-4">
                    Form Category & Name
                  </th>
                  <th className="text-xs font-bold text-[#607D8B] uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Group Classification
                  </th>
                  <th className="text-right text-xs font-bold text-[#607D8B] uppercase tracking-wider px-6 py-4">
                    Total Submissions
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
                          className="group hover:bg-slate-50/80 transition-all"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/dashboard/records/folders/${formType}`}
                              className="text-sm font-bold text-[#1A2F4F] group-hover:text-[#2B4C7E] transition-colors block"
                            >
                              {config.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-[#607D8B] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${CATEGORY_BG_CLASSES[config.category] || "bg-slate-400"}`}
                              />
                              {config.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-[#1A2F4F] tabular-nums bg-blue-50/50 px-3 py-1 rounded-lg border border-blue-100/30 group-hover:bg-[#2B4C7E] group-hover:text-white transition-all">
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
