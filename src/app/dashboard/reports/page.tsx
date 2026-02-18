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
} from "@heroicons/react/24/outline";

type ReportType = "generated" | "status" | "wip" | "cancelled" | "engine";

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate and download CSV reports from Job Order Request Forms
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Select Report Type
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {REPORT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = reportType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? "border-[#083459] bg-[#083459]/5 ring-1 ring-[#083459]/20"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`h-6 w-6 mb-2 ${
                    isSelected ? "text-[#083459]" : "text-gray-400"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    isSelected ? "text-[#083459]" : "text-gray-700"
                  }`}
                >
                  {type.label}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {type.description}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#083459]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Filters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEngineReport ? (
            /* Engine Report Filters */
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-medium text-gray-700">
                Engine / Equipment Search
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Engine Model
                  </label>
                  <input
                    type="text"
                    value={engineModel}
                    onChange={(e) => setEngineModel(e.target.value)}
                    placeholder="e.g. C15, QSK60..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#083459]/20 focus:border-[#083459] outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. BXS00456..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#083459]/20 focus:border-[#083459] outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Enter at least one field. Results will include all matching job orders.
              </p>
            </div>
          ) : (
            <>
              {/* Date Range */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {reportType === "wip" ? "As of Date" : "Date Range"}
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  {showStartDate && (
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#083459]/20 focus:border-[#083459] outline-none"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      {reportType === "wip" ? "As of Date" : "End Date"}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#083459]/20 focus:border-[#083459] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              {showStatusFilter && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((status) => {
                      const isChecked = selectedStatuses.includes(status);
                      return (
                        <button
                          key={status}
                          onClick={() => toggleStatus(status)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            isChecked
                              ? "bg-[#083459] text-white border-[#083459]"
                              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
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
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          disabled={downloadMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#083459] text-white rounded-lg font-medium text-sm hover:bg-[#0a4170] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {downloadMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              Generating...
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download CSV
            </>
          )}
        </button>
      </div>
    </div>
  );
}
