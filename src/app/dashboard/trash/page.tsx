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
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Deleted Records
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View and restore soft-deleted form records.
            </p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm text-gray-600">
          Total Deleted:{" "}
          <span className="font-bold text-red-600">{records.length}</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Job Order, Customer, Form Type, or Deleted By..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Form Type Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <select
                value={formTypeFilter}
                onChange={(e) => setFormTypeFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {FORM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrashIcon className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No deleted records</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm || formTypeFilter
                ? "No records match your filters."
                : "There are no soft-deleted records to restore."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Form Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Job Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Deleted At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Deleted By
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={`${record.formType}-${record.id}`}
                      className="hover:bg-red-50/20 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {record.formName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.jobOrder}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          {new Date(record.deletedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.deletedByName}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setRecordToRestore(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Restore Record"
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

            {/* Mobile Cards */}
            <div className="md:hidden bg-gray-50/50 p-4 space-y-4">
              {paginatedRecords.map((record) => (
                <div
                  key={`${record.formType}-${record.id}`}
                  className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {record.formName}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Job Order
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {record.jobOrder}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Customer
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-1">
                        {record.customer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Deleted At
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(record.deletedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Deleted By
                      </p>
                      <p className="text-sm text-gray-600">{record.deletedByName}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setRecordToRestore(record)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Restore Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium">{startIndex + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(startIndex + recordsPerPage, filteredRecords.length)}
              </span>{" "}
              of <span className="font-medium">{filteredRecords.length}</span> results
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-50 transition-colors"
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
          message={`Are you sure you want to restore the record "${recordToRestore.jobOrder}" (${recordToRestore.formName})? It will be visible again to all users.`}
          onConfirm={handleRestore}
          onClose={() => setRecordToRestore(null)}
          confirmText={isRestoring ? "Restoring..." : "Restore"}
          type="warning"
        />
      )}
    </div>
  );
}
