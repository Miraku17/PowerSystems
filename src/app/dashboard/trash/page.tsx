"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { TableSkeleton } from "@/components/Skeletons";
import ConfirmationModal from "@/components/ConfirmationModal";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

interface DeletedRecord {
  id: string;
  formType: string;
  formName: string;
  jobOrder: string;
  customer: string;
  createdAt: string;
  deletedAt: string;
  deletedByName: string;
}

const FORM_TYPE_OPTIONS = [
  { value: "", label: "All Form Types" },
  { value: "job-order-request", label: "Job Order Request" },
  { value: "daily-time-sheet", label: "Daily Time Sheet" },
  { value: "deutz-commissioning", label: "Deutz Commissioning Report" },
  { value: "deutz-service", label: "Deutz Service Report" },
  { value: "engine-inspection-receiving", label: "Engine Inspection / Receiving Report" },
  { value: "submersible-pump-commissioning", label: "Submersible Pump Commissioning Report" },
  { value: "submersible-pump-service", label: "Submersible Pump Service Report" },
  { value: "submersible-pump-teardown", label: "Submersible Pump Teardown Report" },
  { value: "electric-surface-pump-commissioning", label: "Electric Surface Pump Commissioning Report" },
  { value: "electric-surface-pump-service", label: "Electric Surface Pump Service Report" },
  { value: "electric-surface-pump-teardown", label: "Electric Surface Pump Teardown Report" },
  { value: "engine-surface-pump-commissioning", label: "Engine Surface Pump Commissioning Report" },
  { value: "engine-surface-pump-service", label: "Engine Surface Pump Service Report" },
  { value: "engine-teardown", label: "Engine Teardown Report" },
  { value: "components-teardown-measuring", label: "Components Teardown Measuring Report" },
];

export default function TrashPage() {
  const router = useRouter();
  const { hasPermission, isLoading: permLoading } = usePermissions();

  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formTypeFilter, setFormTypeFilter] = useState("");
  const [recordToRestore, setRecordToRestore] = useState<DeletedRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  const canRestore = !permLoading && hasPermission("form_records", "restore");

  // Redirect if no permission
  useEffect(() => {
    if (!permLoading && !canRestore) {
      router.push("/dashboard/overview");
    }
  }, [permLoading, canRestore, router]);

  const loadRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = formTypeFilter ? `?formType=${formTypeFilter}` : "";
      const response = await apiClient.get(`/forms/trash${params}`);
      setRecords(response.data?.data || []);
    } catch (error) {
      console.error("Error loading deleted records:", error);
      toast.error("Failed to load deleted records");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [formTypeFilter]);

  useEffect(() => {
    if (canRestore) {
      loadRecords();
    }
  }, [canRestore, loadRecords]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, formTypeFilter]);

  const handleRestore = async () => {
    if (!recordToRestore) return;
    setIsRestoring(true);
    const loadingToast = toast.loading("Restoring record...");
    try {
      await apiClient.patch("/forms/restore", {
        formType: recordToRestore.formType,
        id: recordToRestore.id,
      });
      toast.success("Record restored successfully!", { id: loadingToast });
      setRecordToRestore(null);
      loadRecords();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to restore record",
        { id: loadingToast }
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      record.jobOrder.toLowerCase().includes(term) ||
      record.customer.toLowerCase().includes(term) ||
      record.formName.toLowerCase().includes(term) ||
      record.deletedByName.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);

  if (permLoading) {
    return (
      <div className="p-8">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (!canRestore) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
            <TrashIcon className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A2F4F] tracking-tight">
              Deleted Records
            </h1>
            <p className="text-sm text-[#607D8B] mt-0.5">
              Manage and restore soft-deleted form records
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-sm">
          <span className="text-[#607D8B]">Total Deleted:</span>
          <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
            {records.length}
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slideUp">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 group-focus-within:text-[#2B4C7E] transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search by Job Order, Customer, or Deleted By..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] transition-all outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  value={formTypeFilter}
                  onChange={(e) => setFormTypeFilter(e.target.value)}
                  className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-4 focus:ring-[#2B4C7E]/5 focus:border-[#2B4C7E] transition-all outline-none appearance-none min-w-[220px]"
                >
                  {FORM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {(searchTerm || formTypeFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFormTypeFilter("");
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-red-100"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
              <TrashIcon className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-[#1A2F4F]">No deleted records found</h3>
            <p className="text-[#607D8B] mt-2 max-w-sm mx-auto">
              {searchTerm || formTypeFilter
                ? "We couldn't find any deleted records matching your current filters."
                : "Your trash is empty. Any records you delete will appear here for recovery."}
            </p>
            {(searchTerm || formTypeFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFormTypeFilter("");
                }}
                className="mt-6 px-6 py-2.5 bg-[#2B4C7E] text-white rounded-xl text-sm font-medium hover:bg-[#1A2F4F] shadow-sm transition-all"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#607D8B] uppercase tracking-wider">
                      Form Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#607D8B] uppercase tracking-wider">
                      Reference Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#607D8B] uppercase tracking-wider">
                      Deletion Info
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#607D8B] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={`${record.formType}-${record.id}`}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center self-start px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#2B4C7E]/10 text-[#2B4C7E] border border-[#2B4C7E]/10">
                            {record.formName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                            ID: {String(record.id).split("-")[0]}...
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#1A2F4F]">
                            {record.jobOrder}
                          </span>
                          <span className="text-xs text-[#607D8B] line-clamp-1">
                            {record.customer}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-[#607D8B]">
                            <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(record.deletedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
                              {record.deletedByName.charAt(0)}
                            </div>
                            {record.deletedByName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => setRecordToRestore(record)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm active:scale-95"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedRecords.map((record) => (
                <div
                  key={`${record.formType}-${record.id}`}
                  className="p-5 bg-white space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#2B4C7E]/10 text-[#2B4C7E] border border-[#2B4C7E]/10">
                      {record.formName}
                    </span>
                    <button
                      onClick={() => setRecordToRestore(record)}
                      className="p-2 text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-[#1A2F4F]">{record.jobOrder}</h4>
                      <p className="text-xs text-[#607D8B] mt-0.5">{record.customer}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs py-3 border-y border-slate-50">
                      <div className="space-y-1">
                        <p className="text-slate-400 font-medium uppercase tracking-tighter text-[10px]">Deleted By</p>
                        <p className="text-slate-700 font-semibold">{record.deletedByName}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-slate-400 font-medium uppercase tracking-tighter text-[10px]">Deleted At</p>
                        <p className="text-slate-700">
                          {new Date(record.deletedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setRecordToRestore(record)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl active:bg-emerald-600 active:text-white transition-all"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Restore this record
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-medium text-[#607D8B]">
              Showing <span className="text-[#1A2F4F] font-bold">{startIndex + 1}</span> to{" "}
              <span className="text-[#1A2F4F] font-bold">
                {Math.min(startIndex + recordsPerPage, filteredRecords.length)}
              </span>{" "}
              of <span className="text-[#1A2F4F] font-bold">{filteredRecords.length}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-[#1A2F4F] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm"
              >
                Previous
              </button>
              <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl">
                <span className="text-sm font-bold text-[#1A2F4F]">{currentPage}</span>
                <span className="mx-2 text-slate-300 text-xs">/</span>
                <span className="text-sm font-medium text-slate-400">{totalPages}</span>
              </div>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-[#1A2F4F] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {recordToRestore && (
        <ConfirmationModal
          isOpen={!!recordToRestore}
          title="Restore Record"
          message={`Are you sure you want to restore the record "${recordToRestore.jobOrder}" (${recordToRestore.formName})? It will be moved back to the active records and will be visible to all authorized users.`}
          onConfirm={handleRestore}
          onClose={() => setRecordToRestore(null)}
          confirmText={isRestoring ? "Restoring..." : "Restore Record"}
          type="info"
        />
      )}
    </div>
  );
}
