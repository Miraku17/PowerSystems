"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useMutation } from "@tanstack/react-query";
import { reportService, ReportParams } from "@/services/reports";
import toast from "react-hot-toast";
import {
  DocumentChartBarIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  CogIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

type ReportType = "generated" | "status" | "wip" | "cancelled" | "engine" | "manhour";

const REPORT_TYPES: {
  value: ReportType;
  label: string;
  description: string;
  icon: typeof DocumentChartBarIcon;
}[] = [
  {
    value: "generated",
    label: "JOB Orders Generated",
    description: "List of all job orders created within a date range",
    icon: DocumentChartBarIcon,
  },
  {
    value: "status",
    label: "JOB Order Status",
    description: "Job orders with cost breakdown and status details",
    icon: ClipboardDocumentListIcon,
  },
  {
    value: "wip",
    label: "Work In Process",
    description: "All open/unclosed job orders as of a specific date",
    icon: WrenchScrewdriverIcon,
  },
  {
    value: "cancelled",
    label: "Cancelled Job Orders",
    description: "Job orders that were cancelled within a date range",
    icon: XCircleIcon,
  },
  {
    value: "engine",
    label: "Engine Report",
    description: "Job order history filtered by engine model or serial number",
    icon: CogIcon,
  },
  {
    value: "manhour",
    label: "Manhour Utilization",
    description: "Employee utilization based on DTS hours vs available hours",
    icon: ClockIcon,
  },
];

const STATUS_OPTIONS = ["Pending", "In-Progress", "Close", "Cancelled"];

export default function ReportsPage() {
  useAuth();
  const { canAccess, isLoading: permissionsLoading } = usePermissions();

  const [reportType, setReportType] = useState<ReportType>("generated");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "Pending",
    "In-Progress",
    "Close",
    "Cancelled",
  ]);
  const [engineModel, setEngineModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const isEngineReport = reportType === "engine";
  const isManhourReport = reportType === "manhour";
  const showStatusFilter = reportType === "generated";
  const showStartDate = reportType !== "wip" && !isEngineReport;

  const downloadMutation = useMutation({
    mutationFn: (params: ReportParams) => reportService.downloadReport(params),
    onSuccess: () => {
      toast.success("Report downloaded successfully");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to generate report";
      toast.error(message);
    },
  });

  const handleDownload = () => {
    if (isEngineReport) {
      if (!engineModel.trim() && !serialNumber.trim()) {
        toast.error("Please enter an engine model or serial number");
        return;
      }
      const params: ReportParams = {
        reportType: "engine",
        engineModel: engineModel.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
      };
      downloadMutation.mutate(params);
      return;
    }

    // Validation for date-based reports
    if (showStartDate && !startDate) {
      toast.error("Please select a start date");
      return;
    }
    if (!endDate) {
      toast.error(reportType === "wip" ? "Please select an 'As of' date" : "Please select an end date");
      return;
    }
    if (showStartDate && startDate > endDate) {
      toast.error("Start date must be before or equal to end date");
      return;
    }
    if (showStatusFilter && selectedStatuses.length === 0) {
      toast.error("Please select at least one status");
      return;
    }

    const params: ReportParams = {
      reportType,
      endDate,
    };
    if (showStartDate) params.startDate = startDate;
    if (showStatusFilter) params.status = selectedStatuses;

    downloadMutation.mutate(params);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#083459]"></div>
      </div>
    );
  }

  if (!canAccess("reports")) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-2">
            You do not have permission to access reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
            <DocumentChartBarIcon className="h-7 w-7 text-[#2B4C7E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A2F4F] tracking-tight">
              Reports
            </h1>
            <p className="text-sm text-[#607D8B] mt-0.5">
              Generate and download data insights from Job Orders
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection Sidebar/Top - Report Types */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slideUp">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-[#1A2F4F] uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#2B4C7E] rounded-full"></span>
                Select Report Type
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {REPORT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = reportType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setReportType(type.value)}
                      className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left group ${
                        isSelected
                          ? "border-[#2B4C7E] bg-[#2B4C7E]/5 ring-4 ring-[#2B4C7E]/5"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? "bg-[#2B4C7E] text-white" : "bg-slate-100 text-slate-400 group-hover:text-slate-500"
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <span className={`block text-sm font-bold ${
                          isSelected ? "text-[#1A2F4F]" : "text-slate-700"
                        }`}>
                          {type.label}
                        </span>
                        <span className="block text-xs text-[#607D8B] leading-relaxed">
                          {type.description}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#2B4C7E] shadow-[0_0_0_4px_rgba(43,76,126,0.1)]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slideUp [animation-delay:100ms]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-[#1A2F4F] uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#2B4C7E] rounded-full"></span>
                Configuration
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {isEngineReport ? (
                /* Engine Report Filters */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1A2F4F] uppercase tracking-wider mb-2">
                      Engine Model
                    </label>
                    <input
                      type="text"
                      value={engineModel}
                      onChange={(e) => setEngineModel(e.target.value)}
                      placeholder="e.g. C15, QSK60..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A2F4F] uppercase tracking-wider mb-2">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. BXS00456..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] outline-none transition-all"
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-[#607D8B] leading-normal font-medium">
                      Enter at least one field above to generate the report.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Date Range */}
                  <div className="space-y-4">
                    {showStartDate && (
                      <div>
                        <label className="block text-xs font-bold text-[#1A2F4F] uppercase tracking-wider mb-2">
                          Start Date
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] outline-none transition-all appearance-none"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-[#1A2F4F] uppercase tracking-wider mb-2">
                        {reportType === "wip" ? "As of Date" : "End Date"}
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] outline-none transition-all appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status Filter */}
                  {showStatusFilter && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-[#1A2F4F] uppercase tracking-wider">
                        Include Statuses
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((status) => {
                          const isChecked = selectedStatuses.includes(status);
                          return (
                            <button
                              key={status}
                              onClick={() => toggleStatus(status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                isChecked
                                  ? "bg-[#2B4C7E] text-white border-[#2B4C7E] shadow-sm shadow-[#2B4C7E]/20"
                                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Download Action */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleDownload}
                  disabled={downloadMutation.isPending}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#2B4C7E] text-white rounded-xl font-bold text-sm hover:bg-[#1A2F4F] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2B4C7E]/10 active:scale-[0.98]"
                >
                  {downloadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      Generating CSV...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      Download Report
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                  Files will be downloaded in .CSV format
                </p>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-[#1A2F4F] rounded-2xl p-5 text-white shadow-xl shadow-[#1A2F4F]/10 animate-slideUp [animation-delay:200ms]">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <DocumentChartBarIcon className="h-5 w-5 text-blue-200" />
              </div>
              <h3 className="font-bold text-sm">Pro Tip</h3>
            </div>
            <p className="text-xs text-blue-100/80 leading-relaxed font-medium">
              Reports are generated in real-time based on the most recent form submissions. Use specific date ranges for faster downloads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
