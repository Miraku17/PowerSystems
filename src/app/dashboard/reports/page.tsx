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
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// Per the new spec (item 14): replace the previous 6 report types with five
// status-bound JO reports + an Engine Report sourced from Deutz Service
// Reports. The "Include Statuses" checkbox group is removed — each report's
// status is implicit in its own type.
type ReportType =
  | "pending-jo"
  | "work-in-progress"
  | "cancelled-jo"
  | "closed-jo"
  | "engine";

const REPORT_TYPES: {
  value: ReportType;
  label: string;
  description: string;
  icon: typeof DocumentChartBarIcon;
}[] = [
  {
    value: "pending-jo",
    label: "Pending Job Orders",
    description: "Job orders awaiting both Credit & Collection and Department Head approval",
    icon: ClipboardDocumentListIcon,
  },
  {
    value: "work-in-progress",
    label: "Work In Progress",
    description: "Job orders currently in service (both approvals received)",
    icon: WrenchScrewdriverIcon,
  },
  {
    value: "cancelled-jo",
    label: "Cancelled Job Orders",
    description: "Job orders that were cancelled by an admin",
    icon: XCircleIcon,
  },
  {
    value: "closed-jo",
    label: "Closed Job Orders",
    description: "Job orders that have been closed by an admin, with cost breakdown",
    icon: CheckCircleIcon,
  },
  {
    value: "engine",
    label: "Engine Report",
    description: "Service history pulled from Deutz Service Reports, optionally filtered by engine model or serial number",
    icon: CogIcon,
  },
];

export default function ReportsPage() {
  useAuth();
  const { canAccess, isLoading: permissionsLoading } = usePermissions();

  const [reportType, setReportType] = useState<ReportType>("pending-jo");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [engineModel, setEngineModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const isEngineReport = reportType === "engine";

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
      // Engine Report supports an optional engine-model / serial-number
      // filter and an optional date range. At least one filter must be set
      // to avoid generating an unbounded dump.
      const hasFilter = engineModel.trim() || serialNumber.trim() || (startDate && endDate);
      if (!hasFilter) {
        toast.error("Enter an engine model, serial number, or a date range");
        return;
      }
      const params: ReportParams = {
        reportType: "engine",
        engineModel: engineModel.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      downloadMutation.mutate(params);
      return;
    }

    // JO-status reports all require start + end date.
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }
    if (!endDate) {
      toast.error("Please select an end date");
      return;
    }
    if (startDate > endDate) {
      toast.error("Start date must be before or equal to end date");
      return;
    }

    const params: ReportParams = {
      reportType,
      startDate,
      endDate,
    };

    downloadMutation.mutate(params);
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
              {isEngineReport && (
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
                </div>
              )}

              {/* Date Range — required for all JO reports; optional for Engine. */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A2F4F] uppercase tracking-wider mb-2">
                    Start Date{isEngineReport && (
                      <span className="ml-2 text-[10px] font-medium text-slate-400 normal-case">(optional)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] outline-none transition-all appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1A2F4F] uppercase tracking-wider mb-2">
                    End Date{isEngineReport && (
                      <span className="ml-2 text-[10px] font-medium text-slate-400 normal-case">(optional)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] outline-none transition-all appearance-none"
                  />
                </div>
              </div>

              {isEngineReport && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-[#607D8B] leading-normal font-medium">
                    Enter at least one filter — engine model, serial number, or date range.
                  </p>
                </div>
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
